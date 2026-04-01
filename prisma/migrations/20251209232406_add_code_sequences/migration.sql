/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `AgroHouse` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `AgroHouseAttachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `AgroHousePayment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `PurchaseInvoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `PurchaseInvoiceAttachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `PurchaseItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `producers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `purchase_invoices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `purchase_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `purchase_order_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `purchase_orders` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CodeResetPolicy" AS ENUM ('NEVER', 'YEARLY', 'MONTHLY', 'DAILY');

-- AlterTable
ALTER TABLE "AgroHouse" ADD COLUMN     "code" VARCHAR(30);

-- AlterTable
ALTER TABLE "AgroHouseAttachment" ADD COLUMN     "code" VARCHAR(30);

-- AlterTable
ALTER TABLE "AgroHousePayment" ADD COLUMN     "code" VARCHAR(30);

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "code" VARCHAR(30);

-- AlterTable
ALTER TABLE "PurchaseInvoiceAttachment" ADD COLUMN     "code" VARCHAR(30);

-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN     "code" VARCHAR(30);

-- AlterTable
ALTER TABLE "producers" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "code" VARCHAR(30);

-- AlterTable
ALTER TABLE "purchase_invoices" ADD COLUMN     "code" VARCHAR(30);

-- AlterTable
ALTER TABLE "purchase_items" ADD COLUMN     "code" VARCHAR(30);

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "code" VARCHAR(30);

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "code" VARCHAR(30);

-- CreateTable
CREATE TABLE "CodeSequence" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "prefix" TEXT,
    "padding" INTEGER NOT NULL DEFAULT 6,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "suffix" TEXT,
    "resetPolicy" "CodeResetPolicy" NOT NULL DEFAULT 'NEVER',
    "lastResetAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeSequence_key_key" ON "CodeSequence"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AgroHouse_code_key" ON "AgroHouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AgroHouseAttachment_code_key" ON "AgroHouseAttachment"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AgroHousePayment_code_key" ON "AgroHousePayment"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_code_key" ON "PurchaseInvoice"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoiceAttachment_code_key" ON "PurchaseInvoiceAttachment"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseItem_code_key" ON "PurchaseItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "producers_code_key" ON "producers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_code_key" ON "purchase_invoices"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_items_code_key" ON "purchase_items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_items_code_key" ON "purchase_order_items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_code_key" ON "purchase_orders"("code");
