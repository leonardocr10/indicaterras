CREATE TABLE `category_groups` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `icon` TEXT NULL,
    `description` TEXT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `category_groups_name_key`(`name`),
    UNIQUE INDEX `category_groups_slug_key`(`slug`),
    INDEX `category_groups_active_displayOrder_idx`(`active`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Category` ADD COLUMN `groupId` VARCHAR(191) NULL;
CREATE INDEX `Category_groupId_active_displayOrder_idx` ON `Category`(`groupId`, `active`, `displayOrder`);
ALTER TABLE `Category` ADD CONSTRAINT `Category_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `category_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
