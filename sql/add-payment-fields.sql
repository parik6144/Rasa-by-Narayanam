-- Payment fields + site settings for Stripe / UPI QR
ALTER TABLE payment ADD COLUMN proofUrl VARCHAR(191) NULL;
ALTER TABLE payment ADD COLUMN note TEXT NULL;
ALTER TABLE payment ADD COLUMN confirmedBy VARCHAR(191) NULL;
ALTER TABLE payment ADD COLUMN confirmedAt DATETIME(3) NULL;
ALTER TABLE payment MODIFY COLUMN status VARCHAR(191) NOT NULL DEFAULT 'pending';
ALTER TABLE payment ADD INDEX payment_bookingId_status_idx (bookingId, status);
ALTER TABLE payment ADD INDEX payment_status_createdAt_idx (status, createdAt);

CREATE TABLE IF NOT EXISTS sitesettings (
  id VARCHAR(191) NOT NULL,
  upiId VARCHAR(191) NULL,
  upiQrUrl VARCHAR(191) NULL,
  paymentsEnabled BOOLEAN NOT NULL DEFAULT TRUE,
  updatedAt DATETIME(3) NOT NULL,
  PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO sitesettings (id, upiId, upiQrUrl, paymentsEnabled, updatedAt)
VALUES ('default', NULL, NULL, TRUE, NOW(3));
