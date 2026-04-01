-- CreateEnum
CREATE TYPE "AdministrativeAuditAction" AS ENUM ('CREATE_ACCOUNT', 'CREATE_MOVEMENT', 'CREATE_TRANSFER', 'UPDATE_ACCOUNT');

-- CreateTable
CREATE TABLE "AdministrativeAuditLog" (
    "id" SERIAL NOT NULL,
    "action" "AdministrativeAuditAction" NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" INTEGER,
    "accountId" INTEGER,
    "userId" INTEGER,
    "userEmail" VARCHAR(150),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdministrativeAuditLog_pkey" PRIMARY KEY ("id")
);
