import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const raizE2e = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const raizRepo = resolve(raizE2e, '..');
export const raizBackend = resolve(raizRepo, 'backend');

/** Le o .env.e2e sem depender do dotenv (os scripts rodam antes do install do TS). */
export function lerEnvE2e() {
  const valores = {};
  for (const arquivo of ['.env.e2e.example', '.env.e2e']) {
    const caminho = resolve(raizE2e, arquivo);
    if (!existsSync(caminho)) continue;
    for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
      const par = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!par) continue;
      valores[par[1]] = par[2].trim().replace(/^"|"$/g, '');
    }
  }
  return valores;
}

/** Mesma trava do env.ts, replicada aqui porque os scripts rodam fora do Playwright. */
export function exigirBancoDeTeste(url) {
  if (!url) throw new Error('E2E_DATABASE_URL nao definido em e2e/.env.e2e.');
  if (!url.startsWith('mysql://')) throw new Error('E2E_DATABASE_URL precisa comecar com mysql://.');
  const destino = new URL(url);
  if (!['localhost', '127.0.0.1', '::1'].includes(destino.hostname)) {
    throw new Error(`Recusando rodar contra o host remoto "${destino.hostname}". Use um MySQL local.`);
  }
  const banco = destino.pathname.replace(/^\//, '');
  if (!/e2e|test/i.test(banco)) throw new Error(`O banco "${banco}" nao parece ser de teste.`);
  return { url, banco, usuario: decodeURIComponent(destino.username), senha: decodeURIComponent(destino.password), porta: destino.port || '3306' };
}
