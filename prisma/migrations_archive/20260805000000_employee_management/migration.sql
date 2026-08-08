-- Employee Management & Payroll

-- AlterEnum: Role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF';

-- AlterEnum: LeaveRequesterType
ALTER TYPE "LeaveRequesterType" ADD VALUE IF NOT EXISTS 'STAFF';

-- CreateEnum
CREATE TYPE "EmployeeJobType" AS ENUM ('TEACHER', 'CLASS_TEACHER', 'PET_MASTER', 'LIBRARIAN', 'LAB_ASSISTANT', 'SPORTS_COACH', 'ACCOUNTANT', 'OFFICE_CLERK', 'RECEPTIONIST', 'VAN_DRIVER', 'BUS_DRIVER', 'TRANSPORT_COORDINATOR', 'SECURITY_GUARD', 'SECURITY_SUPERVISOR', 'CLEANER', 'JANITOR', 'GARDENER', 'MAINTENANCE_STAFF', 'CANTEEN_STAFF', 'NURSE', 'COUNSELLOR', 'PRINCIPAL', 'VICE_PRINCIPAL');
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PROBATION');
CREATE TYPE "PaymentFrequency" AS ENUM ('MONTHLY');
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "SalaryPayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED');
CREATE TYPE "StaffAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY');

-- CreateTable Employee
CREATE TABLE "Employee" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "jobType" "EmployeeJobType" NOT NULL,
    "department" TEXT,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "dateOfJoining" DATE NOT NULL,
    "dateOfLeaving" DATE,
    "emergencyContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeSalary" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "allowances" JSONB NOT NULL DEFAULT '{}',
    "deductions" JSONB NOT NULL DEFAULT '{}',
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "paymentFrequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeSalary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeBankAccount" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "accountNumberEncrypted" TEXT NOT NULL,
    "ifscEncrypted" TEXT NOT NULL,
    "upiIdEncrypted" TEXT,
    "bankName" TEXT,
    "razorpayContactId" TEXT,
    "razorpayFundAccountId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeBankAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollRun" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalaryPayout" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "payrollRunId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "deductions" JSONB NOT NULL DEFAULT '{}',
    "status" "SalaryPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "razorpayPayoutId" TEXT,
    "failureReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalaryPayout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolPayoutConfig" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "razorpayXAccountNumber" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "apiSecretEncrypted" TEXT NOT NULL,
    "webhookSecretEncrypted" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchoolPayoutConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolEmployeeJobTypeConfig" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "jobType" "EmployeeJobType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchoolEmployeeJobTypeConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportRoute" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicleNo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportRouteAssignment" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransportRouteAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityVisitorLog" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "loggedById" UUID NOT NULL,
    "visitorName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "phone" TEXT,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityVisitorLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CleanerZoneAssignment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "zoneName" TEXT NOT NULL,
    "tasks" JSONB NOT NULL DEFAULT '[]',
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CleanerZoneAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SportsSchedule" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "location" TEXT,
    "equipment" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SportsSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LibraryBook" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "isbn" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "available" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LibraryIssue" (
    "id" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "issuedTo" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATE NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibraryIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffAttendance" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "StaffAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "checkInAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

-- Indexes and FKs
CREATE UNIQUE INDEX "Employee_schoolId_userId_key" ON "Employee"("schoolId", "userId");
CREATE UNIQUE INDEX "Employee_schoolId_employeeCode_key" ON "Employee"("schoolId", "employeeCode");
CREATE INDEX "Employee_schoolId_jobType_idx" ON "Employee"("schoolId", "jobType");
CREATE INDEX "Employee_schoolId_employmentStatus_idx" ON "Employee"("schoolId", "employmentStatus");

CREATE INDEX "EmployeeSalary_schoolId_employeeId_idx" ON "EmployeeSalary"("schoolId", "employeeId");
CREATE INDEX "EmployeeSalary_employeeId_effectiveFrom_idx" ON "EmployeeSalary"("employeeId", "effectiveFrom");

CREATE INDEX "EmployeeBankAccount_schoolId_employeeId_idx" ON "EmployeeBankAccount"("schoolId", "employeeId");

CREATE INDEX "PayrollRun_schoolId_status_idx" ON "PayrollRun"("schoolId", "status");
CREATE INDEX "PayrollRun_schoolId_periodStart_idx" ON "PayrollRun"("schoolId", "periodStart");

CREATE UNIQUE INDEX "SalaryPayout_idempotencyKey_key" ON "SalaryPayout"("idempotencyKey");
CREATE INDEX "SalaryPayout_schoolId_status_idx" ON "SalaryPayout"("schoolId", "status");
CREATE INDEX "SalaryPayout_payrollRunId_idx" ON "SalaryPayout"("payrollRunId");
CREATE INDEX "SalaryPayout_employeeId_idx" ON "SalaryPayout"("employeeId");

CREATE UNIQUE INDEX "SchoolPayoutConfig_schoolId_key" ON "SchoolPayoutConfig"("schoolId");

CREATE UNIQUE INDEX "SchoolEmployeeJobTypeConfig_schoolId_jobType_key" ON "SchoolEmployeeJobTypeConfig"("schoolId", "jobType");
CREATE INDEX "SchoolEmployeeJobTypeConfig_schoolId_idx" ON "SchoolEmployeeJobTypeConfig"("schoolId");

CREATE INDEX "TransportRoute_schoolId_idx" ON "TransportRoute"("schoolId");
CREATE UNIQUE INDEX "TransportRouteAssignment_routeId_employeeId_key" ON "TransportRouteAssignment"("routeId", "employeeId");
CREATE INDEX "TransportRouteAssignment_employeeId_idx" ON "TransportRouteAssignment"("employeeId");

CREATE INDEX "SecurityVisitorLog_schoolId_checkInAt_idx" ON "SecurityVisitorLog"("schoolId", "checkInAt");

CREATE UNIQUE INDEX "CleanerZoneAssignment_employeeId_zoneName_date_key" ON "CleanerZoneAssignment"("employeeId", "zoneName", "date");
CREATE INDEX "CleanerZoneAssignment_schoolId_date_idx" ON "CleanerZoneAssignment"("schoolId", "date");

CREATE INDEX "SportsSchedule_schoolId_eventDate_idx" ON "SportsSchedule"("schoolId", "eventDate");
CREATE INDEX "LibraryBook_schoolId_idx" ON "LibraryBook"("schoolId");
CREATE INDEX "LibraryIssue_bookId_idx" ON "LibraryIssue"("bookId");

CREATE UNIQUE INDEX "StaffAttendance_schoolId_employeeId_date_key" ON "StaffAttendance"("schoolId", "employeeId", "date");
CREATE INDEX "StaffAttendance_schoolId_date_idx" ON "StaffAttendance"("schoolId", "date");

-- Foreign Keys
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeSalary" ADD CONSTRAINT "EmployeeSalary_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSalary" ADD CONSTRAINT "EmployeeSalary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeBankAccount" ADD CONSTRAINT "EmployeeBankAccount_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeBankAccount" ADD CONSTRAINT "EmployeeBankAccount_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalaryPayout" ADD CONSTRAINT "SalaryPayout_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalaryPayout" ADD CONSTRAINT "SalaryPayout_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalaryPayout" ADD CONSTRAINT "SalaryPayout_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolPayoutConfig" ADD CONSTRAINT "SchoolPayoutConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolEmployeeJobTypeConfig" ADD CONSTRAINT "SchoolEmployeeJobTypeConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportRouteAssignment" ADD CONSTRAINT "TransportRouteAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportRouteAssignment" ADD CONSTRAINT "TransportRouteAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportRouteAssignment" ADD CONSTRAINT "TransportRouteAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SecurityVisitorLog" ADD CONSTRAINT "SecurityVisitorLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityVisitorLog" ADD CONSTRAINT "SecurityVisitorLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CleanerZoneAssignment" ADD CONSTRAINT "CleanerZoneAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleanerZoneAssignment" ADD CONSTRAINT "CleanerZoneAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SportsSchedule" ADD CONSTRAINT "SportsSchedule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryIssue" ADD CONSTRAINT "LibraryIssue_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
