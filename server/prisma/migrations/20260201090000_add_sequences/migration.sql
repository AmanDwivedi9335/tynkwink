-- CreateTable
CREATE TABLE `Sequence` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `triggerType` ENUM('MANUAL','ON_LEAD_CREATED','ON_STAGE_CHANGED') NOT NULL,
  `triggerConfig` JSON NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Sequence_tenantId_isActive_idx`(`tenantId`,`isActive`),
  INDEX `Sequence_tenantId_triggerType_idx`(`tenantId`,`triggerType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SequenceStep` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `sequenceId` VARCHAR(191) NOT NULL,
  `stepOrder` INT NOT NULL,
  `delayValue` INT NOT NULL,
  `delayUnit` ENUM('MINUTES','HOURS','DAYS') NOT NULL,
  `actionType` ENUM('EMAIL','WHATSAPP','CALL_REMINDER') NOT NULL,
  `actionConfig` JSON NOT NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SequenceStep_tenantId_sequenceId_stepOrder_key`(`tenantId`,`sequenceId`,`stepOrder`),
  INDEX `SequenceStep_tenantId_idx`(`tenantId`),
  INDEX `SequenceStep_sequenceId_isEnabled_idx`(`sequenceId`,`isEnabled`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SequenceEnrollment` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `sequenceId` VARCHAR(191) NOT NULL,
  `leadId` VARCHAR(191) NOT NULL,
  `enrolledById` VARCHAR(191) NULL,
  `status` ENUM('ACTIVE','PAUSED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  `pausedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `currentStepOrder` INT NOT NULL DEFAULT 0,
  `dedupeKey` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `SequenceEnrollment_tenantId_sequenceId_status_idx`(`tenantId`,`sequenceId`,`status`),
  INDEX `SequenceEnrollment_tenantId_leadId_idx`(`tenantId`,`leadId`),
  INDEX `SequenceEnrollment_tenantId_dedupeKey_idx`(`tenantId`,`dedupeKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SequenceJob` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `enrollmentId` VARCHAR(191) NOT NULL,
  `sequenceId` VARCHAR(191) NOT NULL,
  `leadId` VARCHAR(191) NOT NULL,
  `stepId` VARCHAR(191) NOT NULL,
  `stepOrder` INT NOT NULL,
  `actionType` ENUM('EMAIL','WHATSAPP','CALL_REMINDER') NOT NULL,
  `actionConfig` JSON NOT NULL,
  `scheduledFor` DATETIME(3) NOT NULL,
  `status` ENUM('SCHEDULED','RUNNING','SUCCESS','FAILED','CANCELLED','SKIPPED') NOT NULL DEFAULT 'SCHEDULED',
  `attemptCount` INT NOT NULL DEFAULT 0,
  `maxAttempts` INT NOT NULL DEFAULT 3,
  `lastError` TEXT NULL,
  `lockedAt` DATETIME(3) NULL,
  `lockToken` VARCHAR(191) NULL,
  `providerMessageId` VARCHAR(191) NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SequenceJob_idempotencyKey_key`(`idempotencyKey`),
  INDEX `SequenceJob_tenantId_status_scheduledFor_idx`(`tenantId`,`status`,`scheduledFor`),
  INDEX `SequenceJob_tenantId_enrollmentId_idx`(`tenantId`,`enrollmentId`),
  INDEX `SequenceJob_tenantId_sequenceId_idx`(`tenantId`,`sequenceId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SequenceExecutionLog` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `jobId` VARCHAR(191) NOT NULL,
  `sequenceId` VARCHAR(191) NOT NULL,
  `enrollmentId` VARCHAR(191) NOT NULL,
  `stepId` VARCHAR(191) NOT NULL,
  `actionType` ENUM('EMAIL','WHATSAPP','CALL_REMINDER') NOT NULL,
  `status` ENUM('SUCCESS','FAILED') NOT NULL,
  `requestPayload` JSON NOT NULL,
  `responsePayload` JSON NOT NULL,
  `errorMessage` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `SequenceExecutionLog_tenantId_createdAt_idx`(`tenantId`,`createdAt`),
  INDEX `SequenceExecutionLog_tenantId_jobId_idx`(`tenantId`,`jobId`),
  INDEX `SequenceExecutionLog_tenantId_sequenceId_idx`(`tenantId`,`sequenceId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Sequence`
  ADD CONSTRAINT `Sequence_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sequence`
  ADD CONSTRAINT `Sequence_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceStep`
  ADD CONSTRAINT `SequenceStep_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceStep`
  ADD CONSTRAINT `SequenceStep_sequenceId_fkey`
  FOREIGN KEY (`sequenceId`) REFERENCES `Sequence`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceEnrollment`
  ADD CONSTRAINT `SequenceEnrollment_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceEnrollment`
  ADD CONSTRAINT `SequenceEnrollment_sequenceId_fkey`
  FOREIGN KEY (`sequenceId`) REFERENCES `Sequence`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceEnrollment`
  ADD CONSTRAINT `SequenceEnrollment_leadId_fkey`
  FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceEnrollment`
  ADD CONSTRAINT `SequenceEnrollment_enrolledById_fkey`
  FOREIGN KEY (`enrolledById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceJob`
  ADD CONSTRAINT `SequenceJob_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceJob`
  ADD CONSTRAINT `SequenceJob_enrollmentId_fkey`
  FOREIGN KEY (`enrollmentId`) REFERENCES `SequenceEnrollment`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceJob`
  ADD CONSTRAINT `SequenceJob_sequenceId_fkey`
  FOREIGN KEY (`sequenceId`) REFERENCES `Sequence`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceJob`
  ADD CONSTRAINT `SequenceJob_leadId_fkey`
  FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceJob`
  ADD CONSTRAINT `SequenceJob_stepId_fkey`
  FOREIGN KEY (`stepId`) REFERENCES `SequenceStep`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceExecutionLog`
  ADD CONSTRAINT `SequenceExecutionLog_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceExecutionLog`
  ADD CONSTRAINT `SequenceExecutionLog_jobId_fkey`
  FOREIGN KEY (`jobId`) REFERENCES `SequenceJob`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceExecutionLog`
  ADD CONSTRAINT `SequenceExecutionLog_sequenceId_fkey`
  FOREIGN KEY (`sequenceId`) REFERENCES `Sequence`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceExecutionLog`
  ADD CONSTRAINT `SequenceExecutionLog_enrollmentId_fkey`
  FOREIGN KEY (`enrollmentId`) REFERENCES `SequenceEnrollment`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceExecutionLog`
  ADD CONSTRAINT `SequenceExecutionLog_stepId_fkey`
  FOREIGN KEY (`stepId`) REFERENCES `SequenceStep`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
