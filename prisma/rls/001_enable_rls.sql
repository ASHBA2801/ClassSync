-- Row-Level Security policies for tenant isolation
-- Run after initial Prisma migration

-- Helper: tables with school_id column
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'Student', 'GuardianRelationship', 'Grade', 'ClassSection', 'Subject',
    'TeacherAssignment', 'PeriodTiming', 'ScheduleVersion', 'ScheduleSlot',
    'ScheduleConstraint', 'SchoolScheduleConfig', 'ScheduleAlteration', 'ScheduleSwapGroup',
    'TeacherAlterationStat', 'TeacherAttendance', 'StudentAttendance',
    'LeaveRequest', 'Document', 'FeeStructure', 'FeeInvoice', 'Payment',
    'SchoolSubscription', 'CoreModuleInvoice',
    'NotificationLog', 'PushSubscription', 'AIServiceKey',
    'Employee', 'EmployeeSalary', 'EmployeeBankAccount', 'PayrollRun', 'SalaryPayout',
    'SchoolEmployeeJobTypeConfig', 'SchoolCalendarDay', 'TransportRoute', 'SecurityVisitorLog',
    'CleanerZoneAssignment', 'SportsSchedule', 'LibraryBook', 'StaffAttendance'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (
        current_setting(''app.bypass_rls'', true) = ''true''
        OR "schoolId" = NULLIF(current_setting(''app.current_school_id'', true), '''')::uuid
      )',
      tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS tenant_insert ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_insert ON %I FOR INSERT WITH CHECK (
        current_setting(''app.bypass_rls'', true) = ''true''
        OR "schoolId" = NULLIF(current_setting(''app.current_school_id'', true), '''')::uuid
      )',
      tbl
    );
  END LOOP;
END $$;

-- UserSchoolMembership RLS
ALTER TABLE "UserSchoolMembership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS membership_isolation ON "UserSchoolMembership";
CREATE POLICY membership_isolation ON "UserSchoolMembership" USING (
  current_setting('app.bypass_rls', true) = 'true'
  OR "schoolId" = NULLIF(current_setting('app.current_school_id', true), '')::uuid
);

-- SchoolPaymentProviderConfig RLS
ALTER TABLE "SchoolPaymentProviderConfig" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_config_isolation ON "SchoolPaymentProviderConfig";
CREATE POLICY payment_config_isolation ON "SchoolPaymentProviderConfig" USING (
  current_setting('app.bypass_rls', true) = 'true'
  OR "schoolId" = NULLIF(current_setting('app.current_school_id', true), '')::uuid
);

-- SchoolPayoutConfig RLS
ALTER TABLE "SchoolPayoutConfig" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payout_config_isolation ON "SchoolPayoutConfig";
CREATE POLICY payout_config_isolation ON "SchoolPayoutConfig" USING (
  current_setting('app.bypass_rls', true) = 'true'
  OR "schoolId" = NULLIF(current_setting('app.current_school_id', true), '')::uuid
);

-- TransportRouteAssignment via employee school
ALTER TABLE "TransportRouteAssignment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS route_assignment_isolation ON "TransportRouteAssignment";
CREATE POLICY route_assignment_isolation ON "TransportRouteAssignment" USING (
  current_setting('app.bypass_rls', true) = 'true'
  OR EXISTS (
    SELECT 1 FROM "Employee" e
    WHERE e.id = "TransportRouteAssignment"."employeeId"
    AND e."schoolId" = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  )
);

-- LibraryIssue via book school
ALTER TABLE "LibraryIssue" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS library_issue_isolation ON "LibraryIssue";
CREATE POLICY library_issue_isolation ON "LibraryIssue" USING (
  current_setting('app.bypass_rls', true) = 'true'
  OR EXISTS (
    SELECT 1 FROM "LibraryBook" b
    WHERE b.id = "LibraryIssue"."bookId"
    AND b."schoolId" = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  )
);

ALTER TABLE "AttendanceAttempt" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attempt_isolation ON "AttendanceAttempt";
CREATE POLICY attempt_isolation ON "AttendanceAttempt" USING (
  current_setting('app.bypass_rls', true) = 'true'
  OR EXISTS (
    SELECT 1 FROM "TeacherAttendance" ta
    WHERE ta.id = "AttendanceAttempt"."teacherAttendanceId"
    AND ta."schoolId" = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  )
);

ALTER TABLE "StaffAttendanceAttempt" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_attempt_isolation ON "StaffAttendanceAttempt";
CREATE POLICY staff_attempt_isolation ON "StaffAttendanceAttempt" USING (
  current_setting('app.bypass_rls', true) = 'true'
  OR EXISTS (
    SELECT 1 FROM "StaffAttendance" sa
    WHERE sa.id = "StaffAttendanceAttempt"."staffAttendanceId"
    AND sa."schoolId" = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  )
);
