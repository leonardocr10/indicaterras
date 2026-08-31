import { mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env } from '../env';

/**
 * Arquivos para os testes de upload (item 19). Sao gerados em vez de versionados
 * para o repositorio nao carregar um binario de 12 MB so para provar um limite.
 */
const PASTA = resolve(env.raizE2e, 'support/generated');

export const ARQUIVOS = {
  imagemValida: resolve(PASTA, 'foto-valida.png'),
  imagemValida2: resolve(PASTA, 'foto-valida-2.png'),
  imagemGrande: resolve(PASTA, 'foto-grande.png'),
  formatoInvalido: resolve(PASTA, 'documento.txt'),
  pdfInvalido: resolve(PASTA, 'documento.pdf'),
};

/** PNG 1x1 valido, o menor arquivo que passa por um validador de imagem real. */
const PNG_MINIMO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function existe(caminho: string) {
  try {
    await stat(caminho);
    return true;
  } catch {
    return false;
  }
}

export async function garantirArquivosDeApoio() {
  await mkdir(PASTA, { recursive: true });

  if (!(await existe(ARQUIVOS.imagemValida))) await writeFile(ARQUIVOS.imagemValida, PNG_MINIMO);
  if (!(await existe(ARQUIVOS.imagemValida2))) await writeFile(ARQUIVOS.imagemValida2, PNG_MINIMO);

  // Maior que os limites do backend (5 MB em avatar/comentario, 25 MB em midia
  // de solicitacao). 12 MB cobre os menores sem inchar demais o disco.
  if (!(await existe(ARQUIVOS.imagemGrande))) {
    const cabecalho = PNG_MINIMO;
    const enchimento = Buffer.alloc(12 * 1024 * 1024, 0);
    await writeFile(ARQUIVOS.imagemGrande, Buffer.concat([cabecalho, enchimento]));
  }

  if (!(await existe(ARQUIVOS.formatoInvalido))) {
    await writeFile(ARQUIVOS.formatoInvalido, 'Arquivo de texto: o app deve recusar este formato.');
  }
  if (!(await existe(ARQUIVOS.pdfInvalido))) {
    await writeFile(ARQUIVOS.pdfInvalido, '%PDF-1.4\n% arquivo falso para teste de formato invalido\n');
  }
}
