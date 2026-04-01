-- AlterTable
ALTER TABLE "sale_invoice_items" ADD COLUMN     "inventoryCodeAtSale" VARCHAR(60),
ADD COLUMN     "inventoryNameAtSale" VARCHAR(150),
ADD COLUMN     "unitAtSale" VARCHAR(20);

-- AlterTable
ALTER TABLE "sale_invoices" ADD COLUMN     "applyVat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" INTEGER,
ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "discountPct" DECIMAL(8,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountUsd" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotalBs" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalBs" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vatBs" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vatRate" DECIMAL(8,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vatUsd" DECIMAL(16,2) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "sale_invoices" ADD CONSTRAINT "sale_invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoices" ADD CONSTRAINT "sale_invoices_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
