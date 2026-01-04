ALTER TABLE `GmailSyncState`
  ADD COLUMN `lastCheckedCount` INT NOT NULL DEFAULT 0,
  ADD COLUMN `lastMatchedCount` INT NOT NULL DEFAULT 0,
  ADD COLUMN `lastMatchedRulesJson` JSON NULL;
