import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, setTenantContext, withSystemAdminContext } from "@/lib/db/prisma";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("tenant isolation (RLS integration)", () => {
  let schoolAId: string;
  let schoolBId: string;

  beforeAll(async () => {
    const schoolA = await prisma.school.create({
      data: { name: "Test School A", slug: `test-a-${Date.now()}`, timezone: "UTC" },
    });
    const schoolB = await prisma.school.create({
      data: { name: "Test School B", slug: `test-b-${Date.now()}`, timezone: "UTC" },
    });
    schoolAId = schoolA.id;
    schoolBId = schoolB.id;

    await withSystemAdminContext(async (tx) => {
      await tx.student.create({
        data: { schoolId: schoolAId, name: "Student A" },
      });
      await tx.student.create({
        data: { schoolId: schoolBId, name: "Student B" },
      });
    });
  });

  afterAll(async () => {
    await withSystemAdminContext(async (tx) => {
      await tx.student.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await tx.school.deleteMany({ where: { id: { in: [schoolAId, schoolBId] } } });
    });
    await prisma.$disconnect();
  });

  it("returns only tenant A students when context is school A", async () => {
    const students = await prisma.$transaction(async (tx) => {
      await setTenantContext(tx as never, schoolAId);
      return tx.student.findMany();
    });

    expect(students.every((s) => s.schoolId === schoolAId)).toBe(true);
    expect(students.some((s) => s.name === "Student A")).toBe(true);
    expect(students.some((s) => s.name === "Student B")).toBe(false);
  });

  it("returns only tenant B students when context is school B", async () => {
    const students = await prisma.$transaction(async (tx) => {
      await setTenantContext(tx as never, schoolBId);
      return tx.student.findMany();
    });

    expect(students.every((s) => s.schoolId === schoolBId)).toBe(true);
    expect(students.some((s) => s.name === "Student B")).toBe(true);
  });

  it("system admin bypass sees all students", async () => {
    const students = await withSystemAdminContext(async (tx) => {
      return tx.student.findMany({
        where: { schoolId: { in: [schoolAId, schoolBId] } },
      });
    });

    expect(students.length).toBeGreaterThanOrEqual(2);
  });
});
