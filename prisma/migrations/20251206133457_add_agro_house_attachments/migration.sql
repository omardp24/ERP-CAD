-- CreateTable
CREATE TABLE "AgroHouseAttachment" (
    "id" SERIAL NOT NULL,
    "agroHouseId" INTEGER NOT NULL,
    "category" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgroHouseAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgroHouseAttachment" ADD CONSTRAINT "AgroHouseAttachment_agroHouseId_fkey" FOREIGN KEY ("agroHouseId") REFERENCES "AgroHouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
