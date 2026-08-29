import { Module } from '@nestjs/common';
import { DataStoreService } from './data-store.service';
import { PrismaService } from './prisma.service';
import { FileStorageService } from './file-storage.service';
import { ProblemMatcherService } from './problem-matcher.service';
import { CatalogService } from './catalog.service';
import { NearbyProfessionalsService } from './nearby-professionals.service';
import { ProfessionalDashboardService } from './professional-dashboard.service';

@Module({
  providers: [PrismaService, DataStoreService, FileStorageService, ProblemMatcherService, CatalogService, NearbyProfessionalsService, ProfessionalDashboardService],
  exports: [PrismaService, DataStoreService, FileStorageService, ProblemMatcherService, CatalogService, NearbyProfessionalsService, ProfessionalDashboardService],
})
export class DataModule {}
