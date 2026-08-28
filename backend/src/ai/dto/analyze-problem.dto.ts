import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AnalyzeProblemDto {
  @IsString()
  @MaxLength(2000)
  text!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
