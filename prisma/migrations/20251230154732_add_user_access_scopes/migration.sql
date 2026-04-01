/*
  Warnings:

  - The `movement_type` column on the `inventory_movements` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "inventory_movements" DROP COLUMN "movement_type",
ADD COLUMN     "movement_type" "InventoryMovementType";

-- CreateTable
CREATE TABLE "user_warehouse_access" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_warehouse_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_producer_access" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "producerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_producer_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_company_access" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "company" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_company_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_warehouse_access_userId_warehouseId_key" ON "user_warehouse_access"("userId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "user_producer_access_userId_producerId_key" ON "user_producer_access"("userId", "producerId");

-- CreateIndex
CREATE UNIQUE INDEX "user_company_access_userId_company_key" ON "user_company_access"("userId", "company");

-- AddForeignKey
ALTER TABLE "user_warehouse_access" ADD CONSTRAINT "user_warehouse_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_warehouse_access" ADD CONSTRAINT "user_warehouse_access_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_producer_access" ADD CONSTRAINT "user_producer_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_producer_access" ADD CONSTRAINT "user_producer_access_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
