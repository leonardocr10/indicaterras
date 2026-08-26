import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsString()
  condominiumId!: string;

  @IsOptional()
  @IsString()
  block?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
