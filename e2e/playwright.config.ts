import { defineConfig, devices } from '@playwright/test';
import { env, exigirBancoDeTeste } from './env';

// Roda antes de qualquer teste: derruba a suite se o alvo nao for banco local.
if (env.gerenciarServidores) exigirBancoDeTeste();

const localizacaoPadrao = { latitude: -15.8267, longitude: -47.9218 }; // Brasilia

const comumBrasil = {
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  geolocation: localizacaoPadrao,
  permissions: ['geolocation'],
};

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  snapshotDir: './snapshots',

  fullyParallel: false,
  workers: 1,
  forbidOnly: env.ci,
  retries: env.ci ? 2 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './support/global-setup.ts',

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],

  use: {
    baseURL: env.baseUrl,
    // Item 30/31/32: evidencia so quando algo quebra, para o relatorio nao virar
    // um deposito de video de teste que passou.
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ...comumBrasil,
  },

  projects: [
    // Chromium desktop e o projeto prioritario: e onde toda a suite roda.
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], ...comumBrasil, viewport: { width: 1440, height: 900 } },
    },
    // O app e mobile-first (MobileLayout + bottom navigation). Estes dois
    // tamanhos cobrem iPhone 14/15 e o Pro Max, onde a bottom-nav aperta mais.
    {
      name: 'chromium-mobile-390',
      use: { ...devices['Desktop Chrome'], ...comumBrasil, viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: true },
      grep: /@mobile|@smoke|@journey/,
    },
    {
      name: 'chromium-mobile-430',
      use: { ...devices['Desktop Chrome'], ...comumBrasil, viewport: { width: 430, height: 932 }, hasTouch: true },
      grep: /@mobile|@responsive/,
    },
    {
      name: 'chromium-tablet',
      use: { ...devices['Desktop Chrome'], ...comumBrasil, viewport: { width: 768, height: 1024 }, hasTouch: true },
      grep: /@responsive|@smoke/,
    },
    // Firefox e WebKit rodam o nucleo, nao a suite inteira: o objetivo e pegar
    // incompatibilidade de render/API, nao repetir regra de negocio 3 vezes.
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'], ...comumBrasil, viewport: { width: 1440, height: 900 } },
      grep: /@smoke|@cross-browser/,
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'], ...comumBrasil, viewport: { width: 1440, height: 900 } },
      grep: /@smoke|@cross-browser/,
    },
  ],

  webServer: env.gerenciarServidores
    ? [
        {
          command: 'node scripts/start-api.mjs',
          cwd: env.raizE2e,
          url: `${env.apiUrl}/public-settings`,
          // Com reset de banco, reaproveitar uma API ja no ar significa rodar
          // contra o cache em memoria dela, carregado do estado anterior.
          reuseExistingServer: !env.ci && !env.resetarBanco,
          timeout: 180_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
        {
          command: 'npm start -- --port 4200',
          cwd: `${env.raizRepo}/frontend`,
          url: env.baseUrl,
          reuseExistingServer: !env.ci,
          timeout: 240_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      ]
    : undefined,
});
