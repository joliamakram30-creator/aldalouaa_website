-- CreateTable
CREATE TABLE `Scent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Scent_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductScent` (
    `productId` INTEGER NOT NULL,
    `scentId` INTEGER NOT NULL,

    PRIMARY KEY (`productId`, `scentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductScent` ADD CONSTRAINT `ProductScent_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductScent` ADD CONSTRAINT `ProductScent_scentId_fkey` FOREIGN KEY (`scentId`) REFERENCES `Scent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
