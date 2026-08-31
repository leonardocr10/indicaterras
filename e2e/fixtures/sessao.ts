import type { APIRequestContext, Page } from '@playwright/test';
import { CONTAS, type NomeDeConta } from './contas';
import { env } from '../env';

/**
 * A sessao do app vive em `localStorage` sob a chave `terras-alphas-session`
 * (ver `frontend/src/app/services/auth.service.ts`). Entrar pela API e gravar
 * essa chave e muito mais rapido do que preencher o formulario de login em
 * todo teste - e o formulario em si tem sua propria suite, em tests/auth.
 */
export const CHAVE_DE_SESSAO = 'terras-alphas-session';
export const CHAVE_LOCALIZACAO = 'indicafacil-busca-local';
export const CHAVE_RAIO = 'indicafacil-busca-raio';

export interface SessaoDaApi {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: string; phone: string; condominiumId: string };
}

/** Autentica pela API e devolve a sessao crua. */
export async function autenticarPelaApi(
  requisicao: APIRequestContext,
  email: string,
  senha: string,
): Promise<SessaoDaApi> {
  const resposta = await requisicao.post(`${env.apiUrl}/auth/login`, {
    data: { email, password: senha, rememberMe: true },
  });
  if (!resposta.ok()) {
    throw new Error(`Login E2E falhou para ${email}: ${resposta.status()} ${await resposta.text()}`);
  }
  const corpo = await resposta.json();
  return corpo.data as SessaoDaApi;
}

/**
 * Injeta a sessao antes de a aplicacao carregar. Usa `addInitScript` porque o
 * AuthService le o localStorage na construcao do servico - gravar depois do
 * primeiro `goto` chegaria tarde demais.
 */
export async function entrarComo(page: Page, conta: NomeDeConta): Promise<SessaoDaApi> {
  const dados = CONTAS[conta];
  const sessao = await autenticarPelaApi(page.request, dados.email, dados.senha);
  await page.addInitScript(
    ([chave, valor]) => window.localStorage.setItem(chave as string, valor as string),
    [CHAVE_DE_SESSAO, JSON.stringify(sessao)] as const,
  );
  return sessao;
}

/** Limpa a sessao gravada, simulando um usuario deslogado. */
export async function sair(page: Page) {
  await page.evaluate((chave) => window.localStorage.removeItem(chave), CHAVE_DE_SESSAO);
}

/**
 * Corrompe o access token mantendo o refresh. Serve para observar o que o app
 * faz quando o token expira: o interceptor deve renovar sozinho.
 */
export async function expirarAccessToken(page: Page) {
  await page.evaluate((chave) => {
    const bruto = window.localStorage.getItem(chave);
    if (!bruto) return;
    const sessao = JSON.parse(bruto);
    sessao.accessToken = 'token.expirado.e2e';
    window.localStorage.setItem(chave, JSON.stringify(sessao));
  }, CHAVE_DE_SESSAO);
}

/** Invalida a sessao inteira: nem o refresh serve mais. */
export async function invalidarSessaoInteira(page: Page) {
  await page.evaluate((chave) => {
    const bruto = window.localStorage.getItem(chave);
    if (!bruto) return;
    const sessao = JSON.parse(bruto);
    sessao.accessToken = 'token.invalido.e2e';
    sessao.refreshToken = 'refresh.invalido.e2e';
    window.localStorage.setItem(chave, JSON.stringify(sessao));
  }, CHAVE_DE_SESSAO);
}

/** Pre-define a localizacao de busca, pulando o fluxo de permissao do browser. */
export async function definirLocalizacaoSalva(
  page: Page,
  local: { latitude: number; longitude: number; label?: string },
  raioKm?: number,
) {
  const valor = JSON.stringify({
    latitude: local.latitude,
    longitude: local.longitude,
    label: local.label ?? 'Sua localizacao atual',
    origin: 'device',
  });
  await page.addInitScript(
    ([chaveLocal, valorLocal, chaveRaio, valorRaio]) => {
      window.localStorage.setItem(chaveLocal as string, valorLocal as string);
      if (valorRaio) window.localStorage.setItem(chaveRaio as string, valorRaio as string);
    },
    [CHAVE_LOCALIZACAO, valor, CHAVE_RAIO, raioKm ? String(raioKm) : ''] as const,
  );
}

/** Garante que nao ha localizacao salva (estado "primeiro acesso"). */
export async function limparLocalizacaoSalva(page: Page) {
  await page.addInitScript(
    ([chaveLocal, chaveRaio]) => {
      window.localStorage.removeItem(chaveLocal as string);
      window.localStorage.removeItem(chaveRaio as string);
    },
    [CHAVE_LOCALIZACAO, CHAVE_RAIO] as const,
  );
}
