import { test, expect } from '../../fixtures/teste-base';

/**
 * Item 8: busca por problema em linguagem natural.
 *
 * Isto roda com a IA DESLIGADA de proposito: o que esta sendo testado e o
 * matcher por palavras-chave (`POST /service-requests/match-problem`), que usa
 * os aliases cadastrados no catalogo. Se ele quebrar, o app perde o caminho de
 * entrada mesmo com a IA ligada, porque o keyword-first vem antes dela.
 */

const FRASES: Array<{ frase: string; categoria: RegExp }> = [
  { frase: 'meu chuveiro queimou', categoria: /Eletricista/i },
  { frase: 'minha pia esta vazando', categoria: /Encanador/i },
  { frase: 'tem cheiro de gas', categoria: /Gas/i },
  { frase: 'meu ar nao gela', categoria: /Ar-condicionado/i },
  { frase: 'preciso de psicologa', categoria: /Psicologia/i },
  { frase: 'meu notebook esta lento', categoria: /Informatica/i },
];

test.describe('@regression Busca por problema', () => {
  test.beforeEach(async ({ comoCliente, home }) => {
    void comoCliente;
    await home.abrir();
    await home.esperarCarregada();
  });

  for (const { frase, categoria } of FRASES) {
    test(`"${frase}" sugere a categoria certa`, async ({ home }) => {
      await home.descreverProblema(frase);

      await expect(home.sugestaoPorPalavraChave).toBeVisible({ timeout: 20_000 });
      await expect(home.sugestaoPorPalavraChave).toContainText(categoria);
    });
  }

  test('frase sem correspondencia admite que nao sabe, em vez de chutar', async ({ home }) => {
    await home.descreverProblema('xyzabc coisa completamente aleatoria e2e');
    await expect(home.sugestaoPorPalavraChave).toBeVisible({ timeout: 20_000 });
    await expect(home.sugestaoPorPalavraChave).toContainText(/Não identificamos|Nao identificamos/i);
  });

  test('a sugestao leva para os profissionais da categoria', async ({ page, home, busca }) => {
    await home.descreverProblema('meu chuveiro queimou');
    await expect(home.sugestaoPorPalavraChave).toBeVisible({ timeout: 20_000 });

    await home.sugestaoPorPalavraChave.getByRole('button', { name: /Ver profissionais/i }).click();
    await expect(page).toHaveURL(/\/app\/profissionais/, { timeout: 15_000 });
    await busca.aguardarCarregamento();

    const nomes = (await busca.listarNomes()).join(' ');
    expect(nomes, 'a busca deveria trazer eletricistas').toMatch(/Eletricista|Profissional E2E/);
  });

  test('a sugestao tambem abre o fluxo de propostas ja com o problema', async ({ page, home, solicitacao }) => {
    await home.descreverProblema('minha pia esta vazando');
    await expect(home.sugestaoPorPalavraChave).toBeVisible({ timeout: 20_000 });

    await home.sugestaoPorPalavraChave.getByRole('button', { name: /Quero receber propostas/i }).click();
    await expect(page).toHaveURL(/\/app\/solicitacoes\/nova/, { timeout: 15_000 });
    await expect(solicitacao.campoDescricao).toHaveValue(/pia/i);
  });

  test('a API de match responde com categoria e servicos', async ({ request }) => {
    const { env } = await import('../../env');
    const resposta = await request.post(`${env.apiUrl}/service-requests/match-problem`, {
      data: { query: 'meu chuveiro queimou' },
    });
    expect(resposta.ok()).toBeTruthy();
    const { data } = await resposta.json();
    expect(data.category?.name, 'o matcher deveria identificar Eletricista').toMatch(/Eletricista/i);
    expect(Array.isArray(data.services)).toBeTruthy();
  });
});
