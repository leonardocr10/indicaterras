import mysql from 'mysql2/promise';
import { env, exigirBancoDeTeste } from '../env';

/**
 * Leituras diretas no banco de teste.
 *
 * Usado com parcimonia: um teste E2E deve passar pela interface. A excecao aqui
 * e o codigo de confirmacao de e-mail, que so existe dentro de uma mensagem
 * enviada por SMTP. Sem le-lo do banco, o cadastro de um usuario novo nao teria
 * como ser concluido num teste automatizado - e o cadastro e o primeiro passo
 * da jornada.
 *
 * A mesma trava de sempre se aplica: so conecta em MySQL local com "e2e" ou
 * "test" no nome do banco.
 */
async function conectar() {
  exigirBancoDeTeste();
  return mysql.createConnection(env.databaseUrl);
}

/**
 * Codigo de confirmacao mais recente e ainda valido de um e-mail.
 *
 * Devolve null quando nao ha nenhum - o chamador decide se isso e falha.
 */
export async function buscarCodigoDeVerificacao(email: string): Promise<string | null> {
  const conexao = await conectar();
  try {
    const [linhas] = await conexao.execute(
      `SELECT v.code AS codigo
         FROM email_verifications v
         JOIN User u ON u.id = v.userId
        WHERE u.email = ?
          AND v.usedAt IS NULL
        ORDER BY v.createdAt DESC
        LIMIT 1`,
      [email],
    );
    const registros = linhas as Array<{ codigo: string }>;
    return registros.length ? registros[0].codigo : null;
  } finally {
    await conexao.end();
  }
}

/**
 * Espera o codigo aparecer: o envio acontece depois da resposta do cadastro,
 * entao ele pode nao existir no instante seguinte ao clique.
 */
export async function esperarCodigoDeVerificacao(email: string, tentativas = 20): Promise<string> {
  for (let tentativa = 0; tentativa < tentativas; tentativa += 1) {
    const codigo = await buscarCodigoDeVerificacao(email);
    if (codigo) return codigo;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Nenhum codigo de confirmacao foi gerado para ${email}.`);
}
