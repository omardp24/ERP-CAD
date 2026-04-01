-- CreateTable
CREATE TABLE "AgroHouseBankAccount" (
    "id" SERIAL NOT NULL,
    "agroHouseId" INTEGER NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" TEXT,
    "currency" TEXT,
    "holderName" TEXT,
    "holderId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgroHouseBankAccount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgroHouseBankAccount" ADD CONSTRAINT "AgroHouseBankAccount_agroHouseId_fkey" FOREIGN KEY ("agroHouseId") REFERENCES "AgroHouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
