"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { EmployeeJobType, EmploymentStatus, Prisma, Role } from "@prisma/client";
import { prisma, withTenantContext } from "@/lib/db/prisma";
import {
  requireSchoolContext,
  requireSchoolPermission,
  revalidateSessionForSensitiveOp,
} from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createAuditLog } from "@/lib/audit";
import {
  encryptBankField,
  toMaskedBankAccount,
  validateAccountNumber,
  validateIfsc,
} from "@/lib/employees/bank";
import {
  ALL_JOB_TYPES,
  getPlatformRoleForJobType,
  JOB_TYPE_LABELS,
} from "@/lib/employees/job-types";
import { parseSalaryComponents } from "@/lib/employees/salary";

const employeeJobTypeSchema = z.enum(
  ALL_JOB_TYPES as [EmployeeJobType, ...EmployeeJobType[]],
);

const createEmployeeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  phone: z.string().optional(),
  employeeCode: z.string().min(1).max(32),
  jobType: employeeJobTypeSchema,
  department: z.string().optional(),
  dateOfJoining: z.string(),
  emergencyContact: z.string().optional(),
});

const updateEmployeeSchema = z.object({
  id: z.string().uuid(),
  employeeCode: z.string().min(1).max(32).optional(),
  jobType: employeeJobTypeSchema.optional(),
  department: z.string().optional(),
  employmentStatus: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "PROBATION"]).optional(),
  dateOfJoining: z.string().optional(),
  dateOfLeaving: z.string().nullable().optional(),
  emergencyContact: z.string().optional(),
  phone: z.string().optional(),
  name: z.string().min(2).optional(),
});

const salarySchema = z.object({
  employeeId: z.string().uuid(),
  baseSalary: z.number().positive(),
  allowances: z.record(z.string(), z.number().nonnegative()).default({}),
  deductions: z.record(z.string(), z.number().nonnegative()).default({}),
  effectiveFrom: z.string(),
});

const bankAccountSchema = z.object({
  employeeId: z.string().uuid(),
  accountHolder: z.string().min(2),
  accountNumber: z.string().min(9).max(18),
  ifsc: z.string().length(11),
  upiId: z.string().optional(),
  bankName: z.string().optional(),
});

export async function listEmployeesAction(filters?: {
  category?: string;
  jobType?: EmployeeJobType;
  status?: EmploymentStatus;
}) {
  const ctx = await requireSchoolPermission(PERMISSIONS.EMPLOYEES_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const employees = await tx.employee.findMany({
      where: {
        schoolId: ctx.schoolId,
        ...(filters?.jobType ? { jobType: filters.jobType } : {}),
        ...(filters?.status ? { employmentStatus: filters.status } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        salaries: { orderBy: { effectiveFrom: "desc" }, take: 1 },
        bankAccounts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    if (filters?.category === "teaching") {
      const teachingTypes = [
        "TEACHER", "CLASS_TEACHER", "PET_MASTER", "LIBRARIAN", "LAB_ASSISTANT", "SPORTS_COACH",
      ] as EmployeeJobType[];
      return employees
        .filter((e) => teachingTypes.includes(e.jobType))
        .map(serializeEmployeeRow);
    }

    return employees.map(serializeEmployeeRow);
  });
}

type EmployeeListRecord = {
  id: string;
  employeeCode: string;
  jobType: EmployeeJobType;
  employmentStatus: EmploymentStatus;
  department: string | null;
  user: { id: string; name: string; email: string; phone: string | null };
  salaries: { baseSalary: { toString(): string } }[];
  bankAccounts: { isVerified: boolean }[];
};

function serializeEmployeeRow(employee: EmployeeListRecord) {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    jobType: employee.jobType,
    employmentStatus: employee.employmentStatus,
    department: employee.department,
    user: employee.user,
    salaries: employee.salaries.map((salary) => ({
      baseSalary: salary.baseSalary.toString(),
    })),
    bankAccounts: employee.bankAccounts.map((account) => ({
      isVerified: account.isVerified,
    })),
  };
}

export async function getEmployeeAction(id: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.EMPLOYEES_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id, schoolId: ctx.schoolId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        salaries: { orderBy: { effectiveFrom: "desc" } },
        bankAccounts: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!employee) return null;

    return {
      ...employee,
      bankAccounts: employee.bankAccounts.map(toMaskedBankAccount),
    };
  });
}

export async function createEmployeeAction(input: z.infer<typeof createEmployeeSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.EMPLOYEES_MANAGE);
  const data = createEmployeeSchema.parse(input);

  const jobConfig = await withTenantContext(ctx.schoolId, async (tx) =>
    tx.schoolEmployeeJobTypeConfig.findUnique({
      where: { schoolId_jobType: { schoolId: ctx.schoolId, jobType: data.jobType } },
    }),
  );
  if (jobConfig && !jobConfig.isEnabled) {
    throw new Error(`Job type ${JOB_TYPE_LABELS[data.jobType]} is disabled for this school`);
  }

  const platformRole = getPlatformRoleForJobType(data.jobType) as Role;
  const passwordHash = await hash(data.password, 12);

  const employee = await withTenantContext(ctx.schoolId, async (tx) => {
    const existingCode = await tx.employee.findUnique({
      where: { schoolId_employeeCode: { schoolId: ctx.schoolId, employeeCode: data.employeeCode } },
    });
    if (existingCode) throw new Error("Employee code already exists");

    const user = await tx.user.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        name: data.name,
        passwordHash,
        phone: data.phone,
      },
      update: { name: data.name, phone: data.phone },
    });

    await tx.userSchoolMembership.upsert({
      where: {
        userId_schoolId_role: {
          userId: user.id,
          schoolId: ctx.schoolId,
          role: platformRole,
        },
      },
      create: { userId: user.id, schoolId: ctx.schoolId, role: platformRole },
      update: { isActive: true },
    });

    return tx.employee.create({
      data: {
        schoolId: ctx.schoolId,
        userId: user.id,
        employeeCode: data.employeeCode,
        jobType: data.jobType,
        department: data.department,
        dateOfJoining: new Date(data.dateOfJoining),
        emergencyContact: data.emergencyContact,
      },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "employee.create",
    schoolId: ctx.schoolId,
    entityType: "Employee",
    entityId: employee.id,
    metadata: { jobType: data.jobType, employeeCode: data.employeeCode },
  });

  revalidatePath("/admin/employees");
  return { employeeId: employee.id };
}

export async function updateEmployeeAction(input: z.infer<typeof updateEmployeeSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.EMPLOYEES_MANAGE);
  const data = updateEmployeeSchema.parse(input);

  const employee = await withTenantContext(ctx.schoolId, async (tx) => {
    const existing = await tx.employee.findFirst({
      where: { id: data.id, schoolId: ctx.schoolId },
      include: { user: true },
    });
    if (!existing) throw new Error("Employee not found");

    if (data.employeeCode && data.employeeCode !== existing.employeeCode) {
      const dup = await tx.employee.findUnique({
        where: { schoolId_employeeCode: { schoolId: ctx.schoolId, employeeCode: data.employeeCode } },
      });
      if (dup) throw new Error("Employee code already exists");
    }

    if (data.name || data.phone) {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
        },
      });
    }

    if (data.jobType && data.jobType !== existing.jobType) {
      const oldPlatformRole = getPlatformRoleForJobType(existing.jobType);
      const platformRole = getPlatformRoleForJobType(data.jobType);

      if (oldPlatformRole !== platformRole) {
        await tx.userSchoolMembership.updateMany({
          where: {
            userId: existing.userId,
            schoolId: ctx.schoolId,
            role: oldPlatformRole,
          },
          data: { isActive: false },
        });
        await tx.userSchoolMembership.upsert({
          where: {
            userId_schoolId_role: {
              userId: existing.userId,
              schoolId: ctx.schoolId,
              role: platformRole,
            },
          },
          create: {
            userId: existing.userId,
            schoolId: ctx.schoolId,
            role: platformRole,
          },
          update: { isActive: true },
        });
      }
    }

    if (data.employmentStatus === "TERMINATED") {
      const platformRole = getPlatformRoleForJobType(
        data.jobType ?? existing.jobType,
      );
      await tx.userSchoolMembership.updateMany({
        where: {
          userId: existing.userId,
          schoolId: ctx.schoolId,
          role: platformRole,
        },
        data: { isActive: false },
      });
    } else if (data.employmentStatus === "ACTIVE") {
      const platformRole = getPlatformRoleForJobType(
        data.jobType ?? existing.jobType,
      );
      await tx.userSchoolMembership.upsert({
        where: {
          userId_schoolId_role: {
            userId: existing.userId,
            schoolId: ctx.schoolId,
            role: platformRole,
          },
        },
        create: {
          userId: existing.userId,
          schoolId: ctx.schoolId,
          role: platformRole,
        },
        update: { isActive: true },
      });
    }

    return tx.employee.update({
      where: { id: data.id },
      data: {
        ...(data.employeeCode ? { employeeCode: data.employeeCode } : {}),
        ...(data.jobType ? { jobType: data.jobType } : {}),
        ...(data.department !== undefined ? { department: data.department } : {}),
        ...(data.employmentStatus ? { employmentStatus: data.employmentStatus } : {}),
        ...(data.dateOfJoining ? { dateOfJoining: new Date(data.dateOfJoining) } : {}),
        ...(data.dateOfLeaving !== undefined
          ? { dateOfLeaving: data.dateOfLeaving ? new Date(data.dateOfLeaving) : null }
          : {}),
        ...(data.emergencyContact !== undefined ? { emergencyContact: data.emergencyContact } : {}),
      },
    });
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "employee.update",
    schoolId: ctx.schoolId,
    entityType: "Employee",
    entityId: employee.id,
    metadata: { changes: data },
  });

  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${employee.id}`);
  return { success: true };
}

export async function upsertEmployeeSalaryAction(input: z.infer<typeof salarySchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_MANAGE);
  const data = salarySchema.parse(input);

  const salary = await withTenantContext(ctx.schoolId, async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: data.employeeId, schoolId: ctx.schoolId },
    });
    if (!employee) throw new Error("Employee not found");

    const effectiveFrom = new Date(data.effectiveFrom);

    await tx.employeeSalary.updateMany({
      where: {
        employeeId: data.employeeId,
        effectiveTo: null,
        effectiveFrom: { lt: effectiveFrom },
      },
      data: { effectiveTo: effectiveFrom },
    });

    return tx.employeeSalary.create({
      data: {
        schoolId: ctx.schoolId,
        employeeId: data.employeeId,
        baseSalary: data.baseSalary,
        allowances: data.allowances,
        deductions: data.deductions,
        effectiveFrom,
      },
    });
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "employee.salary.upsert",
    schoolId: ctx.schoolId,
    entityType: "EmployeeSalary",
    entityId: salary.id,
    metadata: { employeeId: data.employeeId, baseSalary: data.baseSalary },
  });

  revalidatePath(`/admin/employees/${data.employeeId}`);
  return { salaryId: salary.id };
}

export async function upsertEmployeeBankAccountAction(input: z.infer<typeof bankAccountSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.EMPLOYEES_MANAGE);
  await revalidateSessionForSensitiveOp(ctx.userId, ctx.schoolId, ctx.role);
  const data = bankAccountSchema.parse(input);

  if (!validateIfsc(data.ifsc)) throw new Error("Invalid IFSC code");
  if (!validateAccountNumber(data.accountNumber)) throw new Error("Invalid account number");

  const account = await withTenantContext(ctx.schoolId, async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: data.employeeId, schoolId: ctx.schoolId },
    });
    if (!employee) throw new Error("Employee not found");

    const encrypted = {
      accountNumberEncrypted: encryptBankField(data.accountNumber),
      ifscEncrypted: encryptBankField(data.ifsc.toUpperCase()),
      upiIdEncrypted: data.upiId ? encryptBankField(data.upiId) : null,
    };

    const existing = await tx.employeeBankAccount.findFirst({
      where: { employeeId: data.employeeId, schoolId: ctx.schoolId },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return tx.employeeBankAccount.update({
        where: { id: existing.id },
        data: {
          accountHolder: data.accountHolder,
          ...encrypted,
          bankName: data.bankName,
          isVerified: false,
          verifiedAt: null,
          razorpayContactId: null,
          razorpayFundAccountId: null,
        },
      });
    }

    return tx.employeeBankAccount.create({
      data: {
        schoolId: ctx.schoolId,
        employeeId: data.employeeId,
        accountHolder: data.accountHolder,
        ...encrypted,
        bankName: data.bankName,
      },
    });
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "employee.bank.upsert",
    schoolId: ctx.schoolId,
    entityType: "EmployeeBankAccount",
    entityId: account.id,
    metadata: { employeeId: data.employeeId },
  });

  revalidatePath(`/admin/employees/${data.employeeId}`);
  return { accountId: account.id };
}

export async function verifyEmployeeBankAccountAction(employeeId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.BANK_DETAILS_VIEW);
  await revalidateSessionForSensitiveOp(ctx.userId, ctx.schoolId, ctx.role);

  await withTenantContext(ctx.schoolId, async (tx) => {
    const account = await tx.employeeBankAccount.findFirst({
      where: { employeeId, schoolId: ctx.schoolId },
      orderBy: { createdAt: "desc" },
    });
    if (!account) throw new Error("Bank account not found");

    await tx.employeeBankAccount.update({
      where: { id: account.id },
      data: { isVerified: true, verifiedAt: new Date() },
    });
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "employee.bank.verify",
    schoolId: ctx.schoolId,
    entityType: "Employee",
    entityId: employeeId,
  });

  revalidatePath(`/admin/employees/${employeeId}`);
  return { success: true };
}

export async function listEnabledJobTypesAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    const configs = await tx.schoolEmployeeJobTypeConfig.findMany({
      where: { schoolId: ctx.schoolId },
    });
    if (configs.length === 0) {
      return ALL_JOB_TYPES.map((jobType) => ({
        jobType,
        isEnabled: true,
        minimumLeaves: 0,
        leaveAllowancePeriod: "MONTH" as const,
      }));
    }
    const configMap = new Map(configs.map((c) => [c.jobType, c]));
    return ALL_JOB_TYPES.map((jobType) => {
      const config = configMap.get(jobType);
      return {
        jobType,
        isEnabled: config?.isEnabled ?? true,
        minimumLeaves: config?.minimumLeaves ?? 0,
        leaveAllowancePeriod: config?.leaveAllowancePeriod ?? ("MONTH" as const),
      };
    });
  });
}

export async function updateJobTypeLeaveAllowanceAction(
  jobType: EmployeeJobType,
  minimumLeaves: number,
  leaveAllowancePeriod: "MONTH" | "YEAR",
) {
  const ctx = await requireSchoolPermission(PERMISSIONS.EMPLOYEES_MANAGE);

  await withTenantContext(ctx.schoolId, async (tx) => {
    const existing = await tx.schoolEmployeeJobTypeConfig.findUnique({
      where: { schoolId_jobType: { schoolId: ctx.schoolId, jobType } },
    });

    await tx.schoolEmployeeJobTypeConfig.upsert({
      where: { schoolId_jobType: { schoolId: ctx.schoolId, jobType } },
      create: {
        schoolId: ctx.schoolId,
        jobType,
        isEnabled: existing?.isEnabled ?? true,
        minimumLeaves,
        leaveAllowancePeriod,
      },
      update: { minimumLeaves, leaveAllowancePeriod },
    });
  });

  revalidatePath("/admin/employees/settings");
  return { success: true };
}

export async function updateJobTypeConfigAction(jobType: EmployeeJobType, isEnabled: boolean) {
  const ctx = await requireSchoolPermission(PERMISSIONS.EMPLOYEES_MANAGE);

  await withTenantContext(ctx.schoolId, async (tx) => {
    await tx.schoolEmployeeJobTypeConfig.upsert({
      where: { schoolId_jobType: { schoolId: ctx.schoolId, jobType } },
      create: { schoolId: ctx.schoolId, jobType, isEnabled },
      update: { isEnabled },
    });
  });

  revalidatePath("/admin/employees/settings");
  return { success: true };
}

export async function getEmployeeForCurrentUserAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { schoolId_userId: { schoolId: ctx.schoolId, userId: ctx.userId } },
      include: {
        user: { select: { name: true, email: true } },
        salaries: { orderBy: { effectiveFrom: "desc" }, take: 1 },
        bankAccounts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!employee) return null;
    return {
      ...employee,
      bankAccounts: employee.bankAccounts.map(toMaskedBankAccount),
      activeSalary: employee.salaries[0]
        ? {
            ...employee.salaries[0],
            baseSalary: Number(employee.salaries[0].baseSalary),
            allowances: parseSalaryComponents(employee.salaries[0].allowances),
            deductions: parseSalaryComponents(employee.salaries[0].deductions),
          }
        : null,
    };
  });
}

export async function backfillTeacherEmployeesAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.EMPLOYEES_MANAGE);

  const created = await withTenantContext(ctx.schoolId, async (tx) => {
    const teachers = await tx.userSchoolMembership.findMany({
      where: { schoolId: ctx.schoolId, role: "TEACHER", isActive: true },
      include: { user: true },
    });

    let count = 0;
    for (const membership of teachers) {
      const existing = await tx.employee.findUnique({
        where: { schoolId_userId: { schoolId: ctx.schoolId, userId: membership.userId } },
      });
      if (existing) continue;

      const code = `TCH-${membership.user.email.split("@")[0].slice(0, 8).toUpperCase()}-${count + 1}`;
      await tx.employee.create({
        data: {
          schoolId: ctx.schoolId,
          userId: membership.userId,
          employeeCode: code,
          jobType: "TEACHER",
          dateOfJoining: membership.createdAt,
        },
      });
      count++;
    }
    return count;
  });

  revalidatePath("/admin/employees");
  return { created };
}
