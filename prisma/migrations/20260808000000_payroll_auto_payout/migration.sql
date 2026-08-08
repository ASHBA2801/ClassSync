-- AlterTable
ALTER TABLE "SchoolPayoutConfig" ADD COLUMN "autoPayoutEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SchoolPayoutConfig" ADD COLUMN "payrollRunDay" INTEGER NOT NULL DEFAULT 0;
