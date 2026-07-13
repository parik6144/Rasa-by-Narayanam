-- Booking snapshot columns need LONGTEXT (menu JSON exceeds VARCHAR(191))
-- Safe to re-run: ignores errors if already altered (run statements individually if needed)

ALTER TABLE `booking` MODIFY COLUMN `menuSnapshot` LONGTEXT NULL;
ALTER TABLE `booking` MODIFY COLUMN `addonsSnapshot` LONGTEXT NULL;
ALTER TABLE `booking` MODIFY COLUMN `customDishes` LONGTEXT NULL;
ALTER TABLE `booking` MODIFY COLUMN `notes` TEXT NULL;
