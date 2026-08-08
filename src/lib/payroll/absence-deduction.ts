import type { EmployeeJobType } from "@prisma/client";
import {
  computeDeductibleAbsentDays,
  dateToIsoKey,
  resolveWorkingDayKeys,
  subtractOdDates,
} from "@/lib/calendar/working-days";
import { TEACHING_JOB_TYPES } from "@/lib/employees/job-types";
import { getDailyRate } from "@/lib/employees/salary";

type Tx = Parameters<Parameters<typeof import("@/lib/db/prisma").withTenantContext>[1]>[0];

export async function loadCalendarOverrides(
  tx: Tx,
  schoolId: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const rows = await tx.schoolCalendarDay.findMany({
    where: {
      schoolId,
      date: { gte: rangeStart, lte: rangeEnd },
    },
  });

  return new Map(
    rows.map((row) => [
      dateToIsoKey(row.date),
      { isWorkingDay: row.isWorkingDay, note: row.note },
    ]),
  );
}

export async function getWeekdayTemplate(tx: Tx, schoolId: string) {
  const config = await tx.schoolScheduleConfig.findUnique({ where: { schoolId } });
  return config?.workingDays ?? [0, 1, 2, 3, 4];
}

export async function countWorkingDaysInPeriod(
  tx: Tx,
  schoolId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const weekdayTemplate = await getWeekdayTemplate(tx, schoolId);
  const overrides = await loadCalendarOverrides(tx, schoolId, periodStart, periodEnd);
  return resolveWorkingDayKeys(periodStart, periodEnd, weekdayTemplate, overrides).length;
}

async function getAbsentDateKeysForEmployee(
  tx: Tx,
  schoolId: string,
  employeeId: string,
  userId: string,
  jobType: EmployeeJobType,
  workingDayKeys: Set<string>,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<string[]> {
  const isTeacher = TEACHING_JOB_TYPES.includes(jobType);

  if (isTeacher) {
    const records = await tx.teacherAttendance.findMany({
      where: {
        schoolId,
        teacherId: userId,
        status: "ABSENT",
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: { date: true },
    });
    return records.map((record) => dateToIsoKey(record.date)).filter((key) => workingDayKeys.has(key));
  }

  const records = await tx.staffAttendance.findMany({
    where: {
      schoolId,
      employeeId,
      status: "ABSENT",
      date: { gte: rangeStart, lte: rangeEnd },
    },
    select: { date: true },
  });
  return records.map((record) => dateToIsoKey(record.date)).filter((key) => workingDayKeys.has(key));
}

async function getApprovedOdLeaves(
  tx: Tx,
  schoolId: string,
  userId: string,
  jobType: EmployeeJobType,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const requesterType = TEACHING_JOB_TYPES.includes(jobType) ? "TEACHER" : "STAFF";
  return tx.leaveRequest.findMany({
    where: {
      schoolId,
      requesterId: userId,
      requesterType,
      status: "APPROVED",
      leaveType: "OD",
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
    },
    select: { startDate: true, endDate: true },
  });
}

async function getRoleLeaveAllowance(tx: Tx, schoolId: string, jobType: EmployeeJobType) {
  const config = await tx.schoolEmployeeJobTypeConfig.findUnique({
    where: { schoolId_jobType: { schoolId, jobType } },
  });
  return {
    minimumLeaves: config?.minimumLeaves ?? 0,
    leaveAllowancePeriod: config?.leaveAllowancePeriod ?? ("MONTH" as const),
  };
}

export async function computeEmployeeAbsenceDeduction(
  tx: Tx,
  schoolId: string,
  employee: { id: string; userId: string; jobType: EmployeeJobType },
  periodStart: Date,
  periodEnd: Date,
  baseSalary: number,
) {
  const weekdayTemplate = await getWeekdayTemplate(tx, schoolId);
  const yearStart = new Date(Date.UTC(periodStart.getUTCFullYear(), 0, 1));
  const overrides = await loadCalendarOverrides(tx, schoolId, yearStart, periodEnd);

  const workingDayKeysInPeriod = resolveWorkingDayKeys(
    periodStart,
    periodEnd,
    weekdayTemplate,
    overrides,
  );
  const workingDaySet = new Set(workingDayKeysInPeriod);
  const workingDaysCount = workingDayKeysInPeriod.length || 1;
  const dailyRate = getDailyRate(baseSalary, workingDaysCount);

  const absentInPeriod = await getAbsentDateKeysForEmployee(
    tx,
    schoolId,
    employee.id,
    employee.userId,
    employee.jobType,
    workingDaySet,
    periodStart,
    periodEnd,
  );

  const odLeavesInPeriod = await getApprovedOdLeaves(
    tx,
    schoolId,
    employee.userId,
    employee.jobType,
    periodStart,
    periodEnd,
  );
  const absentAfterOdInPeriod = subtractOdDates(absentInPeriod, odLeavesInPeriod);

  const { minimumLeaves, leaveAllowancePeriod } = await getRoleLeaveAllowance(
    tx,
    schoolId,
    employee.jobType,
  );

  let ytdAbsentKeys: string[] | undefined;
  if (leaveAllowancePeriod === "YEAR") {
    const workingDayKeysYtd = resolveWorkingDayKeys(yearStart, periodEnd, weekdayTemplate, overrides);
    const workingDaySetYtd = new Set(workingDayKeysYtd);
    const absentYtd = await getAbsentDateKeysForEmployee(
      tx,
      schoolId,
      employee.id,
      employee.userId,
      employee.jobType,
      workingDaySetYtd,
      yearStart,
      periodEnd,
    );
    const odLeavesYtd = await getApprovedOdLeaves(
      tx,
      schoolId,
      employee.userId,
      employee.jobType,
      yearStart,
      periodEnd,
    );
    ytdAbsentKeys = subtractOdDates(absentYtd, odLeavesYtd);
  }

  const unpaidLeaveDays = computeDeductibleAbsentDays({
    absentKeysInPeriod: absentAfterOdInPeriod,
    minimumLeaves,
    leaveAllowancePeriod,
    periodStart,
    periodEnd,
    ytdAbsentKeys,
  });

  return { unpaidLeaveDays, dailyRate, workingDaysCount };
}
