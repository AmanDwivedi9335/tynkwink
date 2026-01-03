-- Ensure Gmail integration tables exist without failing on reruns.
CREATE TABLE IF NOT EXISTS `GmailIntegration` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `gmailAddress` VARCHAR(191) NOT NULL,
    `encryptedRefreshToken` TEXT NOT NULL,
    `scopes` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'REVOKED', 'ERROR') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `GmailIntegration_tenantId_gmailAddress_key`(`tenantId`, `gmailAddress`),
    INDEX `GmailIntegration_tenantId_status_idx`(`tenantId`, `status`),
    PRIMARY KEY (`id`),
    CONSTRAINT `GmailIntegration_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `GmailIntegration_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `GmailIntegrationAccess` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `GmailIntegrationAccess_tenantId_userId_key`(`tenantId`, `userId`),
    INDEX `GmailIntegrationAccess_tenantId_userId_idx`(`tenantId`, `userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `GmailIntegrationAccess_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `GmailIntegrationAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
