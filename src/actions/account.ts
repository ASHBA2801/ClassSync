"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/rbac/guard";

export async function getAccountProfileAction() {
  const ctx = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, email: true, phone: true, createdAt: true },
  });

  if (!user) return null;

  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    role: ctx.role,
    memberSince: user.createdAt.toISOString(),
  };
}

export async function updateProfileAction(input: { name: string; phone?: string }) {
  const ctx = await requireAuth();
  const name = input.name.trim();

  if (!name) return { error: "Name is required." };

  await prisma.user.update({
    where: { id: ctx.userId },
    data: {
      name,
      phone: input.phone?.trim() || null,
    },
  });

  revalidatePath("/account/profile");
  return { success: true };
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const ctx = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { passwordHash: true },
  });

  if (!user) return { error: "User not found." };

  const valid = await compare(input.currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  if (input.newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  await prisma.user.update({
    where: { id: ctx.userId },
    data: { passwordHash: await hash(input.newPassword, 12) },
  });

  return { success: true };
}

export async function getActiveSessionAction() {
  const session = await auth();
  if (!session?.user) return null;

  return {
    email: session.user.email!,
    name: session.user.name!,
    role: session.user.role,
    signedInAt: session.user.sessionStarted
      ? new Date(session.user.sessionStarted).toISOString()
      : new Date().toISOString(),
  };
}
