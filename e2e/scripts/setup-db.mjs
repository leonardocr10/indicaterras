/**
 * Cria o banco de teste e o usuario dedicado no MySQL local. Roda uma vez.
 *
 * Por padrao NAO guarda a senha administrativa em lugar nenhum: chama o cliente
 * `mysql` com `-p` puro, que pergunta no terminal. Se voce preferir automatizar
 * (CI, por exemplo), preencha E2E_MYSQL_ADMIN_PASSWORD no e2e/.env.e2e.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { lerEnvE2e, exigirBancoDeTeste, raizBackend } from './_shared.mjs';

const CAMINHOS_MYSQL = [
  'mysql',
  'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe',
  'C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe',
  '/usr/bin/mysql',
];

function acharMysql() {
  for (const caminho of CAMINHOS_MYSQL) {
    if (caminho.includes('/') && !existsSync(caminho)) continue;
    const teste = spawnSync(caminho, ['--version'], { encoding: 'utf8' });
    if (teste.status === 0) return caminho;
  }
  throw new Error('Cliente `mysql` nao encontrado. Adicione o bin do MySQL ao PATH.');
}

const config = lerEnvE2e();
const alvo = exigirBancoDeTeste(config.E2E_DATABASE_URL);
const mysql = acharMysql();

const sql = [
  `CREATE DATABASE IF NOT EXISTS \`${alvo.banco}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  `CREATE USER IF NOT EXISTS '${alvo.usuario}'@'localhost' IDENTIFIED BY '${alvo.senha}';`,
  `ALTER USER '${alvo.usuario}'@'localhost' IDENTIFIED BY '${alvo.senha}';`,
  `GRANT ALL PRIVILEGES ON \`${alvo.banco}\`.* TO '${alvo.usuario}'@'localhost';`,
  'FLUSH PRIVILEGES;',
].join(' ');

const senhaAdmin = config.E2E_MYSQL_ADMIN_PASSWORD;
const interativo = !senhaAdmin;

const argumentos = [
  '-u',
  config.E2E_MYSQL_ADMIN_USER || 'root',
  '-h',
  '127.0.0.1',
  '-P',
  alvo.porta,
  interativo ? '-p' : `-p${senhaAdmin}`,
  '-e',
  sql,
];

console.log(`[e2e] Criando banco "${alvo.banco}" e usuario "${alvo.usuario}" no MySQL local...`);
if (interativo) console.log('[e2e] Digite a senha do MySQL (root) quando for pedida.');

// stdio herdado: sem isso o prompt de senha do mysql nao aparece no terminal.
const criacao = spawnSync(mysql, argumentos, { stdio: 'inherit' });
if (criacao.status !== 0) {
  console.error('\n[e2e] Falhou ao criar o banco. Verifique a senha ou defina E2E_MYSQL_ADMIN_PASSWORD em e2e/.env.e2e.');
  process.exit(1);
}

console.log('[e2e] Aplicando as migrations do Prisma no banco de teste...');
const migracao = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  cwd: raizBackend,
  env: { ...process.env, DATABASE_URL: alvo.url },
  stdio: 'inherit',
  shell: true,
});
if (migracao.status !== 0) process.exit(migracao.status ?? 1);

console.log('[e2e] Banco de teste pronto. Agora rode: npm run test:e2e');
