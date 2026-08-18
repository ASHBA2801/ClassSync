import { hash } from "bcryptjs";
import { EmployeeJobType, type Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db/prisma";
import { encrypt } from "../src/lib/encryption";
import { encryptBankField } from "../src/lib/employees/bank";
import { seedPermissions } from "../src/lib/rbac/permissions";
import { analyzeScheduleFeasibility } from "../src/lib/scheduler/errors";
import { solveSchedule, validateSectionScheduleQuality } from "../src/lib/scheduler/solver";

const DEMO_SCHOOL_SLUG = "demo-school";
const DEMO_SCHOOL_B_SLUG = "demo-school-b";

const DEMO_DAYS_PER_WEEK = 5;
const DEMO_PERIODS_PER_DAY = 8;
const DEMO_TOTAL_WEEKLY_SLOTS = DEMO_DAYS_PER_WEEK * DEMO_PERIODS_PER_DAY;
const DEMO_MIN_FREE_PER_WEEK = 1;
const DEMO_MAX_FREE_PER_WEEK = 35;
const STUDENTS_PER_CLASS = 40;

const DEMO_TEACHERS = [
  { email: "teacher@demo.com", name: "Demo Teacher 1" },
  { email: "teacher2@demo.com", name: "Demo Teacher 2" },
  { email: "teacher3@demo.com", name: "Demo Teacher 3" },
  { email: "teacher4@demo.com", name: "Demo Teacher 4" },
  { email: "teacher5@demo.com", name: "Demo Teacher 5" },
  { email: "teacher6@demo.com", name: "Demo Teacher 6" },
  { email: "teacher7@demo.com", name: "Demo Teacher 7" },
  { email: "teacher8@demo.com", name: "Demo Teacher 8" },
  { email: "teacher9@demo.com", name: "Demo Teacher 9" },
  { email: "teacher10@demo.com", name: "Demo Teacher 10" },
] as const;

const DEMO_SUBJECTS = [
  { name: "Mathematics", code: "MATH", periodsPerWeek: 8 },
  { name: "English", code: "ENG", periodsPerWeek: 8 },
  { name: "Science", code: "SCI", periodsPerWeek: 8 },
  { name: "History", code: "HIS", periodsPerWeek: 8 },
  { name: "Physical Education", code: "PE", periodsPerWeek: 8 },
] as const;

const DEMO_ASSIGNMENTS: Array<{ section: "A" | "B"; subject: string; teacherEmail: string }> = [
  { section: "A", subject: "Mathematics", teacherEmail: "teacher@demo.com" },
  { section: "A", subject: "English", teacherEmail: "teacher2@demo.com" },
  { section: "A", subject: "Science", teacherEmail: "teacher3@demo.com" },
  { section: "A", subject: "History", teacherEmail: "teacher4@demo.com" },
  { section: "A", subject: "Physical Education", teacherEmail: "teacher5@demo.com" },
  { section: "B", subject: "Mathematics", teacherEmail: "teacher6@demo.com" },
  { section: "B", subject: "English", teacherEmail: "teacher7@demo.com" },
  { section: "B", subject: "Science", teacherEmail: "teacher8@demo.com" },
  { section: "B", subject: "History", teacherEmail: "teacher9@demo.com" },
  { section: "B", subject: "Physical Education", teacherEmail: "teacher10@demo.com" },
];

const DEMO_STAFF: Array<{
  email: string;
  name: string;
  employeeCode: string;
  jobType: EmployeeJobType;
}> = [
  { email: "driver@demo.com", name: "Demo Van Driver", employeeCode: "DRV-001", jobType: "VAN_DRIVER" },
  { email: "security@demo.com", name: "Demo Security Guard", employeeCode: "SEC-001", jobType: "SECURITY_GUARD" },
  { email: "cleaner@demo.com", name: "Demo Cleaner", employeeCode: "CLN-001", jobType: "CLEANER" },
  { email: "busdriver@demo.com", name: "Demo Bus Driver", employeeCode: "DRV-002", jobType: "BUS_DRIVER" },
  { email: "transport@demo.com", name: "Demo Transport Coordinator", employeeCode: "TRN-001", jobType: "TRANSPORT_COORDINATOR" },
  { email: "securitysupervisor@demo.com", name: "Demo Security Supervisor", employeeCode: "SEC-002", jobType: "SECURITY_SUPERVISOR" },
  { email: "janitor@demo.com", name: "Demo Janitor", employeeCode: "JAN-001", jobType: "JANITOR" },
  { email: "gardener@demo.com", name: "Demo Gardener", employeeCode: "GAR-001", jobType: "GARDENER" },
  { email: "maintenance@demo.com", name: "Demo Maintenance Staff", employeeCode: "MNT-001", jobType: "MAINTENANCE_STAFF" },
  { email: "canteen@demo.com", name: "Demo Canteen Staff", employeeCode: "CAN-001", jobType: "CANTEEN_STAFF" },
  { email: "nurse@demo.com", name: "Demo Nurse", employeeCode: "NUR-001", jobType: "NURSE" },
  { email: "counsellor@demo.com", name: "Demo Counsellor", employeeCode: "COU-001", jobType: "COUNSELLOR" },
  { email: "reception@demo.com", name: "Demo Receptionist", employeeCode: "RCP-001", jobType: "RECEPTIONIST" },
  { email: "clerk@demo.com", name: "Demo Office Clerk", employeeCode: "CLK-001", jobType: "OFFICE_CLERK" },
  { email: "accounts@demo.com", name: "Demo Accountant", employeeCode: "ACC-001", jobType: "ACCOUNTANT" },
  { email: "librarian@demo.com", name: "Demo Librarian", employeeCode: "LIB-001", jobType: "LIBRARIAN" },
  { email: "labassistant@demo.com", name: "Demo Lab Assistant", employeeCode: "LAB-001", jobType: "LAB_ASSISTANT" },
  { email: "coach@demo.com", name: "Demo Sports Coach", employeeCode: "SPT-001", jobType: "SPORTS_COACH" },
  { email: "principal@demo.com", name: "Demo Principal", employeeCode: "PRN-001", jobType: "PRINCIPAL" },
  { email: "viceprincipal@demo.com", name: "Demo Vice Principal", employeeCode: "VPR-001", jobType: "VICE_PRINCIPAL" },
];

const DEMO_SALARY_BY_JOB: Record<
  EmployeeJobType,
  { baseSalary: number; allowances: Record<string, number>; deductions: Record<string, number> }
> = {
  TEACHER: { baseSalary: 35000, allowances: { hra: 5000 }, deductions: { pf: 1800 } },
  CLASS_TEACHER: { baseSalary: 38000, allowances: { hra: 5500 }, deductions: { pf: 1900 } },
  PET_MASTER: { baseSalary: 32000, allowances: { sports: 2000 }, deductions: { pf: 1600 } },
  LIBRARIAN: { baseSalary: 28000, allowances: { hra: 3000 }, deductions: { pf: 1400 } },
  LAB_ASSISTANT: { baseSalary: 26000, allowances: { hra: 2500 }, deductions: { pf: 1300 } },
  SPORTS_COACH: { baseSalary: 30000, allowances: { sports: 2500 }, deductions: { pf: 1500 } },
  ACCOUNTANT: { baseSalary: 34000, allowances: { hra: 4000 }, deductions: { pf: 1700 } },
  OFFICE_CLERK: { baseSalary: 22000, allowances: { hra: 2000 }, deductions: { pf: 1100 } },
  RECEPTIONIST: { baseSalary: 21000, allowances: { hra: 1800 }, deductions: { pf: 1000 } },
  VAN_DRIVER: { baseSalary: 22000, allowances: { travel: 1500 }, deductions: { pf: 1100 } },
  BUS_DRIVER: { baseSalary: 24000, allowances: { travel: 1800 }, deductions: { pf: 1200 } },
  TRANSPORT_COORDINATOR: { baseSalary: 28000, allowances: { travel: 2000 }, deductions: { pf: 1400 } },
  SECURITY_GUARD: { baseSalary: 20000, allowances: { shift: 1500 }, deductions: { pf: 1000 } },
  SECURITY_SUPERVISOR: { baseSalary: 26000, allowances: { shift: 2000 }, deductions: { pf: 1300 } },
  CLEANER: { baseSalary: 18000, allowances: { maintenance: 1000 }, deductions: { pf: 900 } },
  JANITOR: { baseSalary: 18000, allowances: { maintenance: 1000 }, deductions: { pf: 900 } },
  GARDENER: { baseSalary: 19000, allowances: { maintenance: 1200 }, deductions: { pf: 950 } },
  MAINTENANCE_STAFF: { baseSalary: 20000, allowances: { maintenance: 1500 }, deductions: { pf: 1000 } },
  CANTEEN_STAFF: { baseSalary: 19000, allowances: { food: 1000 }, deductions: { pf: 950 } },
  NURSE: { baseSalary: 29000, allowances: { medical: 2000 }, deductions: { pf: 1450 } },
  COUNSELLOR: { baseSalary: 33000, allowances: { hra: 4000 }, deductions: { pf: 1650 } },
  PRINCIPAL: { baseSalary: 85000, allowances: { hra: 12000 }, deductions: { pf: 4200 } },
  VICE_PRINCIPAL: { baseSalary: 70000, allowances: { hra: 10000 }, deductions: { pf: 3500 } },
};

const DEMO_BANK_IFSC = "HDFC0001234";
const DEMO_BANK_NAME = "HDFC Bank";
const SALARY_EFFECTIVE_FROM = new Date("2024-04-01");

function toDateOnly(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

async function resetDatabase() {
  console.log("Removing existing data...");

  await prisma.staffAttendanceAttempt.deleteMany();
  await prisma.staffAttendance.deleteMany();
  await prisma.libraryIssue.deleteMany();
  await prisma.libraryBook.deleteMany();
  await prisma.sportsSchedule.deleteMany();
  await prisma.cleanerZoneAssignment.deleteMany();
  await prisma.securityVisitorLog.deleteMany();
  await prisma.transportRouteAssignment.deleteMany();
  await prisma.transportRoute.deleteMany();
  await prisma.schoolCalendarDay.deleteMany();
  await prisma.schoolEmployeeJobTypeConfig.deleteMany();
  await prisma.schoolPayoutConfig.deleteMany();
  await prisma.salaryPayout.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.employeeBankAccount.deleteMany();
  await prisma.employeeSalary.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.aIServiceKey.deleteMany();
  await prisma.coreModuleInvoice.deleteMany();
  await prisma.schoolSubscription.deleteMany();
  await prisma.schoolPaymentProviderConfig.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeInvoice.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.document.deleteMany();
  await prisma.teacherAlterationStat.deleteMany();
  await prisma.scheduleAlteration.deleteMany();
  await prisma.scheduleSwapGroup.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.studentAttendance.deleteMany();
  await prisma.attendanceAttempt.deleteMany();
  await prisma.teacherAttendance.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.scheduleVersion.deleteMany();
  await prisma.schoolScheduleConfig.deleteMany();
  await prisma.scheduleConstraint.deleteMany();
  await prisma.periodTiming.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classSection.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.guardianRelationship.deleteMany();
  await prisma.student.deleteMany();
  await prisma.userSchoolMembership.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.school.deleteMany();
  await prisma.user.deleteMany();
  await prisma.corePricingPlan.deleteMany();
}

async function seedEmployeePayrollData(schoolId: string) {
  const employees = await prisma.employee.findMany({
    where: { schoolId, employmentStatus: "ACTIVE" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { employeeCode: "asc" },
  });

  for (const [index, employee] of employees.entries()) {
    const salaryTemplate = DEMO_SALARY_BY_JOB[employee.jobType] ?? DEMO_SALARY_BY_JOB.TEACHER;

    await prisma.employeeSalary.create({
      data: {
        schoolId,
        employeeId: employee.id,
        baseSalary: salaryTemplate.baseSalary,
        allowances: salaryTemplate.allowances,
        deductions: salaryTemplate.deductions,
        effectiveFrom: SALARY_EFFECTIVE_FROM,
      },
    });

    const accountNumber = `50100${String(100001 + index).slice(-6)}`;
    await prisma.employeeBankAccount.create({
      data: {
        schoolId,
        employeeId: employee.id,
        accountHolder: employee.user.name,
        accountNumberEncrypted: encryptBankField(accountNumber),
        ifscEncrypted: encryptBankField(DEMO_BANK_IFSC),
        upiIdEncrypted: encryptBankField(`${employee.user.email.split("@")[0]}@demo.upi`),
        bankName: DEMO_BANK_NAME,
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }
}

async function main() {
  await resetDatabase();

  console.log("Seeding permissions...");
  await seedPermissions();

  console.log("Seeding core pricing plans...");
  const plans = await prisma.corePricingPlan.createMany({
    data: [
      {
        name: "50 Users",
        description: "Core ClassSync module for up to 50 login users.",
        maxUsers: 50,
        priceAmount: 24999,
        sortOrder: 1,
      },
      {
        name: "100 Users",
        description: "Core ClassSync module for up to 100 login users.",
        maxUsers: 100,
        priceAmount: 44999,
        sortOrder: 2,
      },
    ],
  });
  if (plans.count !== 2) throw new Error("Failed to seed pricing plans");

  const adminHash = await hash("admin123", 12);
  const teacherHash = await hash("teacher123", 12);
  const schoolAdminHash = await hash("school123", 12);
  const parentHash = await hash("parent123", 12);
  const staffHash = await hash("staff123", 12);

  const systemAdmin = await prisma.user.create({
    data: { email: "admin@classsync.app", name: "System Admin", passwordHash: adminHash },
  });
  const schoolAdmin = await prisma.user.create({
    data: { email: "schooladmin@demo.com", name: "School Admin", passwordHash: schoolAdminHash },
  });
  const parent = await prisma.user.create({
    data: { email: "parent@demo.com", name: "Demo Parent", passwordHash: parentHash },
  });

  const school = await prisma.school.create({
    data: {
      name: "Demo School",
      slug: DEMO_SCHOOL_SLUG,
      timezone: "Asia/Kolkata",
      campusLat: 12.9716,
      campusLng: 77.5946,
      campusRadiusM: 500,
      planTier: "PREMIUM",
    },
  });

  await prisma.userSchoolMembership.createMany({
    data: [
      { userId: systemAdmin.id, schoolId: school.id, role: "SYSTEM_ADMIN" },
      { userId: schoolAdmin.id, schoolId: school.id, role: "SCHOOL_ADMIN" },
      { userId: parent.id, schoolId: school.id, role: "PARENT" },
    ],
  });

  const grade10 = await prisma.grade.create({
    data: { schoolId: school.id, name: "Grade 10", sortOrder: 10 },
  });
  const sectionA = await prisma.classSection.create({
    data: {
      schoolId: school.id,
      gradeId: grade10.id,
      name: "Grade 10 - A",
      grade: "10",
      section: "A",
    },
  });
  const sectionB = await prisma.classSection.create({
    data: {
      schoolId: school.id,
      gradeId: grade10.id,
      name: "Grade 10 - B",
      grade: "10",
      section: "B",
    },
  });

  const subjects = new Map<string, { id: string; periodsPerWeek: number }>();
  for (const subjectDef of DEMO_SUBJECTS) {
    const row = await prisma.subject.create({
      data: {
        schoolId: school.id,
        gradeId: grade10.id,
        name: subjectDef.name,
        code: subjectDef.code,
        periodsPerWeek: subjectDef.periodsPerWeek,
      },
    });
    subjects.set(subjectDef.name, { id: row.id, periodsPerWeek: row.periodsPerWeek });
  }

  const teacherUsers = new Map<string, { id: string; name: string }>();
  for (const [index, t] of DEMO_TEACHERS.entries()) {
    const user = await prisma.user.create({
      data: { email: t.email, name: t.name, passwordHash: teacherHash },
    });
    teacherUsers.set(t.email, { id: user.id, name: user.name });

    await prisma.userSchoolMembership.create({
      data: { userId: user.id, schoolId: school.id, role: "TEACHER" },
    });

    await prisma.employee.create({
      data: {
        schoolId: school.id,
        userId: user.id,
        employeeCode: `TCH-${String(index + 1).padStart(3, "0")}`,
        jobType: t.email === "teacher5@demo.com" ? "PET_MASTER" : t.email === "teacher6@demo.com" ? "CLASS_TEACHER" : "TEACHER",
        dateOfJoining: new Date("2024-04-01"),
      },
    });
  }

  for (const [idx, s] of DEMO_STAFF.entries()) {
    const user = await prisma.user.create({
      data: { email: s.email, name: s.name, passwordHash: staffHash },
    });
    await prisma.userSchoolMembership.create({
      data: { userId: user.id, schoolId: school.id, role: "STAFF" },
    });
    await prisma.employee.create({
      data: {
        schoolId: school.id,
        userId: user.id,
        employeeCode: s.employeeCode || `STF-${String(idx + 1).padStart(3, "0")}`,
        jobType: s.jobType,
        dateOfJoining: new Date("2024-06-01"),
      },
    });
  }

  await prisma.schoolEmployeeJobTypeConfig.createMany({
    data: Object.values(EmployeeJobType).map((jobType) => ({
      schoolId: school.id,
      jobType,
      isEnabled: true,
      minimumLeaves: 2,
      leaveAllowancePeriod: "MONTH",
    })),
  });

  const studentsPayload: Array<Prisma.StudentUncheckedCreateInput> = [];
  for (const section of [sectionA, sectionB]) {
    for (let i = 1; i <= STUDENTS_PER_CLASS; i++) {
      const id =
        section.section === "A" && i === 1
          ? "00000000-0000-4000-8000-000000000001"
          : section.section === "A" && i === 2
            ? "00000000-0000-4000-8000-000000000003"
            : undefined;
      studentsPayload.push({
        id,
        schoolId: school.id,
        classSectionId: section.id,
        name: `Student ${section.name}-${String(i).padStart(2, "0")}`,
        admissionNo: `G10${section.section}${String(i).padStart(3, "0")}`,
        dob: new Date(Date.UTC(2008, (i - 1) % 12, ((i - 1) % 28) + 1)),
      });
    }
  }
  for (const row of studentsPayload) {
    await prisma.student.create({ data: row });
  }

  const allPrimaryStudents = await prisma.student.findMany({
    where: { schoolId: school.id },
    orderBy: [{ classSectionId: "asc" }, { admissionNo: "asc" }],
  });
  if (allPrimaryStudents.length < STUDENTS_PER_CLASS * 2) {
    throw new Error("Expected at least 80 students in primary school seed");
  }

  await prisma.userSchoolMembership.create({
    data: {
      userId: teacherUsers.get("teacher@demo.com")!.id,
      schoolId: school.id,
      role: "PARENT",
    },
  });

  const extraParentsData = Array.from({ length: 24 }, (_, idx) => ({
    email: `parent${String(idx + 1).padStart(2, "0")}@demo.com`,
    name: `Demo Parent ${idx + 1}`,
    passwordHash: parentHash,
  }));
  await prisma.user.createMany({ data: extraParentsData });
  const extraParents = await prisma.user.findMany({
    where: { email: { in: extraParentsData.map((p) => p.email) } },
    orderBy: { email: "asc" },
  });
  await prisma.userSchoolMembership.createMany({
    data: extraParents.map((p) => ({ userId: p.id, schoolId: school.id, role: "PARENT" })),
  });

  const guardianRows: Prisma.GuardianRelationshipCreateManyInput[] = [];
  const parentPool = [parent.id, teacherUsers.get("teacher@demo.com")!.id, ...extraParents.map((p) => p.id)];
  for (const [idx, student] of allPrimaryStudents.entries()) {
    const parentId = student.id === "00000000-0000-4000-8000-000000000003" ? teacherUsers.get("teacher@demo.com")!.id : parentPool[idx % parentPool.length];
    guardianRows.push({
      schoolId: school.id,
      parentId,
      studentId: student.id,
      relation: parentId === teacherUsers.get("teacher@demo.com")!.id ? "father" : idx % 2 === 0 ? "mother" : "father",
    });
  }
  await prisma.guardianRelationship.createMany({ data: guardianRows });

  await prisma.teacherAssignment.createMany({
    data: DEMO_ASSIGNMENTS.map((assignment) => {
      const section = assignment.section === "A" ? sectionA : sectionB;
      const subject = subjects.get(assignment.subject);
      const teacher = teacherUsers.get(assignment.teacherEmail);
      if (!subject || !teacher) throw new Error(`Missing mapping for ${assignment.subject}`);
      return {
        schoolId: school.id,
        teacherId: teacher.id,
        classSectionId: section.id,
        subjectId: subject.id,
        periodsPerWeek: subject.periodsPerWeek,
      };
    }),
  });

  await prisma.periodTiming.createMany({
    data: Array.from({ length: DEMO_PERIODS_PER_DAY }, (_, i) => ({
      schoolId: school.id,
      periodNo: i + 1,
      startTime: `${8 + i}:00`,
      endTime: `${9 + i}:00`,
    })),
  });

  await prisma.scheduleConstraint.create({
    data: { schoolId: school.id, minFreePerWeek: DEMO_MIN_FREE_PER_WEEK, maxFreePerWeek: DEMO_MAX_FREE_PER_WEEK },
  });
  await prisma.schoolScheduleConfig.create({
    data: {
      schoolId: school.id,
      daysPerWeek: DEMO_DAYS_PER_WEEK,
      workingDays: [0, 1, 2, 3, 4],
      maxSameSubjectPerDay: 2,
      maxConsecutiveSameSubject: 3,
      requireFullSectionWeek: true,
    },
  });

  await seedEmployeePayrollData(school.id);

  const today = toDateOnly(new Date());
  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);

  const teacherAttendanceRows = Array.from(teacherUsers.values()).map((t, idx) => ({
    schoolId: school.id,
    teacherId: t.id,
    date: today,
    status: (["PRESENT", "FAILED", "PROCESSING", "ABSENT"] as const)[idx % 4],
    markedAt: idx % 4 === 0 ? new Date() : null,
    geoLat: idx % 4 === 0 ? 12.9715 + idx * 0.0001 : null,
    geoLng: idx % 4 === 0 ? 77.5944 + idx * 0.0001 : null,
    method: idx % 4 === 0 ? "camera+gps" : "camera",
  }));
  await prisma.teacherAttendance.createMany({ data: teacherAttendanceRows });

  const teacherAttendance = await prisma.teacherAttendance.findMany({
    where: { schoolId: school.id, date: today },
    orderBy: { createdAt: "asc" },
  });
  await prisma.attendanceAttempt.createMany({
    data: teacherAttendance.map((row, idx) => ({
      teacherAttendanceId: row.id,
      attemptNumber: 1,
      success: row.status === "PRESENT",
      geoLat: row.geoLat,
      geoLng: row.geoLng,
      evidenceImageKey: `attendance/teacher/${row.id}/attempt-1.jpg`,
      errorMessage: row.status === "FAILED" ? "Face mismatch" : null,
    })),
  });

  const staffEmployees = await prisma.employee.findMany({
    where: {
      schoolId: school.id,
      userId: { notIn: Array.from(teacherUsers.values()).map((t) => t.id) },
    },
    include: { user: true },
    orderBy: { employeeCode: "asc" },
  });
  await prisma.staffAttendance.createMany({
    data: staffEmployees.slice(0, 8).map((employee, idx) => ({
      schoolId: school.id,
      employeeId: employee.id,
      userId: employee.userId,
      date: today,
      status: (["PRESENT", "FAILED", "ESCALATED", "LATE"] as const)[idx % 4],
      markedAt: new Date(),
      checkInAt: idx % 3 === 0 ? new Date() : null,
      geoLat: 12.97 + idx * 0.0001,
      geoLng: 77.59 + idx * 0.0001,
      method: "camera+gps",
      notes: idx % 2 === 0 ? "On-time arrival" : "Manual review required",
    })),
  });

  const staffAttendance = await prisma.staffAttendance.findMany({
    where: { schoolId: school.id, date: today },
    orderBy: { createdAt: "asc" },
  });
  await prisma.staffAttendanceAttempt.createMany({
    data: staffAttendance.map((row) => ({
      staffAttendanceId: row.id,
      attemptNumber: 1,
      success: row.status === "PRESENT" || row.status === "LATE",
      geoLat: row.geoLat,
      geoLng: row.geoLng,
      evidenceImageKey: `attendance/staff/${row.id}/attempt-1.jpg`,
      errorMessage: row.status === "FAILED" ? "Face verification failed" : null,
    })),
  });

  await prisma.studentAttendance.createMany({
    data: allPrimaryStudents.slice(0, 60).map((s, idx) => ({
      schoolId: school.id,
      studentId: s.id,
      date: idx % 3 === 0 ? today : idx % 3 === 1 ? yesterday : twoDaysAgo,
      status: (["PRESENT", "ABSENT", "LATE", "HALF_DAY"] as const)[idx % 4],
      session: idx % 4 === 3 ? "afternoon" : null,
      notes: idx % 5 === 0 ? "Medical note submitted" : null,
    })),
  });

  const teacher1 = teacherUsers.get("teacher@demo.com");
  const teacher2 = teacherUsers.get("teacher2@demo.com");
  if (!teacher1 || !teacher2) throw new Error("Missing seed teachers");

  const approvedLeave = await prisma.leaveRequest.create({
    data: {
      schoolId: school.id,
      requesterId: teacher1.id,
      requesterType: "TEACHER",
      startDate: addDays(today, -3),
      endDate: addDays(today, -2),
      reason: "Medical rest",
      status: "APPROVED",
      reviewedBy: schoolAdmin.id,
      reviewedAt: new Date(),
      reviewNote: "Approved with substitution",
      substitutionsGenerated: true,
      alteredClassCount: 2,
    },
  });
  await prisma.leaveRequest.createMany({
    data: [
      {
        schoolId: school.id,
        requesterId: staffEmployees[0].userId,
        requesterType: "STAFF",
        startDate: addDays(today, 1),
        endDate: addDays(today, 1),
        reason: "Personal work",
        status: "PENDING",
      },
      {
        schoolId: school.id,
        requesterId: parent.id,
        requesterType: "PARENT",
        studentId: allPrimaryStudents[0].id,
        startDate: addDays(today, 2),
        endDate: addDays(today, 2),
        reason: "Family function",
        status: "PENDING",
      },
      {
        schoolId: school.id,
        requesterId: teacher2.id,
        requesterType: "TEACHER",
        startDate: addDays(today, -5),
        endDate: addDays(today, -5),
        reason: "Emergency leave",
        status: "REJECTED",
        reviewedBy: schoolAdmin.id,
        reviewedAt: new Date(),
        reviewNote: "Insufficient documentation",
      },
    ],
  });

  const swapGroup = await prisma.scheduleSwapGroup.create({
    data: {
      schoolId: school.id,
      type: "PARALLEL_SECTIONS",
      teacherAId: teacher1.id,
      teacherBId: teacher2.id,
      createdBy: schoolAdmin.id,
      note: "Demo swap for substitution flow",
    },
  });
  await prisma.scheduleAlteration.create({
    data: {
      schoolId: school.id,
      date: today,
      periodNo: 2,
      classSectionId: sectionA.id,
      subjectId: subjects.get("Mathematics")!.id,
      originalTeacherId: teacher1.id,
      substituteTeacherId: teacher2.id,
      type: "SWAP",
      leaveRequestId: approvedLeave.id,
      swapGroupId: swapGroup.id,
      createdBy: schoolAdmin.id,
    },
  });
  await prisma.teacherAlterationStat.createMany({
    data: [
      { schoolId: school.id, teacherId: teacher1.id, asSubstituteCount: 0, classesAlteredForCount: 1 },
      { schoolId: school.id, teacherId: teacher2.id, asSubstituteCount: 1, classesAlteredForCount: 0 },
    ],
  });

  await prisma.document.createMany({
    data: allPrimaryStudents.slice(0, 20).map((s, idx) => ({
      schoolId: school.id,
      studentId: s.id,
      uploadedBy: idx % 2 === 0 ? parent.id : schoolAdmin.id,
      name: `doc-${s.admissionNo}.pdf`,
      s3Key: `documents/${school.id}/${s.id}/doc-${idx + 1}.pdf`,
      mimeType: "application/pdf",
      documentType: (["AADHAAR", "BIRTH_CERTIFICATE", "MARKSHEET", "MEDICAL_CERTIFICATE"] as const)[idx % 4],
      uploaderType: idx % 2 === 0 ? "PARENT" : "TEACHER",
      status: (["PENDING", "APPROVED", "REJECTED"] as const)[idx % 3],
      reviewNote: idx % 3 === 2 ? "Blurred image, re-upload required" : null,
    })),
  });

  const tuitionA = await prisma.feeStructure.create({
    data: {
      schoolId: school.id,
      name: "Grade 10 A Tuition (Term 1)",
      amount: 25000,
      gradeId: grade10.id,
      classSectionId: sectionA.id,
      termStart: addDays(today, -30),
      termEnd: addDays(today, 60),
    },
  });
  const tuitionB = await prisma.feeStructure.create({
    data: {
      schoolId: school.id,
      name: "Grade 10 B Tuition (Term 1)",
      amount: 24500,
      gradeId: grade10.id,
      classSectionId: sectionB.id,
      termStart: addDays(today, -30),
      termEnd: addDays(today, 60),
    },
  });

  const invoiceIds: string[] = [];
  for (const [idx, s] of allPrimaryStudents.slice(0, 36).entries()) {
    const invoice = await prisma.feeInvoice.create({
      data: {
        schoolId: school.id,
        studentId: s.id,
        feeStructureId: s.classSectionId === sectionA.id ? tuitionA.id : tuitionB.id,
        amount: s.classSectionId === sectionA.id ? 25000 : 24500,
        paidAmount: idx % 3 === 0 ? 25000 : idx % 3 === 1 ? 12000 : 0,
        status: (["PAID", "PARTIALLY_PAID", "POSTED"] as const)[idx % 3],
        dueDate: addDays(today, 10),
      },
    });
    invoiceIds.push(invoice.id);
  }

  for (const [idx, invoiceId] of invoiceIds.entries()) {
    await prisma.payment.create({
      data: {
        schoolId: school.id,
        feeInvoiceId: invoiceId,
        amount: idx % 3 === 0 ? 25000 : idx % 3 === 1 ? 12000 : 0,
        status: (["SUCCESS", "PENDING", "FAILED"] as const)[idx % 3],
        provider: (["RAZORPAY", "PHONEPE", "PAYPAL", "STRIPE"] as const)[idx % 4],
        externalOrderId: `order_${idx + 1}`,
        externalPaymentId: idx % 3 === 0 ? `pay_demo_${idx + 1}` : null,
        receiptUrl: idx % 3 === 0 ? `https://receipts.demo/pay_${idx + 1}.pdf` : null,
      },
    });
  }

  await prisma.schoolPaymentProviderConfig.createMany({
    data: [
      {
        schoolId: school.id,
        provider: "RAZORPAY",
        isEnabled: true,
        publicKey: "rzp_test_classsync_demo",
        secretEncrypted: encrypt("rzp_test_secret_demo"),
        webhookSecretEncrypted: encrypt("rzp_webhook_secret_demo"),
      },
      {
        schoolId: school.id,
        provider: "PHONEPE",
        isEnabled: false,
        publicKey: "phonepe_demo_mid",
        secretEncrypted: encrypt("phonepe_demo_secret"),
      },
      {
        schoolId: school.id,
        provider: "PAYPAL",
        isEnabled: false,
        publicKey: "paypal_demo_client",
        secretEncrypted: encrypt("paypal_demo_secret"),
      },
      {
        schoolId: school.id,
        provider: "STRIPE",
        isEnabled: false,
        publicKey: "pk_test_classsync_demo",
        secretEncrypted: encrypt("sk_test_classsync_demo"),
        webhookSecretEncrypted: encrypt("whsec_classsync_demo"),
      },
    ],
  });

  await prisma.schoolPayoutConfig.create({
    data: {
      schoolId: school.id,
      razorpayXAccountNumber: "1234567890",
      apiKeyEncrypted: encrypt("rzpx_demo_key"),
      apiSecretEncrypted: encrypt("rzpx_demo_secret"),
      webhookSecretEncrypted: encrypt("rzpx_demo_webhook"),
      isEnabled: false,
      autoPayoutEnabled: false,
      payrollRunDay: 28,
    },
  });

  const plan100 = await prisma.corePricingPlan.findFirst({ where: { maxUsers: 100 } });
  if (!plan100) throw new Error("Expected 100-user plan");
  await prisma.schoolSubscription.create({
    data: {
      schoolId: school.id,
      planId: plan100.id,
      status: "ACTIVE",
      userLimit: 100,
      currentPeriodStart: addDays(today, -15),
      currentPeriodEnd: addDays(today, 350),
    },
  });
  await prisma.coreModuleInvoice.createMany({
    data: [
      {
        schoolId: school.id,
        planId: plan100.id,
        amount: 44999,
        status: "PAID",
        provider: "RAZORPAY",
        externalOrderId: "core_order_1",
        externalPaymentId: "core_payment_1",
        paidAt: addDays(today, -7),
      },
      {
        schoolId: school.id,
        planId: plan100.id,
        amount: 44999,
        status: "PENDING",
        provider: "RAZORPAY",
        externalOrderId: "core_order_2",
      },
    ],
  });

  await prisma.aIServiceKey.createMany({
    data: [
      { schoolId: null, provider: "GLOBAL_AZURE_OPENAI", keyEncrypted: encrypt("global-key"), isActive: true },
      { schoolId: school.id, provider: "SCHOOL_AZURE_OPENAI", keyEncrypted: encrypt("school-key"), isActive: true },
    ],
  });

  const notifyUsers = [systemAdmin.id, schoolAdmin.id, parent.id, teacher1.id];
  await prisma.notificationLog.createMany({
    data: notifyUsers.map((userId, idx) => ({
      schoolId: school.id,
      userId,
      channel: idx % 2 === 0 ? "WEB_PUSH" : "EMAIL",
      title: `Demo Notification ${idx + 1}`,
      body: "This is a seeded notification for testing.",
      status: (["PENDING", "SENT", "FAILED"] as const)[idx % 3],
      metadata: { source: "seed" },
    })),
  });
  await prisma.pushSubscription.createMany({
    data: [
      {
        userId: parent.id,
        schoolId: school.id,
        endpoint: "https://push.example.com/subscription/parent-demo",
        p256dh: "demo-p256dh-parent",
        auth: "demo-auth-parent",
      },
      {
        userId: teacher1.id,
        schoolId: school.id,
        endpoint: "https://push.example.com/subscription/teacher-demo",
        p256dh: "demo-p256dh-teacher",
        auth: "demo-auth-teacher",
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { schoolId: school.id, actorId: schoolAdmin.id, action: "CREATE_FEE_STRUCTURE", entityType: "FeeStructure", metadata: { section: "10-A" } },
      { schoolId: school.id, actorId: teacher1.id, action: "MARK_ATTENDANCE", entityType: "TeacherAttendance" },
      { schoolId: school.id, actorId: parent.id, action: "SUBMIT_LEAVE_REQUEST", entityType: "LeaveRequest" },
    ],
  });

  await prisma.schoolCalendarDay.createMany({
    data: Array.from({ length: 14 }, (_, idx) => {
      const date = addDays(today, idx);
      const day = date.getUTCDay();
      const isWorking = day !== 0 && day !== 6;
      return {
        schoolId: school.id,
        date,
        isWorkingDay: isWorking,
        note: !isWorking ? "Weekend" : idx === 5 ? "Unit test preparation day" : null,
      };
    }),
  });

  const routeNorth = await prisma.transportRoute.create({
    data: {
      schoolId: school.id,
      name: "Route A - North",
      description: "Covers northern residential areas",
      vehicleNo: "KA-01-AB-1234",
    },
  });
  const routeSouth = await prisma.transportRoute.create({
    data: {
      schoolId: school.id,
      name: "Route B - South",
      description: "Covers southern residential areas",
      vehicleNo: "KA-01-CD-5678",
    },
  });

  const staffByEmail = new Map(staffEmployees.map((e) => [e.user.email, e]));
  const vanDriver = staffByEmail.get("driver@demo.com");
  const busDriver = staffByEmail.get("busdriver@demo.com");
  if (vanDriver) {
    await prisma.transportRouteAssignment.create({
      data: { routeId: routeNorth.id, employeeId: vanDriver.id, userId: vanDriver.userId },
    });
  }
  if (busDriver) {
    await prisma.transportRouteAssignment.create({
      data: { routeId: routeSouth.id, employeeId: busDriver.id, userId: busDriver.userId },
    });
  }

  const securityGuard = staffByEmail.get("security@demo.com");
  if (securityGuard) {
    await prisma.securityVisitorLog.createMany({
      data: [
        {
          schoolId: school.id,
          loggedById: securityGuard.userId,
          visitorName: "Vendor A",
          purpose: "Stationery delivery",
          phone: "9000000001",
          notes: "Verified at gate",
        },
        {
          schoolId: school.id,
          loggedById: securityGuard.userId,
          visitorName: "Parent Visitor",
          purpose: "Meet class teacher",
          phone: "9000000002",
        },
      ],
    });
  }

  const cleaner = staffByEmail.get("cleaner@demo.com");
  const janitor = staffByEmail.get("janitor@demo.com");
  if (cleaner) {
    await prisma.cleanerZoneAssignment.create({
      data: {
        schoolId: school.id,
        employeeId: cleaner.id,
        zoneName: "Academic Block A",
        tasks: ["Sweep corridors", "Sanitize classrooms"],
        isComplete: false,
        date: today,
      },
    });
  }
  if (janitor) {
    await prisma.cleanerZoneAssignment.create({
      data: {
        schoolId: school.id,
        employeeId: janitor.id,
        zoneName: "Labs and Library",
        tasks: ["Mop lab floors", "Trash disposal"],
        isComplete: true,
        date: today,
      },
    });
  }

  await prisma.sportsSchedule.createMany({
    data: [
      {
        schoolId: school.id,
        title: "Inter-house Football Practice",
        eventDate: addDays(today, 3),
        location: "Main Ground",
        equipment: ["Football", "Cones", "Whistle"],
      },
      {
        schoolId: school.id,
        title: "Annual Sports Day Drill",
        eventDate: addDays(today, 10),
        location: "Assembly Area",
        equipment: ["Marker flags", "Mic system"],
      },
    ],
  });

  const books = await prisma.libraryBook.createMany({
    data: [
      { schoolId: school.id, title: "NCERT Mathematics X", author: "NCERT", isbn: "9780000000001", totalCopies: 20, available: 15 },
      { schoolId: school.id, title: "Science Explorer", author: "J. Smith", isbn: "9780000000002", totalCopies: 12, available: 9 },
      { schoolId: school.id, title: "English Grammar Guide", author: "P. Taylor", isbn: "9780000000003", totalCopies: 10, available: 8 },
    ],
  });
  if (books.count > 0) {
    const seededBooks = await prisma.libraryBook.findMany({ where: { schoolId: school.id }, orderBy: { title: "asc" } });
    await prisma.libraryIssue.createMany({
      data: [
        { bookId: seededBooks[0].id, issuedTo: "Student G10A001", dueDate: addDays(today, 7) },
        { bookId: seededBooks[1].id, issuedTo: "Student G10B005", dueDate: addDays(today, 10) },
      ],
    });
  }

  const allEmployees = await prisma.employee.findMany({
    where: { schoolId: school.id },
    orderBy: { employeeCode: "asc" },
  });
  const payrollRun = await prisma.payrollRun.create({
    data: {
      schoolId: school.id,
      periodStart: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)),
      periodEnd: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)),
      status: "COMPLETED",
      totalAmount: 0,
      employeeCount: Math.min(10, allEmployees.length),
      approvedById: schoolAdmin.id,
      approvedAt: addDays(today, -1),
    },
  });

  let totalAmount = 0;
  for (const [idx, employee] of allEmployees.slice(0, 10).entries()) {
    const gross = 30000 + idx * 1000;
    const deduction = 1500 + idx * 50;
    const net = gross - deduction;
    totalAmount += net;

    await prisma.salaryPayout.create({
      data: {
        schoolId: school.id,
        payrollRunId: payrollRun.id,
        employeeId: employee.id,
        grossAmount: gross,
        netAmount: net,
        deductions: { pf: deduction },
        status: (["SUCCESS", "PROCESSING", "FAILED", "PENDING"] as const)[idx % 4],
        razorpayPayoutId: idx % 4 === 0 ? `pout_demo_${idx + 1}` : null,
        failureReason: idx % 4 === 2 ? "Bank account temporarily unavailable" : null,
        paidAt: idx % 4 === 0 ? addDays(today, -1) : null,
        idempotencyKey: `seed-payroll-${payrollRun.id}-${idx + 1}`,
      },
    });
  }
  await prisma.payrollRun.update({
    where: { id: payrollRun.id },
    data: { totalAmount },
  });

  const schoolB = await prisma.school.create({
    data: {
      name: "Demo School B",
      slug: DEMO_SCHOOL_B_SLUG,
      timezone: "Asia/Kolkata",
      campusLat: 13.0827,
      campusLng: 80.2707,
      campusRadiusM: 500,
      planTier: "BASIC",
    },
  });
  await prisma.userSchoolMembership.createMany({
    data: [
      { userId: parent.id, schoolId: schoolB.id, role: "PARENT" },
      { userId: schoolAdmin.id, schoolId: schoolB.id, role: "SCHOOL_ADMIN" },
    ],
  });
  const gradeB = await prisma.grade.create({
    data: { schoolId: schoolB.id, name: "Grade 5", sortOrder: 5 },
  });
  const sectionBA = await prisma.classSection.create({
    data: {
      schoolId: schoolB.id,
      gradeId: gradeB.id,
      name: "Grade 5 - A",
      grade: "5",
      section: "A",
    },
  });

  const studentsB: Array<Prisma.StudentUncheckedCreateInput> = [];
  for (let i = 1; i <= STUDENTS_PER_CLASS; i++) {
    studentsB.push({
      id: i === 1 ? "00000000-0000-4000-8000-000000000002" : undefined,
      schoolId: schoolB.id,
      classSectionId: sectionBA.id,
      name: `Student Grade 5A-${String(i).padStart(2, "0")}`,
      admissionNo: `G05A${String(i).padStart(3, "0")}`,
    });
  }
  for (const row of studentsB) {
    await prisma.student.create({ data: row });
  }

  const schoolBStudents = await prisma.student.findMany({
    where: { schoolId: schoolB.id },
    orderBy: { admissionNo: "asc" },
  });
  await prisma.guardianRelationship.createMany({
    data: schoolBStudents.map((s, idx) => ({
      schoolId: schoolB.id,
      parentId: idx % 2 === 0 ? parent.id : extraParents[idx % extraParents.length].id,
      studentId: s.id,
      relation: "guardian",
    })),
  });

  await verifyDemoSchedule(school.id);

  console.log("Seed complete!");
  console.log("System Admin: admin@classsync.app / admin123");
  console.log("School Admin: schooladmin@demo.com / school123");
  console.log("Teachers: teacher@demo.com … teacher10@demo.com / teacher123");
  console.log("Parents: parent@demo.com + parent01@demo.com … parent24@demo.com / parent123");
  console.log("Staff: driver@demo.com, security@demo.com, cleaner@demo.com / staff123");
  console.log(`Demo School classes: Grade 10 - A (${STUDENTS_PER_CLASS} students), Grade 10 - B (${STUDENTS_PER_CLASS} students)`);
  console.log(`Demo School B class: Grade 5 - A (${STUDENTS_PER_CLASS} students)`);
  console.log(`Timetable setup: ${DEMO_DAYS_PER_WEEK} days × ${DEMO_PERIODS_PER_DAY} periods = ${DEMO_TOTAL_WEEKLY_SLOTS} slots/week`);
}

async function verifyDemoSchedule(schoolId: string) {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { schoolId },
    include: { subject: true, teacher: true, classSection: true },
  });
  const constraints = await prisma.scheduleConstraint.findMany({ where: { schoolId } });
  const periodTimings = await prisma.periodTiming.findMany({
    where: { schoolId },
    orderBy: { periodNo: "asc" },
  });
  const scheduleConfig = await prisma.schoolScheduleConfig.findUnique({ where: { schoolId } });

  const labels = {
    teachers: Object.fromEntries(assignments.map((a) => [a.teacherId, a.teacher.name])),
    sections: Object.fromEntries(assignments.map((a) => [a.classSectionId, a.classSection.name])),
    subjects: Object.fromEntries(assignments.map((a) => [a.subjectId, a.subject.name])),
  };

  const input = {
    daysPerWeek: scheduleConfig?.daysPerWeek ?? DEMO_DAYS_PER_WEEK,
    workingDays: scheduleConfig?.workingDays ?? [0, 1, 2, 3, 4],
    periodsPerDay: periodTimings.length,
    assignments: assignments.map((a) => ({
      teacherId: a.teacherId,
      classSectionId: a.classSectionId,
      subjectId: a.subjectId,
      periodsPerWeek: a.periodsPerWeek ?? a.subject.periodsPerWeek,
    })),
    constraints: constraints.map((c) => ({
      teacherId: c.teacherId ?? undefined,
      minFreePerWeek: c.minFreePerWeek,
      maxFreePerWeek: c.maxFreePerWeek,
    })),
    quality: {
      maxSameSubjectPerDay: scheduleConfig?.maxSameSubjectPerDay ?? 2,
      maxConsecutiveSameSubject: scheduleConfig?.maxConsecutiveSameSubject ?? 3,
      requireFullSectionWeek: scheduleConfig?.requireFullSectionWeek ?? true,
    },
    labels,
  };

  const feasibilityErrors = analyzeScheduleFeasibility(input, labels);
  if (feasibilityErrors.length > 0) {
    throw new Error(`Seed feasibility failed:\n${feasibilityErrors.join("\n")}`);
  }

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = solveSchedule(input);
    if (!result.success) continue;

    const sectionIds = [...new Set(input.assignments.map((a) => a.classSectionId))];
    const qualityErrors = sectionIds.flatMap((sectionId) =>
      validateSectionScheduleQuality(
        result.slots.filter((s) => s.classSectionId === sectionId),
        sectionId,
        input,
        labels,
      ),
    );

    if (qualityErrors.length === 0) return;
  }

  throw new Error("Demo seed could not produce a valid timetable after 5 attempts");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
