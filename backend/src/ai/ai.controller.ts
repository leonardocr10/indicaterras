import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyzeProblemDto } from './dto/analyze-problem.dto';
import { ProblemAnalysisService } from './problem-analysis.service';
import { AiSettingsService } from './ai-settings.service';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly problemAnalysisService: ProblemAnalysisService,
    private readonly settingsService: AiSettingsService,
  ) {}

  @Post('problem-analysis')
  async analyzeProblem(@Body() body: AnalyzeProblemDto) {
    const settings = await this.settingsService.getRaw();
    const text = String(body.text ?? '').trim();
    if (!text) throw new BadRequestException('Descreva o problema antes de analisar.');
    if (text.length > settings.maxInputLength) {
      throw new BadRequestException(`O texto deve ter no máximo ${settings.maxInputLength} caracteres.`);
    }
    const data = await this.problemAnalysisService.analyze(text, { userId: body.userId ?? null });
    return { data };
  }
}
