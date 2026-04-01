-- AlterTable
ALTER TABLE "FinanceMovement" ADD COLUMN     "adminAccountId" INTEGER;

-- AddForeignKey
ALTER TABLE "FinanceMovement" ADD CONSTRAINT "FinanceMovement_adminAccountId_fkey" FOREIGN KEY ("adminAccountId") REFERENCES "AdministrativeAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducerPaymentSchedule" ADD CONSTRAINT "ProducerPaymentSchedule_adminAccountId_fkey" FOREIGN KEY ("adminAccountId") REFERENCES "AdministrativeAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducerPaymentSchedule" ADD CONSTRAINT "ProducerPaymentSchedule_financeMovementId_fkey" FOREIGN KEY ("financeMovementId") REFERENCES "FinanceMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
