/*
  Warnings:

  - Added the required column `updatedAt` to the `PurchaseInvoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "PurchaseInvoiceAttachment" (
    "id" SERIAL NOT NULL,
    "purchaseInvoiceId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT,
    "url" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseInvoiceAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceAttachment" ADD CONSTRAINT "PurchaseInvoiceAttachment_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
