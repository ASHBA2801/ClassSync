-- Allow multiple roles per user per school (e.g. TEACHER + PARENT)
DROP INDEX IF EXISTS "UserSchoolMembership_userId_schoolId_key";

CREATE UNIQUE INDEX "UserSchoolMembership_userId_schoolId_role_key"
  ON "UserSchoolMembership"("userId", "schoolId", "role");
