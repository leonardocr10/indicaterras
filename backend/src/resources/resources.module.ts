import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { ResourcesController } from './resources.controller';
import { CommunicationsService } from './communications.service';

@Module({
  imports: [DataModule],
  controllers: [ResourcesController],
  providers: [CommunicationsService],
})
export class ResourcesModule {}
