-- Ensure Gmail tables exist in case a previous migration dropped them.
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

CREATE TABLE IF NOT EXISTS `GmailSyncState` (
    `integrationId` VARCHAR(191) NOT NULL,
    `lastHistoryId` VARCHAR(191) NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `errorCount` INTEGER NOT NULL DEFAULT 0,
    `lastError` VARCHAR(191) NULL,
    `backoffUntil` DATETIME(3) NULL,
    INDEX `GmailSyncState_lastSyncAt_idx`(`lastSyncAt`),
    PRIMARY KEY (`integrationId`),
    CONSTRAINT `GmailSyncState_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `GmailIntegration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `GmailRule` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `integrationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `conditionsJson` JSON NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `GmailRule_tenantId_integrationId_idx`(`tenantId`, `integrationId`),
    INDEX `GmailRule_tenantId_isActive_idx`(`tenantId`, `isActive`),
    PRIMARY KEY (`id`),
    CONSTRAINT `GmailRule_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `GmailRule_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `GmailIntegration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `LeadInbox` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `integrationId` VARCHAR(191) NOT NULL,
    `gmailMessageId` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NULL,
    `from` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `snippet` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NOT NULL,
    `rawHeadersJson` JSON NOT NULL,
    `rawBodyText` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'IMPORTED', 'ERROR') NOT NULL DEFAULT 'PENDING',
    `detectedAssigneeHint` VARCHAR(191) NULL,
    `extractedPreviewJson` JSON NULL,
    `leadId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `LeadInbox_integrationId_gmailMessageId_key`(`integrationId`, `gmailMessageId`),
    INDEX `LeadInbox_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `LeadInbox_tenantId_receivedAt_idx`(`tenantId`, `receivedAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `LeadInbox_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `LeadInbox_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `GmailIntegration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `LeadApprovalToken` (
    `id` VARCHAR(191) NOT NULL,
    `leadInboxId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `action` ENUM('APPROVE', 'REJECT') NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `LeadApprovalToken_tenantId_leadInboxId_idx`(`tenantId`, `leadInboxId`),
    INDEX `LeadApprovalToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `LeadApprovalToken_leadInboxId_fkey` FOREIGN KEY (`leadInboxId`) REFERENCES `LeadInbox`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `GmailIntegration`
  MODIFY `encryptedRefreshToken` TEXT NOT NULL,
  MODIFY `scopes` TEXT NOT NULL;
