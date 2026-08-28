import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;
  const missing = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter((name) => !process.env[name]);
  if (missing.length) {
    // sem segredos próprios qualquer pessoa com o código consegue forjar um token
    throw new Error(`Defina ${missing.join(' e ')} nas variáveis de ambiente antes de subir em produção.`);
  }
}

async function bootstrap() {
  assertProductionSecrets();
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins.length ? allowedOrigins : true });
  // ServeStaticModule (os arquivos em /uploads) não é um controller, então nunca
  // ganha o prefixo /api sozinho - não precisa (e não deve) excluir "uploads/*"
  // aqui, senão os controllers de upload (POST /uploads/comments, /uploads/works)
  // ficam fora do /api junto, quebrando o link que o front chama.
  app.setGlobalPrefix('api', { exclude: ['docs'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('IndicaFácil API')
    .setDescription('API para conexão entre clientes e profissionais recomendados')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
