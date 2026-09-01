import type { Page, Route } from '@playwright/test';

/**
 * Mock da consulta de CEP (BrasilAPI).
 *
 * Dois motivos para existir:
 *
 * 1. A suite nao pode depender de uma API publica externa - ela cai, muda de
 *    formato e limita requisicoes.
 * 2. `onZipCodeInput` dispara a consulta a cada tecla e sobrescreve rua,
 *    bairro, cidade e estado quando a resposta chega. Sem controle sobre esse
 *    tempo, o formulario de cadastro vira uma corrida: os campos preenchidos
 *    pelo teste eram apagados pela resposta atrasada, e o passo 2 nunca
 *    validava. Foi exatamente o que quebrou a jornada no viewport de 390px.
 *
 * Com o mock a resposta e imediata e conhecida, entao o Page Object preenche o
 * CEP primeiro, espera o endereco chegar e so entao completa o resto.
 */

const URL_CEP = 'https://brasilapi.com.br/api/cep/v2/*';

export interface EnderecoDeTeste {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

/** Endereco devolvido para qualquer CEP valido, alinhado com a origem do seed. */
export const ENDERECO_PADRAO: EnderecoDeTeste = {
  street: 'Rua dos Testes',
  neighborhood: 'Asa Sul',
  city: 'Brasilia',
  state: 'DF',
  latitude: -15.8267,
  longitude: -47.9218,
};

export async function mockConsultaDeCep(page: Page, endereco: Partial<EnderecoDeTeste> = {}) {
  const dados = { ...ENDERECO_PADRAO, ...endereco };
  await page.route(URL_CEP, async (rota: Route) => {
    await rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        street: dados.street,
        neighborhood: dados.neighborhood,
        city: dados.city,
        state: dados.state,
        location: { coordinates: { latitude: dados.latitude, longitude: dados.longitude } },
      }),
    });
  });
}

/** CEP inexistente: a BrasilAPI responde 404. */
export async function mockCepNaoEncontrado(page: Page) {
  await page.route(URL_CEP, async (rota: Route) => {
    await rota.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'CEP nao encontrado.' }),
    });
  });
}
