-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('LOCAL', 'EXPORTACION');

-- CreateEnum
CREATE TYPE "SaleDocumentType" AS ENUM ('PROFORMA', 'FACTURA', 'NOTA_ENTREGA');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalePartyType" AS ENUM ('CLIENT', 'PRODUCER');

-- CreateEnum
CREATE TYPE "SalePaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "SalePaymentMethod" AS ENUM ('CASH', 'BANK', 'TRANSFER', 'OTHER', 'IN_KIND');

-- CreateTable
CREATE TABLE "sale_invoices" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30),
    "saleDate" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "SaleType" NOT NULL DEFAULT 'LOCAL',
    "documentType" "SaleDocumentType" NOT NULL DEFAULT 'FACTURA',
    "status" "SaleStatus" NOT NULL DEFAULT 'DRAFT',
    "partyType" "SalePartyType" NOT NULL DEFAULT 'CLIENT',
    "clientId" INTEGER,
    "producerId" INTEGER,
    "isCredit" BOOLEAN NOT NULL DEFAULT false,
    "creditNotes" TEXT,
    "dueDate" TIMESTAMP(3),
    "company" VARCHAR(20),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "rateBcv" DECIMAL(14,4),
    "subtotalUsd" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "totalUsd" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "paymentStatus" "SalePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "sale_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_invoice_items" (
    "id" SERIAL NOT NULL,
    "saleInvoiceId" INTEGER NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "description" VARCHAR(255),
    "quantity" DECIMAL(14,2) NOT NULL,
    "unit" VARCHAR(20),
    "unitPriceUsd" DECIMAL(14,4) NOT NULL,
    "subtotalUsd" DECIMAL(16,2) NOT NULL,
    "avgCostUsdAtSale" DECIMAL(14,4),
    "costTotalUsd" DECIMAL(16,2),
    "marginUsd" DECIMAL(16,2),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" SERIAL NOT NULL,
    "saleInvoiceId" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountUsd" DECIMAL(16,2) NOT NULL,
    "method" "SalePaymentMethod" NOT NULL DEFAULT 'TRANSFER',
    "reference" VARCHAR(80),
    "notes" TEXT,
    "adminAccountId" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sale_invoices_code_key" ON "sale_invoices"("code");

-- CreateIndex
CREATE INDEX "sale_invoices_saleDate_idx" ON "sale_invoices"("saleDate");

-- CreateIndex
CREATE INDEX "sale_invoices_status_idx" ON "sale_invoices"("status");

-- CreateIndex
CREATE INDEX "sale_invoices_partyType_idx" ON "sale_invoices"("partyType");

-- CreateIndex
CREATE INDEX "sale_invoices_clientId_idx" ON "sale_invoices"("clientId");

-- CreateIndex
CREATE INDEX "sale_invoices_producerId_idx" ON "sale_invoices"("producerId");

-- CreateIndex
CREATE INDEX "sale_invoice_items_saleInvoiceId_idx" ON "sale_invoice_items"("saleInvoiceId");

-- CreateIndex
CREATE INDEX "sale_invoice_items_inventoryItemId_idx" ON "sale_invoice_items"("inventoryItemId");

-- CreateIndex
CREATE INDEX "sale_payments_saleInvoiceId_idx" ON "sale_payments"("saleInvoiceId");

-- CreateIndex
CREATE INDEX "sale_payments_paymentDate_idx" ON "sale_payments"("paymentDate");

-- AddForeignKey
ALTER TABLE "sale_invoices" ADD CONSTRAINT "sale_invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoices" ADD CONSTRAINT "sale_invoices_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoice_items" ADD CONSTRAINT "sale_invoice_items_saleInvoiceId_fkey" FOREIGN KEY ("saleInvoiceId") REFERENCES "sale_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoice_items" ADD CONSTRAINT "sale_invoice_items_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_adminAccountId_fkey" FOREIGN KEY ("adminAccountId") REFERENCES "AdministrativeAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_saleInvoiceId_fkey" FOREIGN KEY ("saleInvoiceId") REFERENCES "sale_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
