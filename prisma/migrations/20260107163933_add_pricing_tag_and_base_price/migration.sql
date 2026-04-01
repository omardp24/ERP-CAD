-- CreateEnum
CREATE TYPE "PricingTag" AS ENUM ('SEMILLA', 'INSUMO', 'MATERIA_PRIMA', 'PRODUCTO_TERMINADO');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "basePriceUsd" DECIMAL(18,6),
ADD COLUMN     "pricingTag" "PricingTag" NOT NULL DEFAULT 'INSUMO';
