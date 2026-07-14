-- Staff RBAC: soft-deactivate users without deleting
ALTER TABLE `user` ADD COLUMN `isActive` TINYINT(1) NOT NULL DEFAULT 1;
