import { Injectable } from '@nestjs/common';
import { AiProvider } from './providers/ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';

@Injectable()
export class AiProviderFactory {
  constructor(private readonly geminiProvider: GeminiProvider) {}

  getProvider(provider: string): AiProvider {
    switch (provider) {
      case 'gemini':
        return this.geminiProvider;
      default:
        throw new Error(`Provedor de IA "${provider}" não é suportado ainda.`);
    }
  }
}
