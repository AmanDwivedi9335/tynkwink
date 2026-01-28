-- CreateTable
CREATE TABLE `SmtpCredential` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `host` VARCHAR(191) NOT NULL,
  `port` INT NOT NULL,
  `secure` BOOLEAN NOT NULL DEFAULT false,
  `username` VARCHAR(191) NOT NULL,
  `encryptedPassword` TEXT NOT NULL,
  `fromEmail` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SmtpCredential_tenantId_userId_key`(`tenantId`, `userId`),
  INDEX `SmtpCredential_tenantId_idx`(`tenantId`),
  INDEX `SmtpCredential_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SmtpMessageLog` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `smtpCredentialId` VARCHAR(191) NOT NULL,
  `toEmail` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `status` ENUM('SUCCESS', 'FAILED') NOT NULL,
  `errorMessage` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `SmtpMessageLog_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
  INDEX `SmtpMessageLog_tenantId_userId_idx`(`tenantId`, `userId`),
  INDEX `SmtpMessageLog_smtpCredentialId_createdAt_idx`(`smtpCredentialId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SmtpCredential`
  ADD CONSTRAINT `SmtpCredential_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmtpCredential`
  ADD CONSTRAINT `SmtpCredential_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmtpMessageLog`
  ADD CONSTRAINT `SmtpMessageLog_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmtpMessageLog`
  ADD CONSTRAINT `SmtpMessageLog_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmtpMessageLog`
  ADD CONSTRAINT `SmtpMessageLog_smtpCredentialId_fkey`
  FOREIGN KEY (`smtpCredentialId`) REFERENCES `SmtpCredential`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
