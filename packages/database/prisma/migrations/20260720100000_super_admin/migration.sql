-- AlterEnum: add platform-wide SUPER_ADMIN
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- Platform SUPER_ADMIN profiles have no school tenant
ALTER TABLE "Profile" ALTER COLUMN "tenantId" DROP NOT NULL;

-- Helpful index for role lookups (e.g. find platform operators)
CREATE INDEX IF NOT EXISTS "Profile_role_idx" ON "Profile"("role");
CREATE INDEX IF NOT EXISTS "Profile_email_idx" ON "Profile"("email");
