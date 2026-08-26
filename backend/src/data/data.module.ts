import { Module } from '@nestjs/common';
import { DataStoreService } from './data-store.service';
import { PrismaService } from './prisma.service';
import { SupabaseRestService } from './supabase-rest.service';

@Module({
  providers: [PrismaService, SupabaseRestService, DataStoreService],
  exports: [PrismaService, SupabaseRestService, DataStoreService],
})
export class DataModule {}
