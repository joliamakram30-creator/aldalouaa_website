-- ======================================
-- 1. PaymentStatus: add PENDING
-- ======================================
ALTER TABLE `Payment`
  MODIFY COLUMN `status`
  ENUM(
    'UNPAID',
    'PENDING',
    'PENDING_VERIFICATION',
    'PAID',
    'REJECTED'
  )
  NOT NULL
  DEFAULT 'UNPAID';


-- ======================================
-- 2. Order.orderNumber
--
-- Add nullable first so existing orders can be
-- backfilled safely.
-- ======================================

ALTER TABLE `Order`
  ADD COLUMN `orderNumber` VARCHAR(191) NULL;

UPDATE `Order`
SET `orderNumber` = CONCAT(
  'ORD-LEGACY-',
  LPAD(`id`, 6, '0')
)
WHERE `orderNumber` IS NULL;

ALTER TABLE `Order`
  MODIFY COLUMN `orderNumber` VARCHAR(191) NOT NULL;

ALTER TABLE `Order`
  ADD UNIQUE INDEX `Order_orderNumber_key` (`orderNumber`);


-- ======================================
-- 3. Order.stockReleased
--
-- Existing orders receive false by default.
-- ======================================

ALTER TABLE `Order`
  ADD COLUMN `stockReleased` BOOLEAN NOT NULL DEFAULT false;


-- ======================================
-- IMPORTANT:
-- Do NOT automatically mark old CANCELLED orders
-- as stockReleased = true unless you have verified
-- that their stock was already restored.
--
-- If you have checked your existing data and are
-- certain those cancelled orders already had their
-- stock restored, you may run:
--
-- UPDATE `Order`
-- SET `stockReleased` = true
-- WHERE `status` = 'CANCELLED';
-- ======================================


-- ======================================
-- 4. Payment: Paymob / Card fields
-- ======================================

ALTER TABLE `Payment`
  ADD COLUMN `paymobIntentionId` VARCHAR(191) NULL,
  ADD COLUMN `paymobOrderId` VARCHAR(191) NULL,
  ADD COLUMN `paymobTransactionId` VARCHAR(191) NULL,
  ADD COLUMN `paymobClientSecret` TEXT NULL,
  ADD COLUMN `cardLast4` VARCHAR(191) NULL,
  ADD COLUMN `cardBrand` VARCHAR(191) NULL;


-- ======================================
-- 5. Paymob Order ID must be unique
--
-- MySQL allows multiple NULL values in a UNIQUE
-- index, so existing payments without Paymob IDs
-- are safe.
-- ======================================

ALTER TABLE `Payment`
  ADD UNIQUE INDEX `Payment_paymobOrderId_key`
  (`paymobOrderId`);