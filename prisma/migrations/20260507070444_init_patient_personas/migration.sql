-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `activePatientPersonaId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_activePatientPersonaId_idx`(`activePatientPersonaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PatientPersona` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `relationship` VARCHAR(191) NOT NULL,
    `gender` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `age` INTEGER NULL,
    `weightKg` DOUBLE NULL,
    `heightCm` DOUBLE NULL,
    `pregnancyStatus` VARCHAR(191) NULL,
    `breastfeedingStatus` VARCHAR(191) NULL,
    `medicationHistory` VARCHAR(191) NULL,
    `preferredLanguage` VARCHAR(191) NOT NULL DEFAULT 'th',
    `emergencyContact` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PatientPersona_userId_idx`(`userId`),
    INDEX `PatientPersona_relationship_idx`(`relationship`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Allergy` (
    `id` VARCHAR(191) NOT NULL,
    `patientPersonaId` VARCHAR(191) NOT NULL,
    `substance` VARCHAR(191) NOT NULL,
    `reaction` VARCHAR(191) NULL,
    `severity` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Allergy_patientPersonaId_idx`(`patientPersonaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChronicDisease` (
    `id` VARCHAR(191) NOT NULL,
    `patientPersonaId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChronicDisease_patientPersonaId_idx`(`patientPersonaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CurrentMedication` (
    `id` VARCHAR(191) NOT NULL,
    `patientPersonaId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `dose` VARCHAR(191) NULL,
    `frequency` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CurrentMedication_patientPersonaId_idx`(`patientPersonaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `patientPersonaId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChatSession_userId_idx`(`userId`),
    INDEX `ChatSession_patientPersonaId_idx`(`patientPersonaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `patientPersonaId` VARCHAR(191) NULL,
    `chatSessionId` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `personaSnapshot` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatMessage_userId_idx`(`userId`),
    INDEX `ChatMessage_patientPersonaId_idx`(`patientPersonaId`),
    INDEX `ChatMessage_chatSessionId_idx`(`chatSessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_activePatientPersonaId_fkey` FOREIGN KEY (`activePatientPersonaId`) REFERENCES `PatientPersona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientPersona` ADD CONSTRAINT `PatientPersona_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Allergy` ADD CONSTRAINT `Allergy_patientPersonaId_fkey` FOREIGN KEY (`patientPersonaId`) REFERENCES `PatientPersona`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChronicDisease` ADD CONSTRAINT `ChronicDisease_patientPersonaId_fkey` FOREIGN KEY (`patientPersonaId`) REFERENCES `PatientPersona`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CurrentMedication` ADD CONSTRAINT `CurrentMedication_patientPersonaId_fkey` FOREIGN KEY (`patientPersonaId`) REFERENCES `PatientPersona`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatSession` ADD CONSTRAINT `ChatSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatSession` ADD CONSTRAINT `ChatSession_patientPersonaId_fkey` FOREIGN KEY (`patientPersonaId`) REFERENCES `PatientPersona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_patientPersonaId_fkey` FOREIGN KEY (`patientPersonaId`) REFERENCES `PatientPersona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_chatSessionId_fkey` FOREIGN KEY (`chatSessionId`) REFERENCES `ChatSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
