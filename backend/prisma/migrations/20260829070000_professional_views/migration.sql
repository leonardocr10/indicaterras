-- Visualizacoes do perfil publico, uma por visitante e por dia.
CREATE TABLE `professional_views` (
    `id` VARCHAR(191) NOT NULL,
    `professionalId` VARCHAR(191) NOT NULL,
    `viewerKey` VARCHAR(80) NOT NULL,
    `viewedOn` VARCHAR(10) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `professional_views_professionalId_viewerKey_viewedOn_key`(`professionalId`, `viewerKey`, `viewedOn`),
    INDEX `professional_views_professionalId_idx`(`professionalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `professional_views` ADD CONSTRAINT `professional_views_professionalId_fkey`
    FOREIGN KEY (`professionalId`) REFERENCES `Professional`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
