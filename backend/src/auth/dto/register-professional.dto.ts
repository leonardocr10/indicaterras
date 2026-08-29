import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsEmail, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/** Bloco de atendimento: dias da semana (0 = domingo) e faixa de horario. */
export class WorkingHoursBlockDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  days!: number[];

  @Matches(/^\d{2}:\d{2}$/, { message: 'Horario de inicio invalido.' })
  start!: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'Horario de fim invalido.' })
  end!: string;
}

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursBlockDto)
  workingHours?: WorkingHoursBlockDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];
}
