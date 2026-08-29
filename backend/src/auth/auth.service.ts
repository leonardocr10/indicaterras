import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomInt } from 'crypto';
import { DataStoreService } from '../data/data-store.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterProfessionalDto } from './dto/register-professional.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { MailService } from './mail.service';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataStoreService: DataStoreService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Sempre responde a mesma coisa, exista o e-mail ou nao: dizer "nao
   * encontrado" deixaria qualquer um descobrir quem tem conta no sistema.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = this.dataStoreService.findUserByEmail(dto.email);
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.dataStoreService.createPasswordReset(user.id, token);
      const base = (this.configService.get<string>('APP_URL') ?? 'https://indicafacil.pro').replace(/\/$/, '');
      await this.mailService.enviarRecuperacaoDeSenha(user.email, `${base}/redefinir-senha?token=${token}`);
    }
    return { data: { sent: true } };
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.dataStoreService.consumePasswordReset(dto.token, dto.password);
    return { data: { success: true } };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.dataStoreService.verifyEmailCode(dto.email, dto.code);
    const canAccess = user.approvalStatus === 'APPROVED';
    return {
      data: {
        email: user.email,
        requiresApproval: !canAccess,
        session: canAccess ? this.buildTokens(user).data : null,
      },
    };
  }

  async resendVerification(email: string) {
    const user = this.dataStoreService.findUserByEmail(email);
    if (user && !user.emailVerified) await this.enviarCodigoDeConfirmacao(user);
    // Mantém a mesma resposta para não revelar se o endereço tem conta.
    return { data: { sent: true } };
  }

  async login(loginDto: LoginDto) {
    const user = await this.dataStoreService.validateUser(loginDto.email, loginDto.password);
    // "Lembrar-me" estende a sessao: sem isso o checkbox nao tinha efeito nenhum
    // e quem instalava o app precisava entrar de novo a cada semana.
    return this.buildTokens(user, loginDto.rememberMe === true);
  }

  async register(registerDto: RegisterDto) {
    const user = await this.dataStoreService.createResident({
      condominiumId: registerDto.condominiumId,
      email: registerDto.email,
      name: registerDto.name,
      phone: registerDto.phone,
      password: registerDto.password,
      zipCode: registerDto.zipCode,
      street: registerDto.street,
      number: registerDto.number,
      complement: registerDto.complement,
      neighborhood: registerDto.neighborhood,
      city: registerDto.city,
      state: registerDto.state,
    });
    await this.enviarCodigoDeConfirmacao(user);
    return {
      data: {
        email: user.email,
        requiresApproval: false,
        session: null,
      },
    };
  }

  async registerProfessional(dto: RegisterProfessionalDto) {
    const result = await this.dataStoreService.createProfessionalAccount(dto);
    await this.enviarCodigoDeConfirmacao(result.user);
    return {
      data: {
        email: result.user.email,
        requiresApproval: true,
        professionalId: result.professionalId,
        session: null,
      },
    };
  }

  refresh(refreshDto: RefreshDto) {
    const payload = this.jwtService.verify<JwtPayload>(refreshDto.refreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-dev'),
    });

    const foundUser = this.dataStoreService.findUserById(payload.sub);
    const user = foundUser ? this.dataStoreService.ensureUserCanAccess(foundUser) : undefined;
    // Mantem a duracao escolhida no login: renovar nao pode encurtar a sessao.
    return { data: user ? this.buildTokens(user, payload.remember === true).data : null };
  }

  logout() {
    return { data: { success: true } };
  }

  private async enviarCodigoDeConfirmacao(user: { id: string; email: string; name: string }) {
    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.dataStoreService.createEmailVerification(user.id, codigo);
    await this.mailService.enviarCodigoDeAtivacao(user.email, user.name, codigo);
  }

  private buildTokens(
    user: {
      id: string;
      condominiumId: string;
      role: string;
      email: string;
      name: string;
    },
    rememberMe = false,
  ) {
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
        refreshToken: this.jwtService.sign({ ...payload, remember: rememberMe }, {
          expiresIn: rememberMe ? '90d' : '7d',
          secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-dev'),
        }),
        user,
      },
    };
  }
}
