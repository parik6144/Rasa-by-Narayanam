-- Addon minimum billable guest range (per_guest pricing floor)
-- Safe default 0 = charge actual guest count (previous behaviour)
ALTER TABLE `addon` ADD COLUMN `guestRange` INT NOT NULL DEFAULT 0;
