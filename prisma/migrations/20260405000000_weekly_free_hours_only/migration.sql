-- Drop per-day free-period limits; constraints are weekly-only going forward.
ALTER TABLE "ScheduleConstraint" DROP COLUMN IF EXISTS "minFreePerDay";
ALTER TABLE "ScheduleConstraint" DROP COLUMN IF EXISTS "maxFreePerDay";
