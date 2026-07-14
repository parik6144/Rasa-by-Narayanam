-- Set default min-billable guest range on all add-ons (admin can still edit per row)
UPDATE `addon` SET `guestRange` = 500 WHERE `guestRange` = 0 OR `guestRange` IS NULL;
-- Force all rows to 500 if you want a full reset on deploy:
-- UPDATE `addon` SET `guestRange` = 500;
