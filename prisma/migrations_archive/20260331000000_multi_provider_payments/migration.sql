-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('RAZORPAY', 'PHONEPE', 'PAYPAL', 'STRIPE');

-- CreateTable
CREATE TABLE "SchoolPaymentProviderConfig" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publicKey" TEXT NOT NULL,
    "secretEncrypted" TEXT NOT NULL,
    "webhookSecretEncrypted" TEXT,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolPaymentProviderConfig_pkey" PRIMARY KEY ("id")
);

-- Migrate existing Razorpay configs
INSERT INTO "SchoolPaymentProviderConfig" (
    "id", "schoolId", "provider", "isEnabled", "publicKey", "secretEncrypted",
    "webhookSecretEncrypted", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(),
    "schoolId",
    'RAZORPAY'::"PaymentProvider",
    true,
    "razorpayKeyId",
    "razorpayKeySecretEncrypted",
    "webhookSecretEncrypted",
    "createdAt",
    "updatedAt"
FROM "SchoolPaymentConfig";

-- Alter Payment: add new columns
ALTER TABLE "Payment" ADD COLUMN "provider" "PaymentProvider";
ALTER TABLE "Payment" ADD COLUMN "externalOrderId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "externalPaymentId" TEXT;

-- Migrate existing payment data
UPDATE "Payment"
SET
    "provider" = 'RAZORPAY'::"PaymentProvider",
    "externalOrderId" = "razorpayOrderId",
    "externalPaymentId" = "razorpayPaymentId"
WHERE "razorpayOrderId" IS NOT NULL OR "razorpayPaymentId" IS NOT NULL;

-- Drop old Payment columns
ALTER TABLE "Payment" DROP COLUMN "razorpayOrderId";
ALTER TABLE "Payment" DROP COLUMN "razorpayPaymentId";

-- CreateIndex
CREATE UNIQUE INDEX "Payment_externalPaymentId_key" ON "Payment"("externalPaymentId");
CREATE INDEX "Payment_externalOrderId_idx" ON "Payment"("externalOrderId");
CREATE UNIQUE INDEX "SchoolPaymentProviderConfig_schoolId_provider_key" ON "SchoolPaymentProviderConfig"("schoolId", "provider");
CREATE INDEX "SchoolPaymentProviderConfig_schoolId_idx" ON "SchoolPaymentProviderConfig"("schoolId");

-- AddForeignKey
ALTER TABLE "SchoolPaymentProviderConfig" ADD CONSTRAINT "SchoolPaymentProviderConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old table
DROP TABLE "SchoolPaymentConfig";
