-- AlterTable
ALTER TABLE `Order`
  ADD COLUMN `shippingCost` DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE `Order` SET `subtotal` = `totalAmount` WHERE `subtotal` = 0;

-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `method` ENUM('VODAFONE_CASH', 'CASH_ON_DELIVERY', 'VISA') NOT NULL,
    `status` ENUM('UNPAID', 'PENDING_VERIFICATION', 'PAID', 'REJECTED') NOT NULL DEFAULT 'UNPAID',
    `senderPhone` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `proofImage` TEXT NULL,
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `orderId` INTEGER NOT NULL,

    UNIQUE INDEX `Payment_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;