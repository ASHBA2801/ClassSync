-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('REGULAR', 'OD');

-- CreateEnum
CREATE TYPE "LeaveAllowancePeriod" AS ENUM ('MONTH', 'YEAR');

-- AlterEnum
ALTER TYPE "TeacherAttendanceStatus" ADD VALUE 'ABSENT';

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN "leaveType" "LeaveType" NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE "SchoolEmployeeJobTypeConfig" ADD COLUMN "minimumLeaves" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SchoolEmployeeJobTypeConfig" ADD COLUMN "leaveAllowancePeriod" "LeaveAllowancePeriod" NOT NULL DEFAULT 'MONTH';

-- CreateTable
CREATE TABLE "SchoolCalendarDay" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolCalendarDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolCalendarDay_schoolId_date_idx" ON "SchoolCalendarDay"("schoolId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolCalendarDay_schoolId_date_key" ON "SchoolCalendarDay"("schoolId", "date");

-- AddForeignKey
ALTER TABLE "SchoolCalendarDay" ADD CONSTRAINT "SchoolCalendarDay_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
