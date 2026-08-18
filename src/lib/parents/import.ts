import { hash } from "bcryptjs";
import type { PrismaClient, Role } from "@prisma/client";
import { upsertSchoolMembership, withTenantContext } from "@/lib/db/prisma";
import { classifyParentUserCase, type ParentUserCase } from "@/lib/parents/cases";
import {
  parentDisplayName,
  parentRelation,
  parseBulkParentCsv,
  validateBulkParentRows,
  type BulkParentFailure,
  type BulkParentRow,
} from "@/lib/parents/bulk-csv";
import { generateTemporaryPassword } from "@/lib/parents/password";
import type {
  BulkParentCreatedRow,
  BulkParentImportResult,
  BulkParentLinkedRow,
  BulkParentUpdatedRow,
} from "@/lib/parents/types";

export type {
  BulkParentCreatedRow,
  BulkParentImportResult,
  BulkParentLinkedRow,
  BulkParentUpdatedRow,
} from "@/lib/parents/types";

type CachedUser = {
  id: string;
  email: string;
  name: string;
  memberships: { role: Role; isActive: boolean }[];
};

interface ImportContext {
  schoolId: string;
  schoolName: string;
}

export async function importBulkParentsFromCsv(
  csvText: string,
  ctx: ImportContext,
): Promise<BulkParentImportResult> {
  const parsed = parseBulkParentCsv(csvText);
  const { valid, failed } = validateBulkParentRows(parsed);
  const result: BulkParentImportResult = {
    created: [],
    roleAdded: [],
    linked: [],
    failed: [...failed],
    summary: { usersCreated: 0, usersRoleAdded: 0, studentsCreated: 0, failed: 0 },
  };

  if (valid.length === 0) {
    result.summary.failed = result.failed.length;
    return result;
  }

  const uniqueEmails = [...new Set(valid.map((row) => row.email))];
  const uniqueStudentNames = [...new Set(valid.map((row) => row.studentName.toLowerCase()))];

  const { userByEmail, linkedParentKeys } = await withTenantContext(ctx.schoolId, async (tx) => {
    const existingUsers = await tx.user.findMany({
      where: { email: { in: uniqueEmails } },
      include: {
        memberships: {
          where: { schoolId: ctx.schoolId, isActive: true },
          select: { role: true, isActive: true },
        },
      },
    });

    const users = new Map<string, CachedUser>(
      existingUsers.map((user) => [
        user.email.toLowerCase(),
        { id: user.id, email: user.email, name: user.name, memberships: user.memberships },
      ]),
    );

    const existingStudents = uniqueStudentNames.length
      ? await tx.student.findMany({
          where: {
            schoolId: ctx.schoolId,
            OR: uniqueStudentNames.map((name) => ({
              name: { equals: name, mode: "insensitive" as const },
            })),
          },
          include: { guardianRelationships: { select: { parentId: true } } },
        })
      : [];

    const mappings = new Set(
      existingStudents.flatMap((student) =>
        student.guardianRelationships.map(
          (rel) => `${rel.parentId}::${student.name.trim().toLowerCase()}`,
        ),
      ),
    );

    return { userByEmail: users, linkedParentKeys: mappings };
  });

  const sessionUsers = new Map<string, { id: string; case: ParentUserCase; existingRoles: Role[] }>();
  const createdPasswords = new Map<string, string>();
  const createdEmails = new Set<string>();
  const roleAddedEmails = new Set<string>();

  for (const row of valid) {
    try {
      const outcome = await withTenantContext(ctx.schoolId, (tx) =>
        processRow(row, {
          tx,
          ctx,
          userByEmail,
          sessionUsers,
          createdPasswords,
          linkedParentKeys,
        }),
      );

      if (outcome.kind === "failed") {
        result.failed.push(outcome.failure);
        continue;
      }

      result.summary.studentsCreated += 1;

      if (outcome.kind === "created") {
        createdEmails.add(row.email);
        result.created.push(outcome.row);
      } else if (outcome.kind === "add_role") {
        roleAddedEmails.add(row.email);
        result.roleAdded.push(outcome.row);
      } else {
        result.linked.push(outcome.row);
      }
    } catch (error) {
      result.failed.push({
        rowNumber: row.rowNumber,
        serialNo: row.serialNo,
        studentName: row.studentName,
        email: row.email,
        reason: error instanceof Error ? error.message : "Unexpected error while processing this row",
      });
    }
  }

  result.summary.usersCreated = createdEmails.size;
  result.summary.usersRoleAdded = roleAddedEmails.size;
  result.summary.failed = result.failed.length;
  return result;
}

async function processRow(
  row: BulkParentRow,
  state: {
    tx: PrismaClient;
    ctx: ImportContext;
    userByEmail: Map<string, CachedUser>;
    sessionUsers: Map<string, { id: string; case: ParentUserCase; existingRoles: Role[] }>;
    createdPasswords: Map<string, string>;
    linkedParentKeys: Set<string>;
  },
): Promise<
  | { kind: "created"; row: BulkParentCreatedRow }
  | { kind: "add_role"; row: BulkParentUpdatedRow }
  | { kind: "linked"; row: BulkParentLinkedRow }
  | { kind: "failed"; failure: BulkParentFailure }
> {
  const parentName = parentDisplayName(row);
  const relation = parentRelation(row);
  const cached = state.sessionUsers.get(row.email);
  const existing = state.userByEmail.get(row.email) ?? null;
  const appliedCase: ParentUserCase = cached?.case ?? classifyParentUserCase(existing);
  let userId = cached?.id ?? existing?.id;
  const existingRoles: Role[] = cached?.existingRoles ?? existing?.memberships.map((m) => m.role) ?? [];
  let temporaryPassword = state.createdPasswords.get(row.email) ?? "";

  if (userId) {
    const mappingKey = `${userId}::${row.studentName.toLowerCase()}`;
    if (state.linkedParentKeys.has(mappingKey)) {
      return {
        kind: "failed",
        failure: {
          rowNumber: row.rowNumber,
          serialNo: row.serialNo,
          studentName: row.studentName,
          email: row.email,
          reason: "Student is already linked to this parent",
        },
      };
    }
  }

  if (!userId) {
    temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hash(temporaryPassword, 12);
    const created = await state.tx.user.create({
      data: {
        email: row.email,
        name: parentName,
        phone: row.phone,
        passwordHash,
        forcePasswordChange: true,
      },
    });
    await upsertSchoolMembership(state.tx, created.id, state.ctx.schoolId, "PARENT");
    await logWelcomeCredentials(state.tx, state.ctx, created.id, row.email);
    userId = created.id;
  } else if (appliedCase === "add_role") {
    await upsertSchoolMembership(state.tx, userId, state.ctx.schoolId, "PARENT");
  }

  const student = await state.tx.student.create({
    data: {
      schoolId: state.ctx.schoolId,
      name: row.studentName,
      fatherName: row.fatherName || null,
      motherName: row.motherName || null,
    },
  });

  await state.tx.guardianRelationship.create({
    data: {
      schoolId: state.ctx.schoolId,
      parentId: userId,
      studentId: student.id,
      relation,
    },
  });

  state.linkedParentKeys.add(`${userId}::${row.studentName.toLowerCase()}`);
  if (appliedCase === "create") {
    state.createdPasswords.set(row.email, temporaryPassword);
    state.userByEmail.set(row.email, {
      id: userId,
      email: row.email,
      name: parentName,
      memberships: [{ role: "PARENT", isActive: true }],
    });
  }
  state.sessionUsers.set(row.email, {
    id: userId,
    case: "existing_parent",
    existingRoles,
  });

  if (appliedCase === "create") {
    return {
      kind: "created",
      row: {
        rowNumber: row.rowNumber,
        email: row.email,
        parentName,
        studentName: row.studentName,
        temporaryPassword: state.createdPasswords.get(row.email) ?? "",
        credentialsIssued: true,
      },
    };
  }

  if (appliedCase === "add_role") {
    return {
      kind: "add_role",
      row: {
        rowNumber: row.rowNumber,
        email: row.email,
        parentName,
        studentName: row.studentName,
        existingRoles,
      },
    };
  }

  return {
    kind: "linked",
    row: {
      rowNumber: row.rowNumber,
      email: row.email,
      parentName,
      studentName: row.studentName,
    },
  };
}

async function logWelcomeCredentials(
  tx: PrismaClient,
  ctx: ImportContext,
  userId: string,
  email: string,
) {
  await tx.notificationLog.create({
    data: {
      schoolId: ctx.schoolId,
      userId,
      channel: "EMAIL",
      title: "ClassSync parent login credentials",
      body: `An account was created for ${email} at ${ctx.schoolName}. Temporary login details are in the school admin import report. The parent must change the password after first login.`,
      status: "PENDING",
      metadata: { type: "parent_welcome", email },
    },
  });
}
