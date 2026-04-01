-- CreateTable
CREATE TABLE "FinancingPlan" (
    "id" SERIAL NOT NULL,
    "producerId" INTEGER NOT NULL,
    "cropPlanId" INTEGER,
    "company" VARCHAR(30),
    "season" VARCHAR(50),
    "description" VARCHAR(255),
    "totalCost" DECIMAL(12,2),
    "totalPrice" DECIMAL(12,2),
    "totalFinanced" DECIMAL(12,2),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "FinancingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancedItem" (
    "id" SERIAL NOT NULL,
    "financingPlanId" INTEGER NOT NULL,
    "supplierId" INTEGER,
    "name" VARCHAR(150) NOT NULL,
    "unit" VARCHAR(20) DEFAULT 'kg',
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "financedPercent" DECIMAL(5,2) NOT NULL,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "FinancedItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FinancingPlan" ADD CONSTRAINT "FinancingPlan_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancingPlan" ADD CONSTRAINT "FinancingPlan_cropPlanId_fkey" FOREIGN KEY ("cropPlanId") REFERENCES "crop_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancedItem" ADD CONSTRAINT "FinancedItem_financingPlanId_fkey" FOREIGN KEY ("financingPlanId") REFERENCES "FinancingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancedItem" ADD CONSTRAINT "FinancedItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
