-- Chat typing columns (run if not already added)
ALTER TABLE `conversation` ADD COLUMN `typingBy` VARCHAR(191) NULL;
ALTER TABLE `conversation` ADD COLUMN `typingUntil` DATETIME(3) NULL;
