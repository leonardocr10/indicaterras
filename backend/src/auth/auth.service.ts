import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataStoreService } from '../data/data-store.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
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
    await this.sendEmailCode(user.email);
    return {
      data: {
        email: user.email,
        emailVerificationRequired: true,
        requiresApproval: this.dataStoreService.requiresUserApproval(),
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
    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(`Não foi possível enviar o código de confirmação. ${detail}`);
    }
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
