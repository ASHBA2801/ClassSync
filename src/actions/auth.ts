"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function credentialsSignInAction(input: {
  email: string;
  password: string;
  schoolId?: string;
}) {
  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      schoolId: input.schoolId,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}
