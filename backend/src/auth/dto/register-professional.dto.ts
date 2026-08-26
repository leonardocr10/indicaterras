import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterProfessionalDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsString()
  categoryId!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  condominiumId?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
