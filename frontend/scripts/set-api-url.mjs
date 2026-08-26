// Escreve o endereço da API no environment de produção a partir da variável API_URL.
// Roda automaticamente antes de "npm run build" (script prebuild).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', 'src', 'environments', 'environment.prod.ts');
const apiUrl = (process.env.API_URL ?? '').trim().replace(/\/$/, '');

const current = readFileSync(target, 'utf8');
const updated = current.replace(/apiUrl: '[^']*'/, `apiUrl: '${apiUrl}'`);
writeFileSync(target, updated);

if (apiUrl) {
  console.log(`[api-url] build de produção apontando para ${apiUrl}`);
} else {
  console.warn('[api-url] API_URL não definida: o app vai chamar a API na mesma origem do site.');
}
