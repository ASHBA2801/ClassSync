-- AlterTable
ALTER TABLE "User" ADD COLUMN "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "fatherName" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherName" TEXT;
