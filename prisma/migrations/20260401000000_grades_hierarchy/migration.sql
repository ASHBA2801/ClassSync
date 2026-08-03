-- CreateTable Grade
CREATE TABLE "Grade" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable GradeSubject
CREATE TABLE "GradeSubject" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "gradeId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "periodsPerWeek" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "GradeSubject_pkey" PRIMARY KEY ("id")
);

-- Seed Grade rows from distinct ClassSection grade values
INSERT INTO "Grade" ("id", "schoolId", "name", "sortOrder", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    cs."schoolId",
    'Grade ' || cs."grade",
    CASE WHEN cs."grade" ~ '^\d+$' THEN cs."grade"::integer ELSE 0 END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "schoolId", "grade"
    FROM "ClassSection"
) cs;

-- Add gradeId to ClassSection (nullable first for backfill)
ALTER TABLE "ClassSection" ADD COLUMN "gradeId" UUID;

UPDATE "ClassSection" cs
SET "gradeId" = g."id"
FROM "Grade" g
WHERE g."schoolId" = cs."schoolId"
  AND g."name" = 'Grade ' || cs."grade";

-- Make gradeId required
ALTER TABLE "ClassSection" ALTER COLUMN "gradeId" SET NOT NULL;

-- Drop old unique constraint and add new one
ALTER TABLE "ClassSection" DROP CONSTRAINT IF EXISTS "ClassSection_schoolId_grade_section_key";
CREATE UNIQUE INDEX "ClassSection_schoolId_gradeId_section_key" ON "ClassSection"("schoolId", "gradeId", "section");
CREATE INDEX "ClassSection_gradeId_idx" ON "ClassSection"("gradeId");

-- Add periodsPerWeek to TeacherAssignment
ALTER TABLE "TeacherAssignment" ADD COLUMN "periodsPerWeek" INTEGER;

-- Add gradeId to FeeStructure
ALTER TABLE "FeeStructure" ADD COLUMN "gradeId" UUID;
CREATE INDEX "FeeStructure_gradeId_idx" ON "FeeStructure"("gradeId");

-- Foreign keys
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Grade_schoolId_name_key" ON "Grade"("schoolId", "name");
CREATE INDEX "Grade_schoolId_idx" ON "Grade"("schoolId");

ALTER TABLE "ClassSection" ADD CONSTRAINT "ClassSection_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GradeSubject" ADD CONSTRAINT "GradeSubject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeSubject" ADD CONSTRAINT "GradeSubject_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeSubject" ADD CONSTRAINT "GradeSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "GradeSubject_gradeId_subjectId_key" ON "GradeSubject"("gradeId", "subjectId");
CREATE INDEX "GradeSubject_schoolId_idx" ON "GradeSubject"("schoolId");

ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
