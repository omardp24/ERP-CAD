-- CreateTable
CREATE TABLE "ProducerPaymentSchedule" (
    "id" SERIAL NOT NULL,
    "producerId" INTEGER NOT NULL,
    "cycle" VARCHAR(30),
    "company" VARCHAR(30),
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "adminAccountId" INTEGER,
    "financeMovementId" INTEGER,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProducerPaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProducerPaymentSchedule" ADD CONSTRAINT "ProducerPaymentSchedule_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
