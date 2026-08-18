-- CreateEnum
CREATE TYPE "CoreSubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoreInvoiceStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "CorePricingPlan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxUsers" INTEGER NOT NULL,
    "priceAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "interval" TEXT NOT NULL DEFAULT 'YEAR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorePricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSubscription" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "CoreSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "userLimit" INTEGER NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreModuleInvoice" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "CoreInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider",
    "externalOrderId" TEXT,
    "externalPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "CoreModuleInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorePricingPlan_isActive_sortOrder_idx" ON "CorePricingPlan"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSubscription_schoolId_key" ON "SchoolSubscription"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolSubscription_planId_idx" ON "SchoolSubscription"("planId");

-- CreateIndex
CREATE INDEX "SchoolSubscription_status_idx" ON "SchoolSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CoreModuleInvoice_externalPaymentId_key" ON "CoreModuleInvoice"("externalPaymentId");

-- CreateIndex
CREATE INDEX "CoreModuleInvoice_schoolId_status_idx" ON "CoreModuleInvoice"("schoolId", "status");

-- CreateIndex
CREATE INDEX "CoreModuleInvoice_externalOrderId_idx" ON "CoreModuleInvoice"("externalOrderId");

-- AddForeignKey
ALTER TABLE "SchoolSubscription" ADD CONSTRAINT "SchoolSubscription_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSubscription" ADD CONSTRAINT "SchoolSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CorePricingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreModuleInvoice" ADD CONSTRAINT "CoreModuleInvoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreModuleInvoice" ADD CONSTRAINT "CoreModuleInvoice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CorePricingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "CorePricingPlan" ("id", "name", "description", "maxUsers", "priceAmount", "currency", "interval", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '50 Users', 'Core ClassSync module for up to 50 login users (admins, teachers, staff, and parents).', 50, 24999.00, 'INR', 'YEAR', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '100 Users', 'Core ClassSync module for up to 100 login users (admins, teachers, staff, and parents).', 100, 44999.00, 'INR', 'YEAR', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
