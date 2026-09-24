-- Google sign-in: link an account to a Google identity.
ALTER TABLE `User`
    ADD COLUMN `googleId` VARCHAR(191) NULL,
    ADD COLUMN `passwordSet` BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX `User_googleId_key` ON `User`(`googleId`);
