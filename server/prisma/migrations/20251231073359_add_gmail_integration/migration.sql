/*
  Warnings:

  - You are about to drop the `GmailIntegration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GmailIntegrationAccess` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GmailRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GmailSyncState` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeadApprovalToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeadInbox` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `GmailIntegration` DROP FOREIGN KEY `GmailIntegration_createdByUserId_fkey`;

-- DropForeignKey
ALTER TABLE `GmailIntegration` DROP FOREIGN KEY `GmailIntegration_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `GmailIntegrationAccess` DROP FOREIGN KEY `GmailIntegrationAccess_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `GmailIntegrationAccess` DROP FOREIGN KEY `GmailIntegrationAccess_userId_fkey`;

-- DropForeignKey
ALTER TABLE `GmailRule` DROP FOREIGN KEY `GmailRule_integrationId_fkey`;

-- DropForeignKey
ALTER TABLE `GmailRule` DROP FOREIGN KEY `GmailRule_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `GmailSyncState` DROP FOREIGN KEY `GmailSyncState_integrationId_fkey`;

-- DropForeignKey
ALTER TABLE `LeadApprovalToken` DROP FOREIGN KEY `LeadApprovalToken_leadInboxId_fkey`;

-- DropForeignKey
ALTER TABLE `LeadInbox` DROP FOREIGN KEY `LeadInbox_integrationId_fkey`;

-- DropForeignKey
ALTER TABLE `LeadInbox` DROP FOREIGN KEY `LeadInbox_tenantId_fkey`;

-- DropTable
DROP TABLE `GmailIntegration`;

-- DropTable
DROP TABLE `GmailIntegrationAccess`;

-- DropTable
DROP TABLE `GmailRule`;

-- DropTable
DROP TABLE `GmailSyncState`;

-- DropTable
DROP TABLE `LeadApprovalToken`;

-- DropTable
DROP TABLE `LeadInbox`;
