/*
  Warnings:

  - The values [PENDING_CONFIRMATION] on the enum `InboundDecision_action` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId,position]` on the table `LeadStage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Tenant` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `InboundDecision` DROP FOREIGN KEY `InboundDecision_inboundId_fkey`;

-- DropForeignKey
ALTER TABLE `InboundItem` DROP FOREIGN KEY `InboundItem_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `Lead` DROP FOREIGN KEY `Lead_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `LeadStage` DROP FOREIGN KEY `LeadStage_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `TenantSetting` DROP FOREIGN KEY `TenantSetting_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_tenantId_fkey`;

-- DropIndex
DROP INDEX `LeadStage_tenantId_position_idx` ON `LeadStage`;

-- DropIndex
DROP INDEX `User_tenantId_email_key` ON `User`;

-- DropIndex
DROP INDEX `User_tenantId_idx` ON `User`;

-- AlterTable
ALTER TABLE `InboundDecision` MODIFY `action` ENUM('IMPORTED', 'JUNK') NOT NULL;

-- AlterTable
ALTER TABLE `Tenant` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `slug` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `role`,
    DROP COLUMN `tenantId`;

-- CreateTable
CREATE TABLE `TenantUser` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPERADMIN', 'TENANT_ADMIN', 'SALES_ADMIN', 'SALES_EXECUTIVE') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TenantUser_tenantId_role_idx`(`tenantId`, `role`),
    INDEX `TenantUser_userId_role_idx`(`userId`, `role`),
    UNIQUE INDEX `TenantUser_tenantId_userId_key`(`tenantId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RefreshToken_userId_idx`(`userId`),
    INDEX `RefreshToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `InboundDecision_decidedAt_idx` ON `InboundDecision`(`decidedAt`);

-- CreateIndex
CREATE INDEX `InboundItem_createdAt_idx` ON `InboundItem`(`createdAt`);

-- CreateIndex
CREATE INDEX `Lead_tenantId_assignedTo_idx` ON `Lead`(`tenantId`, `assignedTo`);

-- CreateIndex
CREATE INDEX `LeadStage_tenantId_isDeleted_idx` ON `LeadStage`(`tenantId`, `isDeleted`);

-- CreateIndex
CREATE UNIQUE INDEX `LeadStage_tenantId_position_key` ON `LeadStage`(`tenantId`, `position`);

-- CreateIndex
CREATE UNIQUE INDEX `Tenant_slug_key` ON `Tenant`(`slug`);

-- CreateIndex
CREATE INDEX `Tenant_isActive_idx` ON `Tenant`(`isActive`);

-- CreateIndex
CREATE UNIQUE INDEX `User_email_key` ON `User`(`email`);

-- CreateIndex
CREATE INDEX `User_isActive_idx` ON `User`(`isActive`);

-- AddForeignKey
ALTER TABLE `TenantSetting` ADD CONSTRAINT `TenantSetting_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TenantUser` ADD CONSTRAINT `TenantUser_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TenantUser` ADD CONSTRAINT `TenantUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadStage` ADD CONSTRAINT `LeadStage_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InboundItem` ADD CONSTRAINT `InboundItem_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InboundDecision` ADD CONSTRAINT `InboundDecision_inboundId_fkey` FOREIGN KEY (`inboundId`) REFERENCES `InboundItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `InboundDecision` RENAME INDEX `InboundDecision_decidedBy_fkey` TO `InboundDecision_decidedBy_idx`;
