import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataStoreService } from '../data/data-store.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterProfessionalDto } from './dto/register-professional.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataStoreService: DataStoreService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.dataStoreService.validateUser(loginDto.email, loginDto.password);
    return this.buildTokens(user);
  }

  async register(registerDto: RegisterDto) {
    const user = await this.dataStoreService.createResident({
      condominiumId: registerDto.condominiumId,
      email: registerDto.email,
      name: registerDto.name,
      phone: registerDto.phone,
      password: registerDto.password,
      block: registerDto.block,
      unit: registerDto.unit,
    });
    if (!this.dataStoreService.requiresEmailVerification()) {
      const canAccess = !this.dataStoreService.requiresUserApproval() || user.approvalStatus === 'APPROVED';
      return {
        data: {
          email: user.email,
          emailVerificationRequired: false,
          requiresApproval: !canAccess,
          emailCodeSent: false,
          emailMessage: '',
          session: canAccess ? this.buildTokens(user).data : null,
        },
      };
    }
    let emailCodeSent = true;
    let emailMessage = '';
    try {
      await this.sendEmailCode(user.email);
    } catch (error) {
      // a conta já existe; abortar aqui deixaria o morador sem caminho para reenviar o código
      if (!this.isTransientEmailError(error)) throw error;
      emailCodeSent = false;
      emailMessage = error instanceof HttpException ? String(error.getResponse()) : '';
    }
    return {
      data: {
        email: user.email,
        emailVerificationRequired: true,
        requiresApproval: this.dataStoreService.requiresUserApproval(),
        emailCodeSent,
        emailMessage,
        session: null,
      },
    };
  }

  async registerProfessional(dto: RegisterProfessionalDto) {
    const result = await this.dataStoreService.createProfessionalAccount(dto);
    if (!this.dataStoreService.requiresEmailVerification()) {
      return {
        data: {
          email: result.user.email,
          emailVerificationRequired: false,
          requiresApproval: false,
          professionalId: result.professionalId,
          emailCodeSent: false,
          emailMessage: '',
          session: this.buildTokens(result.user).data,
        },
      };
    }
    let emailCodeSent = true;
    let emailMessage = '';
    try {
      await this.sendEmailCode(result.user.email);
    } catch (error) {
      // limite de envio ou instabilidade: mantém a conta para o profissional pedir o código de novo
      if (!this.isTransientEmailError(error)) {
        await this.dataStoreService.removeProfessionalAccount(result.user.id);
        throw error;
      }
      emailCodeSent = false;
      emailMessage = error instanceof HttpException ? String(error.getResponse()) : '';
    }
    return {
      data: {
        email: result.user.email,
        emailVerificationRequired: true,
        requiresApproval: false,
        professionalId: result.professionalId,
        emailCodeSent,
        emailMessage,
        session: null,
      },
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    await this.verifySupabaseCode(dto.email, dto.code);
    const user = await this.dataStoreService.verifyUserEmail(dto.email);
    const accessGranted = !this.dataStoreService.requiresUserApproval() || user.approvalStatus === 'APPROVED';
    return {
      data: {
        verified: true,
        accessGranted,
        requiresApproval: !accessGranted,
        session: accessGranted ? this.buildTokens(user).data : null,
      },
    };
  }

  async resendCode(email: string) {
    const user = this.dataStoreService.findUserByEmail(email);
    if (!user) throw new NotFoundException('Cadastro não encontrado para este e-mail.');
    if (user.emailVerified) throw new BadRequestException('Este e-mail já foi confirmado.');
    await this.sendEmailCode(user.email);
    return { data: { sent: true, email: user.email } };
  }

  refresh(refreshDto: RefreshDto) {
    const payload = this.jwtService.verify<JwtPayload>(refreshDto.refreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-dev'),
    });

    const foundUser = this.dataStoreService.findUserById(payload.sub);
    const user = foundUser ? this.dataStoreService.ensureUserCanAccess(foundUser) : undefined;
    return { data: user ? this.buildTokens(user).data : null };
  }

  logout() {
    return { data: { success: true } };
  }

  private async sendEmailCode(email: string) {
    const { url, key } = this.supabaseAuthConfig();
    const response = await fetch(`${url}/auth/v1/otp`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, create_user: true }),
    });
    if (!response.ok) throw this.emailDeliveryError(response.status, await response.text());
  }

  private emailDeliveryError(status: number, detail: string) {
    const code = /"error_code"\s*:\s*"([^"]+)"/.exec(detail)?.[1] ?? '';
    if (status === 429 || code === 'over_email_send_rate_limit') {
      return new HttpException(
        'O provedor de e-mail atingiu o limite de envios. Aguarde alguns minutos e use "Reenviar código".',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (code === 'email_address_invalid' || status === 400) {
      return new BadRequestException('E-mail inválido. Confira o endereço digitado.');
    }
    return new ServiceUnavailableException('Não foi possível enviar o código de confirmação agora. Tente novamente em instantes.');
  }

  private isTransientEmailError(error: unknown) {
    const status = error instanceof HttpException ? error.getStatus() : 0;
    return status === HttpStatus.TOO_MANY_REQUESTS || status >= 500;
  }

  private async verifySupabaseCode(email: string, code: string) {
    const { url, key } = this.supabaseAuthConfig();
    const response = await fetch(`${url}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token: code, type: 'email' }),
    });
    if (!response.ok) throw new BadRequestException('Código inválido ou expirado. Solicite um novo código.');
  }

  private supabaseAuthConfig() {
    const url = this.configService.get<string>('SUPABASE_URL', '').replace(/\/$/, '');
    const key = this.configService.get<string>('SUPABASE_PUBLISHABLE_KEY', '');
    if (!url || !key) throw new ServiceUnavailableException('Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY para enviar códigos por e-mail.');
    return { url, key };
  }

  private buildTokens(user: {
    id: string;
    condominiumId: string;
    role: string;
    email: string;
    name: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      condominiumId: user.condominiumId,
      role: user.role as JwtPayload['role'],
      email: user.email,
    };

    return {
      data: {
        accessToken: this.jwtService.sign(payload, {
          expiresIn: '15m',
          secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'access-secret-dev'),
        }),
        refreshToken: this.jwtService.sign(payload, {
          expiresIn: '7d',
          secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-dev'),
        }),
        user,
      },
    };
  }
}
