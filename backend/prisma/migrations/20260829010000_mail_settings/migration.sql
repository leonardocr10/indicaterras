-- Configuracao de SMTP pelo painel, para nao depender de variavel de ambiente.
CREATE TABLE `mail_settings` (
    `id` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `host` VARCHAR(191) NULL,
    `port` INTEGER NOT NULL DEFAULT 587,
    `secure` BOOLEAN NOT NULL DEFAULT true,
    `username` VARCHAR(191) NULL,
    `password` TEXT NULL,
    `fromName` VARCHAR(191) NULL,
    `fromEmail` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
