/**
 * Sobe a API NestJS apontada para o banco de teste.
 *
 * O `backend/.env` aponta para o Supabase de PRODUCAO. O @nestjs/config usa
 * dotenv, que nao sobrescreve variaveis ja presentes no processo - por isso o
 * DATABASE_URL passado aqui vence o do arquivo. A checagem no global-setup
 * confirma isso antes de qualquer teste destrutivo rodar.
 */
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { lerEnvE2e, exigirBancoDeTeste, raizBackend, raizE2e } from './_shared.mjs';

const config = lerEnvE2e();
const alvo = exigirBancoDeTeste(config.E2E_DATABASE_URL);

// O seed roda AQUI, antes do Nest subir, e nao no globalSetup.
//
// O Playwright inicia o webServer antes do globalSetup, e o DataStoreService
// carrega usuarios e configuracoes para a memoria uma unica vez, no boot. Com o
// seed depois, a API ficava com cache apontando para linhas ja apagadas: o
// cadastro respondia sem sessao e a tela pedia confirmacao de e-mail que nao
// deveria existir. Semear antes de subir elimina a janela.
// process.env vence o arquivo, como no env.ts: `E2E_RESET_DB=false node
// scripts/start-api.mjs` precisa realmente pular o seed.
const resetSolicitado = process.env.E2E_RESET_DB ?? config.E2E_RESET_DB ?? 'true';
if (resetSolicitado !== 'false') {
  console.log('[e2e] Preparando o banco de teste antes de subir a API...');
  const preparo = spawnSync('node', ['scripts/reset-db.mjs'], {
    cwd: resolve(raizE2e),
    stdio: 'inherit',
    shell: true,
  });
  if (preparo.status !== 0) {
    console.error('[e2e] Falhou ao preparar o banco. A API nao sobe sem dados coerentes.');
    process.exit(1);
  }
}

const filho = spawn('npx', ['nest', 'start', '--watch'], {
  cwd: raizBackend,
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: alvo.url,
    NODE_ENV: 'test',
    PORT: config.E2E_API_PORT || '3000',
    CORS_ORIGIN: config.E2E_BASE_URL || 'http://localhost:4200',
    JWT_ACCESS_SECRET: 'e2e-access-secret',
    JWT_REFRESH_SECRET: 'e2e-refresh-secret',
    E2E: 'true',
  },
});

process.on('SIGINT', () => filho.kill('SIGINT'));
process.on('SIGTERM', () => filho.kill('SIGTERM'));
filho.on('exit', (codigo) => process.exit(codigo ?? 0));
