import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

export interface ArquivoEnviado {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

const BUCKET = 'uploads';

/**
 * Guarda as fotos enviadas. Com o Supabase configurado, elas vao para o Storage
 * e sobrevivem a qualquer deploy; sem ele, caem no disco local (uso em desenvolvimento).
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private bucketPronto = false;

  constructor(config: ConfigService) {
    this.baseUrl = String(config.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
    this.apiKey = String(config.get('SUPABASE_SECRET_KEY') ?? '');
  }

  get remoto() {
    return Boolean(this.baseUrl && this.apiKey);
  }

  async salvar(pasta: string, arquivo: ArquivoEnviado): Promise<string> {
    const nome = this.gerarNome(pasta, arquivo.originalname);
    if (!this.remoto) return this.salvarNoDisco(pasta, nome, arquivo);

    await this.garantirBucket();
    const resposta = await fetch(`${this.baseUrl}/storage/v1/object/${BUCKET}/${pasta}/${nome}`, {
      method: 'POST',
      headers: {
        apikey: this.apiKey,
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': arquivo.mimetype || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: new Uint8Array(arquivo.buffer),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text();
      this.logger.error(`Falha ao enviar ${pasta}/${nome} para o Storage: ${detalhe}`);
      throw new ServiceUnavailableException('Não foi possível guardar a foto agora. Tente novamente.');
    }
    return `${this.baseUrl}/storage/v1/object/public/${BUCKET}/${pasta}/${nome}`;
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

  private async garantirBucket() {
    if (this.bucketPronto) return;
    const resposta = await fetch(`${this.baseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        apikey: this.apiKey,
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 10 * 1024 * 1024 }),
    });
    // 409 significa que o bucket ja existe, o que tambem serve
    if (resposta.ok || resposta.status === 409) {
      this.bucketPronto = true;
      return;
    }
    this.logger.warn(`Não foi possível preparar o bucket de fotos: ${await resposta.text()}`);
  }
}
