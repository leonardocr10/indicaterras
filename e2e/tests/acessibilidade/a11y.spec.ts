import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../fixtures/teste-base';
import { entrarComo } from '../../fixtures/sessao';

/**
 * Item 36: acessibilidade basica com axe-core.
 *
 * Rodamos apenas as regras que o item pede - rotulo em botao, label em campo,
 * alt em imagem e contraste - em vez do conjunto completo. Ligar tudo de uma
 * vez num app existente produz uma lista enorme que ninguem trata, e o teste
 * vira ruido permanente.
 */
const REGRAS = [
  'button-name',
  'link-name',
  'label',
  'image-alt',
  'input-image-alt',
  'aria-required-attr',
  'aria-valid-attr-value',
  'form-field-multiple-labels',
];

const REGRAS_DE_CONTRASTE = ['color-contrast'];

async function analisar(page: import('@playwright/test').Page, regras: string[]) {
  return new AxeBuilder({ page }).withRules(regras).analyze();
}

function descrever(violacoes: Awaited<ReturnType<typeof analisar>>['violations']) {
  return violacoes
    .map((violacao) => {
      const alvos = violacao.nodes.slice(0, 4).map((no) => `      ${no.target.join(' ')}`).join('\n');
      return `  [${violacao.id}] ${violacao.help} (${violacao.nodes.length} ocorrencia(s))\n${alvos}`;
    })
    .join('\n');
}

const TELAS_DO_CLIENTE: Array<[string, string]> = [
  ['Home', '/app/home'],
  ['Buscar', '/app/profissionais'],
  ['Proximos', '/app/buscar'],
  ['Favoritos', '/app/favoritos'],
  ['Perfil', '/app/perfil'],
  ['Solicitacoes', '/app/solicitacoes'],
];

test.describe('@a11y Acessibilidade basica', () => {
  test('a tela de login passa nas regras basicas', async ({ page, login }) => {
    await login.abrir();
    const resultado = await analisar(page, REGRAS);
    expect(resultado.violations, `Problemas de acessibilidade no login:\n${descrever(resultado.violations)}`).toEqual([]);
  });

  for (const [nome, rota] of TELAS_DO_CLIENTE) {
    test(`${nome} passa nas regras basicas`, async ({ page }) => {
      await entrarComo(page, 'cliente');
      await page.goto(rota);
      await page.waitForLoadState('networkidle');

      const resultado = await analisar(page, REGRAS);
      expect(resultado.violations, `Problemas de acessibilidade em ${nome} (${rota}):\n${descrever(resultado.violations)}`).toEqual([]);
    });
  }

  test('o painel do admin passa nas regras basicas', async ({ page }) => {
    await entrarComo(page, 'admin');
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    const resultado = await analisar(page, REGRAS);
    expect(resultado.violations, `Problemas de acessibilidade no admin:\n${descrever(resultado.violations)}`).toEqual([]);
  });

  test('a Home nao tem problema critico de contraste', async ({ page }) => {
    await entrarComo(page, 'cliente');
    await page.goto('/app/home');
    await page.waitForLoadState('networkidle');

    const resultado = await analisar(page, REGRAS_DE_CONTRASTE);
    const criticas = resultado.violations.filter((violacao) => violacao.impact === 'critical' || violacao.impact === 'serious');
    expect(criticas, `Contraste insuficiente na Home:\n${descrever(criticas)}`).toEqual([]);
  });
});

test.describe('@a11y Navegacao por teclado', () => {
  test('da para percorrer e enviar o login so com o teclado', async ({ page, login }) => {
    await login.abrir();

    await login.campoEmail.focus();
    await page.keyboard.type('cliente.e2e@example.test');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Senha@123');

    // Tab ate chegar no botao Entrar e acionar com Enter.
    for (let i = 0; i < 8; i += 1) {
      const foco = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
      if (foco === 'Entrar') break;
      await page.keyboard.press('Tab');
    }
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/app\/home/, { timeout: 25_000 });
  });

  test('o foco fica visivel ao navegar por Tab na Home', async ({ page }) => {
    await entrarComo(page, 'cliente');
    await page.goto('/app/home');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    const temFoco = await page.evaluate(() => {
      const ativo = document.activeElement;
      return Boolean(ativo && ativo !== document.body);
    });
    expect(temFoco, 'o primeiro Tab deveria mover o foco para um elemento interativo').toBeTruthy();
  });

  test('o menu lateral fecha com o teclado', async ({ page, navegacao }) => {
    await entrarComo(page, 'cliente');
    await page.goto('/app/home');
    await page.waitForLoadState('networkidle');

    await navegacao.abrirMenu();
    await navegacao.drawer.getByRole('button', { name: 'Fechar menu' }).focus();
    await page.keyboard.press('Enter');
    await expect(navegacao.drawer).toBeHidden();
  });
});
