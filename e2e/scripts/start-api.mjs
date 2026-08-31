/**
 * Sobe a API NestJS apontada para o banco de teste.
 *
 * O `backend/.env` aponta para o Supabase de PRODUCAO. O @nestjs/config usa
 * dotenv, que nao sobrescreve variaveis ja presentes no processo - por isso o
 * DATABASE_URL passado aqui vence o do arquivo. A checagem no global-setup
 * confirma isso antes de qualquer teste destrutivo rodar.
 */
import { spawn } from 'node:child_process';
import { lerEnvE2e, exigirBancoDeTeste, raizBackend } from './_shared.mjs';

const config = lerEnvE2e();
const alvo = exigirBancoDeTeste(config.E2E_DATABASE_URL);

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
