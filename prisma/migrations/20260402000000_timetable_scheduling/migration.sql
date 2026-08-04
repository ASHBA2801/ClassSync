-- Extend ScheduleConstraint for per-day and per-week free period limits
ALTER TABLE "ScheduleConstraint" RENAME COLUMN "minFreePeriods" TO "minFreePerWeek";
ALTER TABLE "ScheduleConstraint" RENAME COLUMN "maxFreePeriods" TO "maxFreePerWeek";

ALTER TABLE "ScheduleConstraint" ADD COLUMN "minFreePerDay" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScheduleConstraint" ADD COLUMN "maxFreePerDay" INTEGER NOT NULL DEFAULT 3;

-- School-level schedule configuration
CREATE TABLE "SchoolScheduleConfig" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "daysPerWeek" INTEGER NOT NULL DEFAULT 5,
    "workingDays" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4],

    CONSTRAINT "SchoolScheduleConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolScheduleConfig_schoolId_key" ON "SchoolScheduleConfig"("schoolId");

ALTER TABLE "SchoolScheduleConfig" ADD CONSTRAINT "SchoolScheduleConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
