-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('IN', 'OUT', 'ADJUST');

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "stockQty" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reservedQty" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "avgCostUsd" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "totalCostUsd" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "company" VARCHAR(20),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_code_key" ON "InventoryItem"("code");

-- AddForeignKey
ALTER TABLE "FinancedItem" ADD CONSTRAINT "FinancedItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
