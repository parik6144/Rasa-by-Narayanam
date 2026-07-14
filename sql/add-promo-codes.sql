-- Promo codes + booking.promoCodeId
CREATE TABLE IF NOT EXISTS promocode (
  id VARCHAR(191) NOT NULL,
  code VARCHAR(191) NOT NULL,
  label VARCHAR(191) NOT NULL,
  type VARCHAR(191) NOT NULL,
  value INT NOT NULL,
  minOrderPaise INT NOT NULL DEFAULT 0,
  maxDiscountPaise INT NULL,
  startsAt DATETIME(3) NULL,
  endsAt DATETIME(3) NULL,
  usageLimit INT NULL,
  usedCount INT NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdBy VARCHAR(191) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY promocode_code_key (code)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE booking ADD COLUMN promoCodeId VARCHAR(191) NULL;
ALTER TABLE booking ADD CONSTRAINT booking_promoCodeId_fkey FOREIGN KEY (promoCodeId) REFERENCES promocode(id) ON DELETE SET NULL ON UPDATE CASCADE;
