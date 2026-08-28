import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { AuthModule } from '../auth/auth.module';
import { AiController } from './ai.controller';
import { AiAdminSettingsController, AiAdminLogsController, AiAdminUsageController } from './ai-admin.controller';
import { AiSettingsService } from './ai-settings.service';
import { AiLogsService } from './ai-logs.service';
import { ProblemAnalysisService } from './problem-analysis.service';
import { AiProviderFactory } from './provider-factory';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  imports: [DataModule, AuthModule],
  controllers: [AiController, AiAdminSettingsController, AiAdminLogsController, AiAdminUsageController],
  providers: [AiSettingsService, AiLogsService, ProblemAnalysisService, AiProviderFactory, GeminiProvider],
  exports: [AiSettingsService],
})
export class AiModule {}
