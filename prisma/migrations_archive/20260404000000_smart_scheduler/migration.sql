-- Smart scheduler: temporary schedule alterations, swap groups, and stats

CREATE TYPE "ScheduleAlterationType" AS ENUM ('LEAVE_SUBSTITUTION', 'SWAP', 'ADMIN_OVERRIDE');
CREATE TYPE "ScheduleAlterationStatus" AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TYPE "ScheduleSwapType" AS ENUM ('COMPLEMENTARY_FREE', 'PARALLEL_SECTIONS');

ALTER TABLE "LeaveRequest"
  ADD COLUMN "substitutionsGenerated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "alteredClassCount" INTEGER;

CREATE TABLE "ScheduleSwapGroup" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "type" "ScheduleSwapType" NOT NULL,
  "teacherAId" UUID NOT NULL,
  "teacherBId" UUID NOT NULL,
  "note" TEXT,
  "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScheduleSwapGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduleAlteration" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "date" DATE NOT NULL,
  "periodNo" INTEGER NOT NULL,
  "classSectionId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "originalTeacherId" UUID NOT NULL,
  "substituteTeacherId" UUID NOT NULL,
  "type" "ScheduleAlterationType" NOT NULL,
  "priorityLevel" INTEGER,
  "leaveRequestId" UUID,
  "swapGroupId" UUID,
  "status" "ScheduleAlterationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScheduleAlteration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherAlterationStat" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "teacherId" UUID NOT NULL,
  "asSubstituteCount" INTEGER NOT NULL DEFAULT 0,
  "classesAlteredForCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeacherAlterationStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduleAlteration_schoolId_date_periodNo_classSectionId_status_key"
  ON "ScheduleAlteration"("schoolId", "date", "periodNo", "classSectionId", "status");

CREATE INDEX "ScheduleAlteration_schoolId_date_idx" ON "ScheduleAlteration"("schoolId", "date");
CREATE INDEX "ScheduleAlteration_schoolId_originalTeacherId_idx" ON "ScheduleAlteration"("schoolId", "originalTeacherId");
CREATE INDEX "ScheduleAlteration_schoolId_substituteTeacherId_idx" ON "ScheduleAlteration"("schoolId", "substituteTeacherId");
CREATE INDEX "ScheduleAlteration_leaveRequestId_idx" ON "ScheduleAlteration"("leaveRequestId");
CREATE INDEX "ScheduleAlteration_swapGroupId_idx" ON "ScheduleAlteration"("swapGroupId");

CREATE INDEX "ScheduleSwapGroup_schoolId_idx" ON "ScheduleSwapGroup"("schoolId");

CREATE UNIQUE INDEX "TeacherAlterationStat_schoolId_teacherId_key"
  ON "TeacherAlterationStat"("schoolId", "teacherId");

ALTER TABLE "ScheduleSwapGroup"
  ADD CONSTRAINT "ScheduleSwapGroup_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduleSwapGroup"
  ADD CONSTRAINT "ScheduleSwapGroup_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduleAlteration"
  ADD CONSTRAINT "ScheduleAlteration_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduleAlteration"
  ADD CONSTRAINT "ScheduleAlteration_classSectionId_fkey"
  FOREIGN KEY ("classSectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScheduleAlteration"
  ADD CONSTRAINT "ScheduleAlteration_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScheduleAlteration"
  ADD CONSTRAINT "ScheduleAlteration_leaveRequestId_fkey"
  FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleAlteration"
  ADD CONSTRAINT "ScheduleAlteration_swapGroupId_fkey"
  FOREIGN KEY ("swapGroupId") REFERENCES "ScheduleSwapGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleAlteration"
  ADD CONSTRAINT "ScheduleAlteration_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeacherAlterationStat"
  ADD CONSTRAINT "TeacherAlterationStat_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeacherAlterationStat"
  ADD CONSTRAINT "TeacherAlterationStat_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
