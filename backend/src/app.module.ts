import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DataModule } from './data/data.module';
import { ResourcesModule } from './resources/resources.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    DataModule,
    AuthModule,
    // AiModule vem antes de ResourcesModule: o Nest resolve rotas na ordem de registro
    // e o curinga `admin/:resource` capturaria `admin/ai-settings` se viesse primeiro.
    AiModule,
    ResourcesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
