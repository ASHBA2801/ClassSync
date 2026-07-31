"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma, withSystemAdminContext } from "@/lib/db/prisma";
import { requireRole } from "@/lib/rbac/guard";
import { createAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";

const onboardSchoolSchema = z.object({
  name: z.string().min(2),
  timezone: z.string().default("Asia/Kolkata"),
  campusLat: z.number().min(-90).max(90),
  campusLng: z.number().min(-180).max(180),
  campusRadiusM: z.number().default(200),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  planTier: z.enum(["FREE", "BASIC", "PREMIUM", "ENTERPRISE"]).default("BASIC"),
});

export async function onboardSchoolAction(input: z.infer<typeof onboardSchoolSchema>) {
  const ctx = await requireRole(["SYSTEM_ADMIN"]);
  const data = onboardSchoolSchema.parse(input);

  const slug = slugify(data.name);
  const passwordHash = await hash(data.adminPassword, 12);

  const school = await withSystemAdminContext(async (tx) => {
    const created = await tx.school.create({
      data: {
        name: data.name,
        slug,
        timezone: data.timezone,
        campusLat: data.campusLat,
        campusLng: data.campusLng,
        campusRadiusM: data.campusRadiusM,
        planTier: data.planTier,
      },
    });

    const admin = await tx.user.upsert({
      where: { email: data.adminEmail },
      create: {
        email: data.adminEmail,
        name: data.adminName,
        passwordHash,
      },
      update: { name: data.adminName },
    });

    await tx.userSchoolMembership.create({
      data: {
        userId: admin.id,
        schoolId: created.id,
        role: "SCHOOL_ADMIN",
      },
    });

    return created;
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "school.onboard",
    schoolId: school.id,
    entityType: "School",
    entityId: school.id,
    metadata: { name: data.name },
  });

  return { schoolId: school.id, slug: school.slug };
}

export async function listSchoolsAction() {
  await requireRole(["SYSTEM_ADMIN"]);
  return prisma.school.findMany({ orderBy: { createdAt: "desc" } });
}

export async function updateSchoolStatusAction(schoolId: string, status: "ACTIVE" | "SUSPENDED" | "OFFBOARDED") {
  const ctx = await requireRole(["SYSTEM_ADMIN"]);
  const school = await prisma.school.update({
    where: { id: schoolId },
    data: { status },
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "school.status_update",
    schoolId,
    metadata: { status },
  });

  return school;
}
