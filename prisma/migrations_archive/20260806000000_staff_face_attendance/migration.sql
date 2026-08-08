-- Staff face recognition attendance

ALTER TYPE "StaffAttendanceStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "StaffAttendanceStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "StaffAttendanceStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';

ALTER TABLE "StaffAttendance" ADD COLUMN IF NOT EXISTS "markedAt" TIMESTAMP(3);
ALTER TABLE "StaffAttendance" ADD COLUMN IF NOT EXISTS "geoLat" DOUBLE PRECISION;
ALTER TABLE "StaffAttendance" ADD COLUMN IF NOT EXISTS "geoLng" DOUBLE PRECISION;
ALTER TABLE "StaffAttendance" ADD COLUMN IF NOT EXISTS "method" TEXT;

ALTER TABLE "StaffAttendance" ALTER COLUMN "status" SET DEFAULT 'PROCESSING';

CREATE TABLE IF NOT EXISTS "StaffAttendanceAttempt" (
    "id" UUID NOT NULL,
    "staffAttendanceId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "evidenceImageKey" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAttendanceAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StaffAttendanceAttempt_staffAttendanceId_idx" ON "StaffAttendanceAttempt"("staffAttendanceId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'StaffAttendanceAttempt_staffAttendanceId_fkey'
    ) THEN
        ALTER TABLE "StaffAttendanceAttempt"
            ADD CONSTRAINT "StaffAttendanceAttempt_staffAttendanceId_fkey"
            FOREIGN KEY ("staffAttendanceId") REFERENCES "StaffAttendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
