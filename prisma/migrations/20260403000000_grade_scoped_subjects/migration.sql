-- Move subjects from global catalog to grade-scoped
ALTER TABLE "Subject" ADD COLUMN "gradeId" UUID;

UPDATE "Subject" s
SET "gradeId" = gs."gradeId"
FROM "GradeSubject" gs
WHERE gs."subjectId" = s.id;

-- Assign orphan subjects to first grade in school (fallback)
UPDATE "Subject" s
SET "gradeId" = (
  SELECT g.id FROM "Grade" g WHERE g."schoolId" = s."schoolId" ORDER BY g."sortOrder", g.name LIMIT 1
)
WHERE s."gradeId" IS NULL;

ALTER TABLE "Subject" ALTER COLUMN "gradeId" SET NOT NULL;

ALTER TABLE "Subject" DROP CONSTRAINT IF EXISTS "Subject_schoolId_name_key";
DROP INDEX IF EXISTS "Subject_schoolId_name_key";

CREATE UNIQUE INDEX "Subject_gradeId_name_key" ON "Subject"("gradeId", "name");
CREATE INDEX "Subject_gradeId_idx" ON "Subject"("gradeId");

ALTER TABLE "Subject" ADD CONSTRAINT "Subject_gradeId_fkey"
  FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "GradeSubject";
