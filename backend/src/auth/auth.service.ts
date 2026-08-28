import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataStoreService } from '../data/data-store.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterProfessionalDto } from './dto/register-professional.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

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
      zipCode: registerDto.zipCode,
      street: registerDto.street,
      number: registerDto.number,
      complement: registerDto.complement,
      neighborhood: registerDto.neighborhood,
      city: registerDto.city,
      state: registerDto.state,
    });
    const canAccess = !this.dataStoreService.requiresUserApproval() || user.approvalStatus === 'APPROVED';
    return {
      data: {
        email: user.email,
        requiresApproval: !canAccess,
        session: canAccess ? this.buildTokens(user).data : null,
      },
    };
  }

  async registerProfessional(dto: RegisterProfessionalDto) {
    const result = await this.dataStoreService.createProfessionalAccount(dto);
    return {
      data: {
        email: result.user.email,
        requiresApproval: false,
        professionalId: result.professionalId,
        session: this.buildTokens(result.user).data,
      },
    };
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
