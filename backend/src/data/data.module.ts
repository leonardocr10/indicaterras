import { Module } from '@nestjs/common';
import { DataStoreService } from './data-store.service';
import { PrismaService } from './prisma.service';
import { FileStorageService } from './file-storage.service';
import { ProblemMatcherService } from './problem-matcher.service';
import { CatalogService } from './catalog.service';

@Module({
  providers: [PrismaService, DataStoreService, FileStorageService, ProblemMatcherService, CatalogService],
  exports: [PrismaService, DataStoreService, FileStorageService, ProblemMatcherService, CatalogService],
})
export class DataModule {}
