-- ======================================================================
-- Store upgrade
--   1. Card (Visa / Mastercard / Paymob) payments removed completely
--   2. Multiple images per product (ProductImage)
--   3. Shipping zones with a price per governorate (ShippingZone)
--   4. Size / colour stored on cart + order items
--   5. Arabic names (categories, products, colours)
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. Remove card payments
--    Any leftover VISA rows are test orders that could never be paid
--    (card gateway was never configured) - they are converted to cash on
--    delivery so no order or customer data is lost.
-- ----------------------------------------------------------------------
UPDATE `Payment`
   SET `method` = 'CASH_ON_DELIVERY',
       `status` = IF(`status` = 'PAID', 'PAID', 'UNPAID')
 WHERE `method` = 'VISA';

UPDATE `Payment` SET `status` = 'UNPAID' WHERE `status` = 'PENDING';

ALTER TABLE `Payment`
  MODIFY COLUMN `method` ENUM('VODAFONE_CASH', 'CASH_ON_DELIVERY') NOT NULL,
  MODIFY COLUMN `status` ENUM('UNPAID', 'PENDING_VERIFICATION', 'PAID', 'REJECTED') NOT NULL DEFAULT 'UNPAID';

ALTER TABLE `Payment` DROP INDEX `Payment_paymobOrderId_key`;

ALTER TABLE `Payment`
  DROP COLUMN `paymobIntentionId`,
  DROP COLUMN `paymobOrderId`,
  DROP COLUMN `paymobTransactionId`,
  DROP COLUMN `paymobClientSecret`,
  DROP COLUMN `cardLast4`,
  DROP COLUMN `cardBrand`;

-- Cash collected on delivery: delivered COD orders count as paid.
UPDATE `Payment` p
  JOIN `Order` o ON o.`id` = p.`orderId`
   SET p.`status` = 'PAID'
 WHERE p.`method` = 'CASH_ON_DELIVERY'
   AND o.`status` = 'DELIVERED';

-- ----------------------------------------------------------------------
-- 2. Arabic names
-- ----------------------------------------------------------------------
ALTER TABLE `Category` ADD COLUMN `nameAr` VARCHAR(191) NULL;
ALTER TABLE `Color` ADD COLUMN `nameAr` VARCHAR(191) NULL;
ALTER TABLE `Product`
  ADD COLUMN `nameAr` VARCHAR(191) NULL,
  ADD COLUMN `descriptionAr` TEXT NULL;

UPDATE `Category` SET `nameAr` = 'جلاليب' WHERE `name` = 'Galabiyas' AND `nameAr` IS NULL;
UPDATE `Category` SET `nameAr` = 'بيجامات' WHERE `name` = 'Pajamas' AND `nameAr` IS NULL;
UPDATE `Category` SET `nameAr` = 'قمصان نوم ولانجيري' WHERE `name` = 'Nightwear & Lingerie' AND `nameAr` IS NULL;
UPDATE `Category` SET `nameAr` = 'ميكب' WHERE `name` = 'Makeup' AND `nameAr` IS NULL;
UPDATE `Category` SET `nameAr` = 'إكسسوارات' WHERE `name` = 'Accessories' AND `nameAr` IS NULL;
UPDATE `Category` SET `nameAr` = 'مايوهات' WHERE `name` = 'Swimwear' AND `nameAr` IS NULL;
UPDATE `Category` SET `nameAr` = 'ملابس داخلية' WHERE `name` = 'Underwear' AND `nameAr` IS NULL;

UPDATE `Color` SET `nameAr` = 'وردي روز' WHERE `name` = 'Rose Pink' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'أبيض عاجي' WHERE `name` = 'Ivory White' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'أسود' WHERE `name` = 'Black' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'أبيض' WHERE `name` = 'White' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'وردي هادي' WHERE `name` = 'Blush Pink' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'بيج' WHERE `name` = 'Beige' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'رمادي' WHERE `name` = 'Grey' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'ذهبي' WHERE `name` = 'Gold' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'فضي' WHERE `name` = 'Silver' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'ذهبي روز' WHERE `name` = 'Rose Gold' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'أحمر' WHERE `name` = 'Red' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'وردي' WHERE `name` = 'Pink' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'أزرق' WHERE `name` = 'Blue' AND `nameAr` IS NULL;
UPDATE `Color` SET `nameAr` = 'أخضر' WHERE `name` = 'Green' AND `nameAr` IS NULL;

-- ----------------------------------------------------------------------
-- 3. Multiple product images
-- ----------------------------------------------------------------------
CREATE TABLE `ProductImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` TEXT NOT NULL,
    `storageKey` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `productId` INTEGER NOT NULL,

    INDEX `ProductImage_productId_position_idx`(`productId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing single images become the first image of each product.
INSERT INTO `ProductImage` (`url`, `position`, `productId`)
SELECT `image`, 0, `id` FROM `Product` WHERE `image` IS NOT NULL AND `image` <> '';

-- ----------------------------------------------------------------------
-- 4. Shipping zones (price per governorate)
-- ----------------------------------------------------------------------
CREATE TABLE `ShippingZone` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nameAr` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShippingZone_nameAr_key`(`nameAr`),
    UNIQUE INDEX `ShippingZone_nameEn_key`(`nameEn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ShippingZone` (`nameAr`, `nameEn`, `price`, `isActive`, `sortOrder`, `updatedAt`) VALUES
  ('الإسكندرية', 'Alexandria', 45, true, 1, CURRENT_TIMESTAMP(3)),
  ('القاهرة', 'Cairo', 90, true, 2, CURRENT_TIMESTAMP(3)),
  ('الجيزة', 'Giza', 90, true, 3, CURRENT_TIMESTAMP(3)),
  ('أطراف القاهرة والجيزة', 'Cairo & Giza Outskirts', 110, true, 4, CURRENT_TIMESTAMP(3)),
  ('البحيرة', 'Beheira', 100, true, 5, CURRENT_TIMESTAMP(3)),
  ('الغربية', 'Gharbia', 100, true, 6, CURRENT_TIMESTAMP(3)),
  ('الشرقية', 'Sharqia', 100, true, 7, CURRENT_TIMESTAMP(3)),
  ('القليوبية', 'Qalyubia', 100, true, 8, CURRENT_TIMESTAMP(3)),
  ('كفر الشيخ', 'Kafr El Sheikh', 100, true, 9, CURRENT_TIMESTAMP(3)),
  ('المنوفية', 'Monufia', 100, true, 10, CURRENT_TIMESTAMP(3)),
  ('بورسعيد', 'Port Said', 100, true, 11, CURRENT_TIMESTAMP(3)),
  ('الإسماعيلية', 'Ismailia', 100, true, 12, CURRENT_TIMESTAMP(3)),
  ('السويس', 'Suez', 110, true, 13, CURRENT_TIMESTAMP(3)),
  ('دمياط', 'Damietta', 110, true, 14, CURRENT_TIMESTAMP(3)),
  ('سوهاج', 'Sohag', 110, true, 15, CURRENT_TIMESTAMP(3)),
  ('قنا', 'Qena', 110, true, 16, CURRENT_TIMESTAMP(3)),
  ('بني سويف', 'Beni Suef', 110, true, 17, CURRENT_TIMESTAMP(3)),
  ('المنيا', 'Minya', 110, true, 18, CURRENT_TIMESTAMP(3)),
  ('الأقصر', 'Luxor', 115, true, 19, CURRENT_TIMESTAMP(3)),
  ('أسوان', 'Aswan', 115, true, 20, CURRENT_TIMESTAMP(3)),
  ('البحر الأحمر / الغردقة', 'Red Sea / Hurghada', 120, true, 21, CURRENT_TIMESTAMP(3));

-- ----------------------------------------------------------------------
-- 5. Size / colour on cart items and order items
-- ----------------------------------------------------------------------
ALTER TABLE `CartItem`
  ADD COLUMN `size` VARCHAR(64) NOT NULL DEFAULT '',
  ADD COLUMN `color` VARCHAR(64) NOT NULL DEFAULT '',
  ADD UNIQUE INDEX `CartItem_cartId_productId_size_color_key`(`cartId`, `productId`, `size`, `color`),
  DROP INDEX `CartItem_cartId_productId_key`;

ALTER TABLE `OrderItem`
  ADD COLUMN `productName` VARCHAR(191) NULL,
  ADD COLUMN `size` VARCHAR(191) NULL,
  ADD COLUMN `color` VARCHAR(191) NULL;

UPDATE `OrderItem` oi
  JOIN `Product` p ON p.`id` = oi.`productId`
   SET oi.`productName` = p.`name`
 WHERE oi.`productName` IS NULL;
