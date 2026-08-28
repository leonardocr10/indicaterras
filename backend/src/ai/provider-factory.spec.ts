import { AiProviderFactory } from './provider-factory';
import { GeminiProvider } from './providers/gemini.provider';

describe('AiProviderFactory', () => {
  const gemini = new GeminiProvider();
  const factory = new AiProviderFactory(gemini);

  it('resolve o provedor Gemini', () => {
    expect(factory.getProvider('gemini')).toBe(gemini);
  });

  it('falha com mensagem clara para um provedor ainda não suportado', () => {
    expect(() => factory.getProvider('openrouter')).toThrow(/não é suportado/);
  });
});
