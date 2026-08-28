-- CreateTable
CREATE TABLE `ai_settings` (
    `id` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `provider` VARCHAR(50) NOT NULL DEFAULT 'gemini',
    `model` VARCHAR(120) NOT NULL DEFAULT 'gemini-2.5-flash-lite',
    `apiKey` TEXT NULL,
    `endpointUrl` VARCHAR(191) NULL,
    `temperature` DECIMAL(4, 2) NOT NULL DEFAULT 0.20,
    `maxOutputTokens` INTEGER NOT NULL DEFAULT 500,
    `timeoutMs` INTEGER NOT NULL DEFAULT 15000,
    `problemAnalysisEnabled` BOOLEAN NOT NULL DEFAULT true,
    `categorySuggestionEnabled` BOOLEAN NOT NULL DEFAULT true,
    `serviceSuggestionEnabled` BOOLEAN NOT NULL DEFAULT true,
    `summaryEnabled` BOOLEAN NOT NULL DEFAULT true,
    `clarificationEnabled` BOOLEAN NOT NULL DEFAULT true,
    `fallbackKeywordsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `minimumConfidence` DECIMAL(5, 2) NOT NULL DEFAULT 0.75,
    `autoApplyConfidence` DECIMAL(5, 2) NOT NULL DEFAULT 0.85,
    `dailyLimit` INTEGER NULL DEFAULT 500,
    `monthlyLimit` INTEGER NULL DEFAULT 10000,
    `maxInputLength` INTEGER NOT NULL DEFAULT 500,
    `homeTitle` VARCHAR(191) NULL,
    `homeSubtitle` VARCHAR(191) NULL,
    `homePlaceholder` VARCHAR(191) NULL,
    `homeHelperText` VARCHAR(191) NULL,
    `successMessage` VARCHAR(191) NULL,
    `lowConfidenceMessage` VARCHAR(191) NULL,
    `fallbackMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_analysis_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `provider` VARCHAR(50) NULL,
    `model` VARCHAR(120) NULL,
    `inputText` TEXT NOT NULL,
    `normalizedText` TEXT NULL,
    `matchedCategoryId` VARCHAR(191) NULL,
    `confidence` DECIMAL(5, 2) NULL,
    `usedAi` BOOLEAN NOT NULL DEFAULT false,
    `usedFallback` BOOLEAN NOT NULL DEFAULT false,
    `needsClarification` BOOLEAN NOT NULL DEFAULT false,
    `responseJson` JSON NULL,
    `status` VARCHAR(40) NOT NULL DEFAULT 'success',
    `errorMessage` TEXT NULL,
    `latencyMs` INTEGER NULL,
    `adminFeedback` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_analysis_logs_createdAt_idx`(`createdAt`),
    INDEX `ai_analysis_logs_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_analysis_log_services` (
    `id` VARCHAR(191) NOT NULL,
    `logId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `score` INTEGER NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `ai_analysis_log_services_logId_idx`(`logId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_analysis_log_services` ADD CONSTRAINT `ai_analysis_log_services_logId_fkey` FOREIGN KEY (`logId`) REFERENCES `ai_analysis_logs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
