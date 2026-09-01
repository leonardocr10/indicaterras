import type { APIRequestContext } from '@playwright/test';
import { env } from '../env';
import { CONTAS } from '../fixtures/contas';

/**
 * Liga e desliga a IA pela API administrativa.
 *
 * Existe tambem o caminho pela tela (`AdminAiPage`), que e o testado no item 23.
 * Este helper serve para os OUTROS testes: quando o objetivo e verificar a Home
 * com a IA ligada, passar pelo formulario do admin a cada teste so adicionaria
 * pontos de falha sem cobrir nada novo.
 */

let tokenDoAdmin: string | null = null;

async function autenticarAdmin(requisicao: APIRequestContext): Promise<string> {
  if (tokenDoAdmin) return tokenDoAdmin;
  const resposta = await requisicao.post(`${env.apiUrl}/auth/login`, {
    data: { email: CONTAS.admin.email, password: CONTAS.admin.senha, rememberMe: true },
  });
  if (!resposta.ok()) throw new Error(`Nao consegui autenticar o admin E2E: ${resposta.status()}`);
  tokenDoAdmin = (await resposta.json()).data.accessToken as string;
  return tokenDoAdmin;
}

/**
 * Aplica um patch nas configuracoes de IA.
 *
 * Envia SO os campos a mudar. `AiSettingsService.update` faz update parcial no
 * Prisma, entao devolver o objeto inteiro do GET era desnecessario - e
 * quebrava: o DTO roda sob `forbidNonWhitelisted` e recusa os campos que o GET
 * acrescenta (`id`, `apiKeySource`, `createdAt`...) com 400.
 */
export async function ajustarIa(requisicao: APIRequestContext, patch: Record<string, unknown>) {
  const token = await autenticarAdmin(requisicao);
  const resposta = await requisicao.put(`${env.apiUrl}/admin/ai-settings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: patch,
  });
  if (!resposta.ok()) {
    throw new Error(`PUT /admin/ai-settings falhou: ${resposta.status()} ${await resposta.text()}`);
  }
}

export async function ligarIa(requisicao: APIRequestContext, patch: Record<string, unknown> = {}) {
  await ajustarIa(requisicao, {
    enabled: true,
    problemAnalysisEnabled: true,
    categorySuggestionEnabled: true,
    serviceSuggestionEnabled: true,
    // Sem isso o backend tenta a palavra-chave antes e o teste nunca exercita
    // o caminho da IA que quer observar.
    keywordFirstEnabled: false,
    ...patch,
  });
}

export async function desligarIa(requisicao: APIRequestContext) {
  await ajustarIa(requisicao, { enabled: false });
}

/** Zera o cache do token entre arquivos de teste. */
export function esquecerTokenDoAdmin() {
  tokenDoAdmin = null;
}
