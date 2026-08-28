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
    return (await this.salvarComDestino(pasta, [], arquivo)).url;
  }

  async salvarVarios(pasta: string, arquivos: ArquivoEnviado[]): Promise<string[]> {
    const urls: string[] = [];
    for (const arquivo of arquivos) urls.push(await this.salvar(pasta, arquivo));
    return urls;
  }

  async salvarComDestino(pasta: string, subpastas: string[], arquivo: ArquivoEnviado): Promise<{ url: string; storagePath: string }> {
    const nome = this.gerarNome(pasta, arquivo.originalname);
    return this.salvarNoDisco(pasta, subpastas, nome, arquivo);
  }

  async salvarVariosComDestino(pasta: string, subpastas: string[], arquivos: ArquivoEnviado[]) {
    const salvos: Array<{ url: string; storagePath: string }> = [];
    for (const arquivo of arquivos) salvos.push(await this.salvarComDestino(pasta, subpastas, arquivo));
    return salvos;
  }

  private gerarNome(pasta: string, original: string) {
    const extensao = extname(original || '').toLowerCase() || '.jpg';
    const prefixo = pasta.replace(/s$/, '');
    return `${prefixo}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}${extensao}`;
  }

  private salvarNoDisco(pasta: string, subpastas: string[], nome: string, arquivo: ArquivoEnviado) {
    const segmentos = subpastas.map((segmento) => this.sanitizarSegmento(segmento)).filter(Boolean);
    const destino = join(process.cwd(), 'uploads', pasta, ...segmentos);
    if (!existsSync(destino)) mkdirSync(destino, { recursive: true });
    writeFileSync(join(destino, nome), arquivo.buffer);
    const relativePath = [pasta, ...segmentos, nome].join('/');
    return {
      url: `/uploads/${relativePath}`,
      storagePath: relativePath,
    };
  }

  private sanitizarSegmento(value: string) {
    return String(value ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
