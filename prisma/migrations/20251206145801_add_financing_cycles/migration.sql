-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN     "productId" INTEGER;

-- CreateTable
CREATE TABLE "FinancingCycle" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(120),
    "season" VARCHAR(60),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "FinancingCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancingCycle_code_key" ON "FinancingCycle"("code");

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
