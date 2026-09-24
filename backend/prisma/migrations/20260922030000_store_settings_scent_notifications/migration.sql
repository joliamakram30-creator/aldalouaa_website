-- ============================================
-- AL-DALOUAA DATABASE UPDATE
-- Store Settings + Product Scent + Notifications
-- ============================================

-- ============================================
-- 1. Store Settings
-- ============================================

CREATE TABLE `StoreSetting` (
  `id` INTEGER NOT NULL DEFAULT 1,
  `freeShippingEnabled` BOOLEAN NOT NULL DEFAULT true,
  `freeShippingThreshold` DECIMAL(10,2) NOT NULL DEFAULT 2000,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- Default store settings
INSERT INTO `StoreSetting` (
  `id`,
  `freeShippingEnabled`,
  `freeShippingThreshold`,
  `createdAt`,
  `updatedAt`
)
VALUES (
  1,
  true,
  2000.00,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);


-- ============================================
-- 2. Add Scent to CartItem
-- ============================================

ALTER TABLE `CartItem`
  ADD COLUMN `scent` VARCHAR(64) NOT NULL DEFAULT '';


-- Create new unique constraint FIRST
CREATE UNIQUE INDEX `CartItem_cartId_productId_size_color_scent_key`
ON `CartItem` (
  `cartId`,
  `productId`,
  `size`,
  `color`,
  `scent`
);


-- Remove old unique constraint AFTER creating the new one
ALTER TABLE `CartItem`
  DROP INDEX `CartItem_cartId_productId_size_color_key`;


-- ============================================
-- 3. Add Scent to OrderItem
-- ============================================

ALTER TABLE `OrderItem`
  ADD COLUMN `scent` VARCHAR(64) NULL;


-- ============================================
-- 4. Admin Notifications
-- ============================================

CREATE TABLE `Notification` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(191) NOT NULL DEFAULT 'ORDER',
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `link` VARCHAR(191) NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `adminId` INTEGER NOT NULL,

  PRIMARY KEY (`id`),

  INDEX `Notification_adminId_isRead_createdAt_idx`
    (`adminId`, `isRead`, `createdAt`),

  CONSTRAINT `Notification_adminId_fkey`
    FOREIGN KEY (`adminId`)
    REFERENCES `User`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;