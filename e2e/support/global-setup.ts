import { request, type FullConfig } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { env, exigirBancoDeTeste } from '../env';
import { CONTAS } from '../fixtures/contas';
import { garantirArquivosDeApoio } from './arquivos';

/**
 * Roda uma vez, antes de tudo (itens 38 e 39).
 *
 * 1. Confirma que o alvo e um banco de teste local.
 * 2. Reseta o banco e recarrega o seed E2E, para a suite ser repetivel.
 * 3. Gera os arquivos usados nos testes de upload.
 * 4. Confirma que a API no ar e realmente a de teste - a checagem que impede
 *    a suite de rodar contra o Supabase de producao por engano.
 */
export default async function globalSetup(_config: FullConfig) {
  if (!env.gerenciarServidores) {
    console.log('[e2e] E2E_MANAGE_SERVERS=false: usando os servidores que ja estao no ar.');
  } else {
    exigirBancoDeTeste();
  }

  await garantirArquivosDeApoio();

  if (env.resetarBanco && env.gerenciarServidores) {
    console.log('[e2e] Resetando o banco de teste e recarregando o seed...');
    const resultado = spawnSync('node', ['scripts/reset-db.mjs'], {
      cwd: env.raizE2e,
      stdio: 'inherit',
      shell: true,
    });
    if (resultado.status !== 0) {
      throw new Error('Falhou ao preparar o banco de teste. Rode `npm run db:e2e:setup` primeiro.');
    }
  }

  await confirmarApiDeTeste();
}

/**
 * Prova que a API respondendo esta ligada ao banco semeado: so o seed E2E cria
 * `admin.e2e@example.test`. Se este login falhar, ou a API subiu contra outro
 * banco ou o seed nao rodou - em ambos os casos e melhor parar aqui do que
 * deixar um teste destrutivo tocar dados que nao deveria.
 */
async function confirmarApiDeTeste() {
  const contexto = await request.newContext();
  try {
    const resposta = await contexto.post(`${env.apiUrl}/auth/login`, {
      data: { email: CONTAS.admin.email, password: CONTAS.admin.senha, rememberMe: true },
      failOnStatusCode: false,
    });
    if (!resposta.ok()) {
      throw new Error(
        `A API em ${env.apiUrl} nao reconhece o admin do seed E2E (${resposta.status()}).\n` +
          'Ou a API esta apontada para outro banco, ou o seed nao rodou.\n' +
          'Rode `npm run db:e2e:setup` e confira o E2E_DATABASE_URL.',
      );
    }
    console.log('[e2e] API de teste confirmada.');
  } finally {
    await contexto.dispose();
  }
}
