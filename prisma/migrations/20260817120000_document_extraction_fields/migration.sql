-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "DocumentType" AS ENUM ('AADHAAR', 'BIRTH_CERTIFICATE', 'COMMUNITY_CERTIFICATE', 'MARKSHEET');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "UploaderType" AS ENUM ('PARENT', 'TEACHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "documentType" "DocumentType";
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "uploaderType" "UploaderType" NOT NULL DEFAULT 'PARENT';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "extracted" JSONB;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "extractionConfidence" DOUBLE PRECISION;
