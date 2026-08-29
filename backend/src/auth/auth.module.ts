import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DataModule } from '../data/data.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { MailService } from './mail.service';
import { MailSettingsService } from './mail-settings.service';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [ConfigModule, DataModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, MailService, MailSettingsService],
  exports: [JwtModule, PassportModule, RolesGuard, MailService, MailSettingsService],
})
export class AuthModule {}
