import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { ResourcesController } from './resources.controller';

@Module({
  imports: [DataModule],
  controllers: [ResourcesController],
})
export class ResourcesModule {}
