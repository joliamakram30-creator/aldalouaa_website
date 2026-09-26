-- Step 1: add the new columns, keep the old primary key for now,
-- and add standalone indexes so the existing foreign keys have
-- something else to rely on besides the primary key.
ALTER TABLE `ProductScent`
  ADD COLUMN `id` INT NOT NULL AUTO_INCREMENT UNIQUE FIRST,
  ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD INDEX `ProductScent_productId_idx` (`productId`),
  ADD INDEX `ProductScent_scentId_idx` (`scentId`);

-- Step 2: now the foreign keys are backed by the indexes above,
-- so we can safely drop the old composite primary key and make
-- `id` the real primary key instead.
ALTER TABLE `ProductScent`
  DROP PRIMARY KEY,
  DROP INDEX `id`,
  ADD PRIMARY KEY (`id`);

-- Step 3: recreate the unique constraint on (productId, scentId)
-- that schema.prisma expects (@@unique([productId, scentId])).
ALTER TABLE `ProductScent`
  ADD UNIQUE INDEX `ProductScent_productId_scentId_key` (`productId`, `scentId`);