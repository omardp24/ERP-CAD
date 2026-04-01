/*
  Warnings:

  - You are about to drop the column `financedPercent` on the `FinancedItem` table. All the data in the column will be lost.
  - Added the required column `category` to the `FinancedItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cycleId` to the `FinancedItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rateBcv` to the `FinancedItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FinancedItem" DROP CONSTRAINT "FinancedItem_financingPlanId_fkey";

-- DropForeignKey
ALTER TABLE "FinancedItem" DROP CONSTRAINT "FinancedItem_supplierId_fkey";

-- AlterTable
ALTER TABLE "FinancedItem" DROP COLUMN "financedPercent",
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "cropPlanId" INTEGER,
ADD COLUMN     "cycleId" INTEGER NOT NULL,
ADD COLUMN     "financingPercent" DECIMAL(65,30) NOT NULL DEFAULT 100.00,
ADD COLUMN     "inventoryItemId" INTEGER,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "producerId" INTEGER,
ADD COLUMN     "rateBcv" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "suppliersId" INTEGER,
ALTER COLUMN "financingPlanId" DROP NOT NULL,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "unit" DROP DEFAULT,
ALTER COLUMN "unit" SET DATA TYPE TEXT,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "unitCost" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "notes" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CycleExtraCost" (
    "id" SERIAL NOT NULL,
    "cycleId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountUsd" DECIMAL(65,30),
    "amountBs" DECIMAL(65,30),
    "rateBcv" DECIMAL(65,30) NOT NULL,
    "supplierId" INTEGER,
    "cropPlanId" INTEGER,
    "occurredAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleExtraCost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FinancedItem" ADD CONSTRAINT "FinancedItem_suppliersId_fkey" FOREIGN KEY ("suppliersId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancedItem" ADD CONSTRAINT "FinancedItem_financingPlanId_fkey" FOREIGN KEY ("financingPlanId") REFERENCES "FinancingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
