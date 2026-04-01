-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'USER');

-- CreateEnum
CREATE TYPE "FinanceMovementType" AS ENUM ('ADVANCE', 'PAYMENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'VES');

-- CreateEnum
CREATE TYPE "AdministrativeAccountType" AS ENUM ('CASH', 'BANK', 'INTERNAL', 'FUND');

-- CreateEnum
CREATE TYPE "AdministrativeMovementType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'ADJUST');

-- CreateTable
CREATE TABLE "advances" (
    "id" SERIAL NOT NULL,
    "producer_id" INTEGER,
    "amount_usd" DECIMAL(12,2),
    "amount_bs" DECIMAL(12,2),
    "rate" DECIMAL(10,2),
    "type" VARCHAR(50),
    "date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "rif" VARCHAR(20),
    "email" VARCHAR(120),
    "phone" VARCHAR(30),
    "address" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_plans" (
    "id" SERIAL NOT NULL,
    "producer_id" INTEGER,
    "crop" VARCHAR(50),
    "hectares" DECIMAL(10,2),
    "expected_yield" DECIMAL(10,2),
    "cycle" VARCHAR(50),
    "start_date" DATE,
    "end_date" DATE,

    CONSTRAINT "crop_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_lots" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "lot" VARCHAR(50),
    "supplier_type" VARCHAR(20),
    "supplier_id" INTEGER,
    "financed_percent" DECIMAL(5,2),
    "financed_balance" DECIMAL(12,2),
    "free_balance" DECIMAL(12,2),
    "cost_avg" DECIMAL(12,4),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "warehouse_id" INTEGER,
    "total_quantity" DECIMAL(12,2),
    "status" VARCHAR(20) DEFAULT 'active',

    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" SERIAL NOT NULL,
    "lot_id" INTEGER,
    "warehouse_id" INTEGER,
    "movement_type" VARCHAR(20),
    "quantity" DECIMAL(12,2),
    "cost" DECIMAL(12,4),
    "module" VARCHAR(50),
    "reference_id" INTEGER,
    "date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidation_receipts" (
    "id" SERIAL NOT NULL,
    "liquidation_id" INTEGER,
    "receipt_id" INTEGER,
    "kilos_financed" DECIMAL(12,2),
    "kilos_free" DECIMAL(12,2),
    "price_equivalent" DECIMAL(12,4),
    "total_equivalent" DECIMAL(12,2),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidation_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producer_finance_accounts" (
    "id" SERIAL NOT NULL,
    "producer_id" INTEGER,
    "cycle" VARCHAR(50),
    "total_debt" DECIMAL(12,2) DEFAULT 0,
    "total_paid" DECIMAL(12,2) DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producer_finance_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producer_liquidations" (
    "id" SERIAL NOT NULL,
    "producer_id" INTEGER,
    "cycle" VARCHAR(50),
    "date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) DEFAULT 'pending',
    "notes" TEXT,

    CONSTRAINT "producer_liquidations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "rif" VARCHAR(20),
    "phone" VARCHAR(30),
    "address" TEXT,
    "risk_level" VARCHAR(2),
    "status" VARCHAR(20) DEFAULT 'activo',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120),
    "category" VARCHAR(60),
    "unit" VARCHAR(20) DEFAULT 'kg',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoices" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER,
    "invoice_number" VARCHAR(50),
    "invoice_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(12,2),
    "currency" VARCHAR(10) DEFAULT 'USD',
    "rate" DECIMAL(12,4),
    "notes" TEXT,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" SERIAL NOT NULL,
    "purchase_invoice_id" INTEGER,
    "product_id" INTEGER,
    "warehouse_id" INTEGER,
    "lot" VARCHAR(50),
    "quantity" DECIMAL(12,2),
    "price" DECIMAL(12,4),
    "subtotal" DECIMAL(12,2),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER,
    "product_id" INTEGER,
    "quantity_ordered" DECIMAL(12,2),
    "price_estimated" DECIMAL(12,4),
    "quantity_received" DECIMAL(12,2) DEFAULT 0,
    "unit" VARCHAR(20) DEFAULT 'kg',
    "notes" TEXT,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER,
    "order_number" VARCHAR(50),
    "date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expected_date" TIMESTAMP(6),
    "status" VARCHAR(20) DEFAULT 'pending',
    "notes" TEXT,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_parameters" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "name" VARCHAR(120),
    "type" VARCHAR(30),
    "unit" VARCHAR(20),
    "min_value" DECIMAL(10,2),
    "max_value" DECIMAL(10,2),
    "required" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_quality_photos" (
    "id" SERIAL NOT NULL,
    "receipt_id" INTEGER,
    "url" TEXT,
    "description" TEXT,
    "uploaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_quality_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_quality_values" (
    "id" SERIAL NOT NULL,
    "receipt_id" INTEGER,
    "parameter_id" INTEGER,
    "value" DECIMAL(12,4),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_quality_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" SERIAL NOT NULL,
    "producer_id" INTEGER,
    "supplier_id" INTEGER,
    "product_id" INTEGER,
    "lot" VARCHAR(50),
    "weight_gross" DECIMAL(12,2),
    "humidity" DECIMAL(5,2),
    "impurities" DECIMAL(5,2),
    "weight_net" DECIMAL(12,2),
    "financed_percent" DECIMAL(5,2),
    "financed_weight" DECIMAL(12,2),
    "free_weight" DECIMAL(12,2),
    "price" DECIMAL(12,4),
    "price_equivalent" DECIMAL(12,4),
    "date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER,
    "product_id" INTEGER,
    "quantity" DECIMAL(12,2),
    "price" DECIMAL(12,4),
    "subtotal" DECIMAL(12,2),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_lot_movements" (
    "id" SERIAL NOT NULL,
    "sale_item_id" INTEGER,
    "lot_id" INTEGER,
    "quantity" DECIMAL(12,2),
    "cost" DECIMAL(12,4),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_lot_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER,
    "invoice_number" VARCHAR(50),
    "date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(12,2),
    "currency" VARCHAR(10) DEFAULT 'USD',
    "rate" DECIMAL(12,4),
    "status" VARCHAR(20) DEFAULT 'pending',
    "notes" TEXT,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "rif" VARCHAR(20),
    "phone" VARCHAR(30),
    "address" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_deliveries" (
    "id" SERIAL NOT NULL,
    "producer_id" INTEGER,
    "insumo" VARCHAR(120),
    "quantity" DECIMAL(12,2),
    "cost" DECIMAL(12,2),
    "date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "supply_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_reports" (
    "id" SERIAL NOT NULL,
    "producer_id" INTEGER,
    "crop_plan_id" INTEGER,
    "report" TEXT,
    "photo_url" TEXT,
    "date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "stage" VARCHAR(50),
    "issues" TEXT,

    CONSTRAINT "technical_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100),
    "email" VARCHAR(120) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" INTEGER,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "location" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(200) NOT NULL,
    "name" VARCHAR(150),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceMovement" (
    "id" SERIAL NOT NULL,
    "company" TEXT,
    "producerId" INTEGER NOT NULL,
    "cropPlanId" INTEGER,
    "type" VARCHAR(20) NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "amountBs" DOUBLE PRECISION NOT NULL,
    "rateBcv" DOUBLE PRECISION NOT NULL,
    "description" VARCHAR(255),
    "commissionType" TEXT,
    "commissionRate" DOUBLE PRECISION,
    "commissionCurrency" TEXT,
    "documentType" VARCHAR(30),
    "documentNumber" VARCHAR(50),
    "cycle" VARCHAR(30),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeAccount" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "type" "AdministrativeAccountType" NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdministrativeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeMovement" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "type" "AdministrativeMovementType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdministrativeMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeTransfer" (
    "id" SERIAL NOT NULL,
    "fromAccountId" INTEGER NOT NULL,
    "toAccountId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdministrativeTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoice_number_key" ON "sales"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_email_key" ON "auth_users"("email");

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crop_plans" ADD CONSTRAINT "crop_plans_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "liquidation_receipts" ADD CONSTRAINT "liquidation_receipts_liquidation_id_fkey" FOREIGN KEY ("liquidation_id") REFERENCES "producer_liquidations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "liquidation_receipts" ADD CONSTRAINT "liquidation_receipts_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "producer_finance_accounts" ADD CONSTRAINT "producer_finance_accounts_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "producer_liquidations" ADD CONSTRAINT "producer_liquidations_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "purchase_invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quality_parameters" ADD CONSTRAINT "quality_parameters_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "receipt_quality_photos" ADD CONSTRAINT "receipt_quality_photos_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "receipt_quality_values" ADD CONSTRAINT "receipt_quality_values_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "receipt_quality_values" ADD CONSTRAINT "receipt_quality_values_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_lot_movements" ADD CONSTRAINT "sale_lot_movements_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_lot_movements" ADD CONSTRAINT "sale_lot_movements_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supply_deliveries" ADD CONSTRAINT "supply_deliveries_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "technical_reports" ADD CONSTRAINT "technical_reports_crop_plan_id_fkey" FOREIGN KEY ("crop_plan_id") REFERENCES "crop_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "technical_reports" ADD CONSTRAINT "technical_reports_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceMovement" ADD CONSTRAINT "FinanceMovement_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceMovement" ADD CONSTRAINT "FinanceMovement_cropPlanId_fkey" FOREIGN KEY ("cropPlanId") REFERENCES "crop_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeMovement" ADD CONSTRAINT "AdministrativeMovement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AdministrativeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeMovement" ADD CONSTRAINT "AdministrativeMovement_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "AdministrativeTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeTransfer" ADD CONSTRAINT "AdministrativeTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "AdministrativeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeTransfer" ADD CONSTRAINT "AdministrativeTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "AdministrativeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
