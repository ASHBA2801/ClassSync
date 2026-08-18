-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR', 'BIRTH_CERTIFICATE', 'COMMUNITY_CERTIFICATE', 'MARKSHEET', 'MEDICAL_CERTIFICATE');

-- CreateEnum
CREATE TYPE "UploaderType" AS ENUM ('PARENT', 'TEACHER');

-- AlterEnum
ALTER TYPE "StudentAttendanceStatus" ADD VALUE 'HALF_DAY';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "documentType" "DocumentType",
ADD COLUMN     "extracted" JSONB,
ADD COLUMN     "extractionConfidence" DOUBLE PRECISION,
ADD COLUMN     "uploaderType" "UploaderType" NOT NULL DEFAULT 'PARENT';

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "halfDaySession" TEXT,
ADD COLUMN     "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "medicalCertName" TEXT,
ADD COLUMN     "medicalCertS3Key" TEXT;

-- AlterTable
ALTER TABLE "StudentAttendance" ADD COLUMN     "leaveRequestId" UUID,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "session" TEXT;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
