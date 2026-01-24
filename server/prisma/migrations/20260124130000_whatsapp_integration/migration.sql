-- CreateTable
CREATE TABLE `WhatsAppIntegration` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `businessAccountId` VARCHAR(191) NULL,
  `phoneNumberId` VARCHAR(191) NOT NULL,
  `displayPhoneNumber` VARCHAR(191) NULL,
  `encryptedAccessToken` TEXT NOT NULL,
  `appId` VARCHAR(191) NULL,
  `webhookVerifyToken` VARCHAR(191) NULL,
  `status` ENUM('ACTIVE','ERROR','DISCONNECTED') NOT NULL DEFAULT 'ACTIVE',
  `lastValidatedAt` DATETIME(3) NULL,
  `lastValidationError` TEXT NULL,
  `createdByUserId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `WhatsAppIntegration_tenantId_key`(`tenantId`),
  INDEX `WhatsAppIntegration_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppMessage` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `integrationId` VARCHAR(191) NOT NULL,
  `leadId` VARCHAR(191) NULL,
  `direction` ENUM('OUTBOUND','INBOUND') NOT NULL,
  `status` ENUM('QUEUED','SENT','FAILED') NOT NULL DEFAULT 'QUEUED',
  `recipientPhone` VARCHAR(191) NOT NULL,
  `messageBody` TEXT NOT NULL,
  `providerMessageId` VARCHAR(191) NULL,
  `providerStatus` VARCHAR(191) NULL,
  `providerError` TEXT NULL,
  `metadataJson` JSON NULL,
  `sentByUserId` VARCHAR(191) NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `WhatsAppMessage_tenantId_createdAt_idx`(`tenantId`,`createdAt`),
  INDEX `WhatsAppMessage_integrationId_createdAt_idx`(`integrationId`,`createdAt`),
  INDEX `WhatsAppMessage_leadId_idx`(`leadId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WhatsAppIntegration`
  ADD CONSTRAINT `WhatsAppIntegration_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppIntegration`
  ADD CONSTRAINT `WhatsAppIntegration_createdByUserId_fkey`
  FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage`
  ADD CONSTRAINT `WhatsAppMessage_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage`
  ADD CONSTRAINT `WhatsAppMessage_integrationId_fkey`
  FOREIGN KEY (`integrationId`) REFERENCES `WhatsAppIntegration`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage`
  ADD CONSTRAINT `WhatsAppMessage_leadId_fkey`
  FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage`
  ADD CONSTRAINT `WhatsAppMessage_sentByUserId_fkey`
  FOREIGN KEY (`sentByUserId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
