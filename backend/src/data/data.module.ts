import { Module } from '@nestjs/common';
import { DataStoreService } from './data-store.service';
import { PrismaService } from './prisma.service';
import { FileStorageService } from './file-storage.service';
import { ProblemMatcherService } from './problem-matcher.service';

@Module({
  providers: [PrismaService, DataStoreService, FileStorageService, ProblemMatcherService],
  exports: [PrismaService, DataStoreService, FileStorageService, ProblemMatcherService],
})
export class DataModule {}
