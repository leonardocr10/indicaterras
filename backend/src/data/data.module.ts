import { Module } from '@nestjs/common';
import { DataStoreService } from './data-store.service';
import { PrismaService } from './prisma.service';
import { SupabaseRestService } from './supabase-rest.service';
import { FileStorageService } from './file-storage.service';

@Module({
  providers: [PrismaService, SupabaseRestService, DataStoreService, FileStorageService],
  exports: [PrismaService, SupabaseRestService, DataStoreService, FileStorageService],
})
export class DataModule {}
