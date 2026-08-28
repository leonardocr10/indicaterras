import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Permite testar valores ainda não salvos. Sem isso o botão testaria a configuração
 * anterior, que é justamente a que a pessoa está tentando substituir.
 */
export class TestConnectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  endpointUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  timeoutMs?: number;
}
