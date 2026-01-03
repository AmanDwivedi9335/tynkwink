/*
  Warnings:

  - You are about to drop the `TenantSetting` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `TenantSetting` DROP FOREIGN KEY `TenantSetting_tenantId_fkey`;

-- DropTable
DROP TABLE `TenantSetting`;

-- CreateTable
CREATE TABLE `TenantSettings` (
    `tenantId` VARCHAR(191) NOT NULL,
    `inboundSecret` VARCHAR(191) NOT NULL,
    `approvalDigestFrequencyMinutes` INTEGER NOT NULL DEFAULT 60,
    `defaultLeadOwnerUserId` VARCHAR(191) NULL,
    `openaiEncryptedApiKey` TEXT NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`tenantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TenantSettings` ADD CONSTRAINT `TenantSettings_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
