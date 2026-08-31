import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));

// .env.e2e primeiro: se alguem exportou DATABASE_URL no shell apontando para
// producao, o arquivo local do E2E tem que ganhar. Por isso `override: true`.
const arquivoLocal = resolve(aqui, '.env.e2e');
if (existsSync(arquivoLocal)) loadEnv({ path: arquivoLocal, override: true });
loadEnv({ path: resolve(aqui, '.env.e2e.example') });

function texto(nome: string, padrao = ''): string {
  return (process.env[nome] ?? padrao).trim().replace(/^"|"$/g, '');
}

function ligado(nome: string, padrao: boolean): boolean {
  const valor = texto(nome);
  if (!valor) return padrao;
  return valor === 'true' || valor === '1';
}

export const env = {
  raizRepo: resolve(aqui, '..'),
  raizE2e: aqui,
  baseUrl: texto('E2E_BASE_URL', 'http://localhost:4200'),
  apiUrl: texto('E2E_API_URL', 'http://localhost:3000/api'),
  apiPort: texto('E2E_API_PORT', '3000'),
  databaseUrl: texto('E2E_DATABASE_URL'),
  mysqlAdminUser: texto('E2E_MYSQL_ADMIN_USER', 'root'),
  mysqlAdminPassword: texto('E2E_MYSQL_ADMIN_PASSWORD'),
  gerenciarServidores: ligado('E2E_MANAGE_SERVERS', true),
  resetarBanco: ligado('E2E_RESET_DB', true),
  geminiApiKey: texto('E2E_GEMINI_API_KEY'),
  googleMapsApiKey: texto('E2E_GOOGLE_MAPS_API_KEY'),
  ci: Boolean(process.env.CI),
};

/**
 * Trava de seguranca. Uma suite que cria, edita e APAGA registros nao pode
 * rodar contra o banco de producao por engano - e o `.env` do backend aponta
 * justamente para o Supabase de producao. Qualquer coisa que nao seja um MySQL
 * local com "e2e" no nome do banco derruba a execucao antes do primeiro teste.
 */
export function exigirBancoDeTeste(): void {
  const url = env.databaseUrl;
  if (!url) {
    throw new Error('E2E_DATABASE_URL nao definido. Copie e2e/.env.e2e.example para e2e/.env.e2e.');
  }
  if (!url.startsWith('mysql://')) {
    throw new Error(`E2E_DATABASE_URL precisa ser um MySQL local (mysql://). Recebido: ${url.split(':')[0]}://...`);
  }
  const destino = new URL(url);
  const hostLocal = ['localhost', '127.0.0.1', '::1', 'host.docker.internal'].includes(destino.hostname);
  if (!hostLocal) {
    throw new Error(`E2E_DATABASE_URL aponta para o host remoto "${destino.hostname}". A suite E2E so roda contra banco local.`);
  }
  const nomeDoBanco = destino.pathname.replace(/^\//, '');
  if (!/e2e|test/i.test(nomeDoBanco)) {
    throw new Error(`O banco "${nomeDoBanco}" nao parece ser de teste. Use um nome contendo "e2e" ou "test".`);
  }
}
