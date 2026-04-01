-- CreateEnum
CREATE TYPE "PriceItemMode" AS ENUM ('FIXED', 'MARGIN_OVER_COST');

-- AlterTable
ALTER TABLE "sale_invoice_items" ADD COLUMN     "priceListItemId" INTEGER,
ADD COLUMN     "priceSource" VARCHAR(30);

-- AlterTable
ALTER TABLE "sale_invoices" ADD COLUMN     "priceListId" INTEGER;

-- CreateTable
CREATE TABLE "PriceList" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "company" VARCHAR(20),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" SERIAL NOT NULL,
    "priceListId" INTEGER NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "mode" "PriceItemMode" NOT NULL DEFAULT 'MARGIN_OVER_COST',
    "fixedPriceUsd" DECIMAL(14,4),
    "marginPct" DECIMAL(8,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceList_code_key" ON "PriceList"("code");

-- CreateIndex
CREATE INDEX "price_list_items_priceListId_idx" ON "price_list_items"("priceListId");

-- CreateIndex
CREATE INDEX "price_list_items_inventoryItemId_idx" ON "price_list_items"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_items_priceListId_inventoryItemId_key" ON "price_list_items"("priceListId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "sale_invoices" ADD CONSTRAINT "sale_invoices_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoice_items" ADD CONSTRAINT "sale_invoice_items_priceListItemId_fkey" FOREIGN KEY ("priceListItemId") REFERENCES "price_list_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
