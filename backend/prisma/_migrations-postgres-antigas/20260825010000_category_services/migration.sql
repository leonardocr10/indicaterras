ALTER TABLE "Category"
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "category_services" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "icon" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "category_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "category_service_aliases" (
  "id" TEXT NOT NULL,
  "categoryServiceId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "normalizedAlias" TEXT NOT NULL,
  CONSTRAINT "category_service_aliases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_services" (
  "id" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "categoryServiceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "professional_services_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "category_services_categoryId_slug_key" ON "category_services"("categoryId", "slug");
CREATE INDEX "category_services_categoryId_active_displayOrder_idx" ON "category_services"("categoryId", "active", "displayOrder");
CREATE UNIQUE INDEX "category_service_aliases_categoryServiceId_normalizedAlias_key" ON "category_service_aliases"("categoryServiceId", "normalizedAlias");
CREATE INDEX "category_service_aliases_normalizedAlias_idx" ON "category_service_aliases"("normalizedAlias");
CREATE UNIQUE INDEX "professional_services_professionalId_categoryServiceId_key" ON "professional_services"("professionalId", "categoryServiceId");
CREATE INDEX "professional_services_categoryServiceId_idx" ON "professional_services"("categoryServiceId");

ALTER TABLE "category_services" ADD CONSTRAINT "category_services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_service_aliases" ADD CONSTRAINT "category_service_aliases_categoryServiceId_fkey" FOREIGN KEY ("categoryServiceId") REFERENCES "category_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_categoryServiceId_fkey" FOREIGN KEY ("categoryServiceId") REFERENCES "category_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
