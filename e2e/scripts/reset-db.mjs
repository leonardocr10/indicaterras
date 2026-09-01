/**
 * Zera o banco de teste e recarrega o seed E2E. Chamado pelo global-setup
 * quando E2E_RESET_DB=true, garantindo que a suite seja repetivel.
 */
import { spawnSync } from 'node:child_process';
import { lerEnvE2e, exigirBancoDeTeste, raizBackend } from './_shared.mjs';

const config = lerEnvE2e();
const alvo = exigirBancoDeTeste(config.E2E_DATABASE_URL);
const ambiente = { ...process.env, DATABASE_URL: alvo.url, NODE_ENV: 'test' };

// `migrate reset --force` derruba e recria o schema. A trava acima ja garantiu
// que o alvo e um MySQL local com "e2e" no nome, entao nao ha risco de producao.
const reset = spawnSync('npx', ['prisma', 'migrate', 'reset', '--force', '--skip-seed', '--skip-generate'], {
  cwd: raizBackend,
  env: ambiente,
  stdio: 'inherit',
  shell: true,
});
if (reset.status !== 0) process.exit(reset.status ?? 1);

// TS_NODE_COMPILER_OPTIONS em vez de --compiler-options: o JSON inline como
// argumento e destrocado pelas aspas do shell do Windows.
const seed = spawnSync('npx', ['ts-node', 'prisma/seed-e2e.ts'], {
  cwd: raizBackend,
  env: { ...ambiente, TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'CommonJS' }) },
  stdio: 'inherit',
  shell: true,
});
process.exit(seed.status ?? 1);
