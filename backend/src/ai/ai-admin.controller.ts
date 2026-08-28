import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AiSettingsService } from './ai-settings.service';
import { AiLogsService } from './ai-logs.service';
import { ProblemAnalysisService } from './problem-analysis.service';
import { AiProviderFactory } from './provider-factory';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';

@ApiTags('admin-ai')
@Controller('admin/ai-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONDO_ADMIN')
export class AiAdminSettingsController {
  constructor(
    private readonly settingsService: AiSettingsService,
    private readonly problemAnalysisService: ProblemAnalysisService,
    private readonly providerFactory: AiProviderFactory,
  ) {}

  @Get()
  async getSettings() {
    return { data: await this.settingsService.getMasked() };
  }

  @Put()
  async updateSettings(@Body() payload: UpdateAiSettingsDto) {
    return { data: await this.settingsService.update(payload) };
  }

  @Post('test-connection')
  async testConnection() {
    const settings = await this.settingsService.getRaw();
    const apiKey = await this.settingsService.getResolvedApiKey(settings);
    const provider = this.providerFactory.getProvider(settings.provider);
    const result = await provider.testConnection({
      apiKey: apiKey ?? '',
      model: settings.model,
      endpointUrl: settings.endpointUrl,
      timeoutMs: settings.timeoutMs,
    });
    return { data: result };
  }

  @Post('test-analysis')
  async testAnalysis(@Body('text') text: string) {
    const data = await this.problemAnalysisService.analyze(String(text ?? ''), { dryRun: true });
    return { data };
  }
}

@ApiTags('admin-ai')
@Controller('admin/ai-analysis-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONDO_ADMIN')
export class AiAdminLogsController {
  constructor(private readonly logsService: AiLogsService) {}

  @Get()
  async list(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return { data: await this.logsService.list({ page: Number(page) || 1, pageSize: Number(pageSize) || 20 }) };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return { data: await this.logsService.getById(id) };
  }

  @Patch(':id/feedback')
  async setFeedback(@Param('id') id: string, @Body('feedback') feedback: 'correct' | 'incorrect') {
    return { data: await this.logsService.setFeedback(id, feedback) };
  }
}

@ApiTags('admin-ai')
@Controller('admin/ai-usage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONDO_ADMIN')
export class AiAdminUsageController {
  constructor(private readonly logsService: AiLogsService) {}

  @Get()
  async usage() {
    return { data: await this.logsService.usage() };
  }
}
