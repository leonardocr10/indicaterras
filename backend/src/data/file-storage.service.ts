import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

export interface ArquivoEnviado {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/**
 * Guarda as fotos enviadas direto no disco do servidor, em backend/uploads.
 * O Nginx serve essa pasta como estática e ela nao entra no Git.
 */
@Injectable()
export class FileStorageService {
  async salvar(pasta: string, arquivo: ArquivoEnviado): Promise<string> {
    const nome = this.gerarNome(pasta, arquivo.originalname);
    return this.salvarNoDisco(pasta, nome, arquivo);
  }

  async salvarVarios(pasta: string, arquivos: ArquivoEnviado[]): Promise<string[]> {
    const urls: string[] = [];
    for (const arquivo of arquivos) urls.push(await this.salvar(pasta, arquivo));
    return urls;
  }

  private gerarNome(pasta: string, original: string) {
    const extensao = extname(original || '').toLowerCase() || '.jpg';
    const prefixo = pasta.replace(/s$/, '');
    return `${prefixo}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}${extensao}`;
  }

  private salvarNoDisco(pasta: string, nome: string, arquivo: ArquivoEnviado) {
    const destino = join(process.cwd(), 'uploads', pasta);
    if (!existsSync(destino)) mkdirSync(destino, { recursive: true });
    writeFileSync(join(destino, nome), arquivo.buffer);
    return `/uploads/${pasta}/${nome}`;
  }
}
