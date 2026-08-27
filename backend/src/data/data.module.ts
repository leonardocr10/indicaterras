import { Module } from '@nestjs/common';
import { DataStoreService } from './data-store.service';
import { PrismaService } from './prisma.service';
import { FileStorageService } from './file-storage.service';

@Module({
  providers: [PrismaService, DataStoreService, FileStorageService],
  exports: [PrismaService, DataStoreService, FileStorageService],
})
export class DataModule {}
