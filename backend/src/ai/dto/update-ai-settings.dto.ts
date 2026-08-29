import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

const PROVIDERS = ['gemini', 'openrouter'];

export class UpdateAiSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(PROVIDERS)
  provider?: string;

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
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8192)
  maxOutputTokens?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  timeoutMs?: number;

  @IsOptional()
  @IsBoolean()
  problemAnalysisEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  categorySuggestionEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  serviceSuggestionEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  summaryEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  clarificationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  fallbackKeywordsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  keywordFirstEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  keywordFirstConfidence?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minimumConfidence?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  autoApplyConfidence?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dailyLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(2000)
  maxInputLength?: number;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  homeTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  homeSubtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  homePlaceholder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  homeHelperText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  successMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  lowConfidenceMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  fallbackMessage?: string;
}
