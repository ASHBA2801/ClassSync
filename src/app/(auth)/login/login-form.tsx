"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Bus,
  ChevronRight,
  GraduationCap,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { credentialsSignInAction } from "@/actions/auth";
import { PasswordInput } from "@/components/ui/password-input";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import styles from "./login.module.css";

const DEMO_ICON_CLASSES = [
  styles.demoIconPurple,
  styles.demoIconBlue,
  styles.demoIconTeal,
  styles.demoIconPink,
] as const;

function getDemoIcon(role: string): LucideIcon {
  if (role.includes("System Admin")) return Shield;
  if (role.includes("School Admin")) return Building2;
  if (role.includes("Teacher")) return GraduationCap;
  if (role.includes("Driver")) return Bus;
  if (role.includes("Security")) return ShieldCheck;
  if (role.includes("Cleaner")) return Sparkles;
  if (role.includes("Parent")) return Users;
  return Users;
}

function authErrorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === "CredentialsSignin") return "Invalid email or password.";
  if (code === "MissingCSRF") return "Session expired. Please try again.";
  return "Sign in failed. Please try again.";
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = authErrorMessage(searchParams.get("error"));
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const error = formError || urlError || "";

  async function login(email: string, password: string) {
    setLoading(email);
    setFormError("");

    const result = await credentialsSignInAction({
      email,
      password,
    });

    if (result?.error) {
      setFormError(result.error);
      setLoading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await login(
      formData.get("email") as string,
      formData.get("password") as string,
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <div className={styles.inputWrap}>
            <Mail className={styles.inputIcon} />
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@school.com"
              className={`glass-input ${styles.input}`}
              disabled={loading !== null}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <div className={styles.inputWrap}>
            <Lock className={styles.inputIcon} />
            <PasswordInput
              id="password"
              name="password"
              required
              disabled={loading !== null}
              className={`glass-input ${styles.input} !pr-10`}
            />
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            <AlertCircle className={styles.errorIcon} />
            {error}
          </div>
        )}

        <button type="submit" disabled={loading !== null} className={`btn-gradient ${styles.submitBtn}`}>
          <Lock size={16} />
          {loading !== null ? "Signing in…" : "Sign in"}
          <span className={styles.submitArrow}>
            <ArrowRight size={16} />
          </span>
        </button>
      </form>

      <div className={styles.demoSection}>
        <div className={styles.demoDivider}>
          <div className={styles.demoDividerLine} />
          <div className={styles.demoDividerLabel}>
            <span className={styles.demoDividerText}>DEMO LOGINS</span>
          </div>
        </div>

        <p className={styles.demoCaption}>One-click sign in with seeded demo accounts</p>

        <ul className={styles.demoList}>
          {DEMO_ACCOUNTS.map((account, i) => {
            const Icon = getDemoIcon(account.role);
            return (
              <li key={account.email}>
                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => login(account.email, account.password)}
                  className={styles.demoBtn}
                >
                  <div className={`${styles.demoIcon} ${DEMO_ICON_CLASSES[i % DEMO_ICON_CLASSES.length]}`}>
                    <Icon className={styles.demoIconSvg} />
                  </div>
                  <div className={styles.demoText}>
                    <div className={styles.demoRole}>{account.role}</div>
                    <div className={styles.demoEmail}>
                      {loading === account.email ? "Signing in…" : account.email}
                    </div>
                  </div>
                  <ChevronRight className={styles.demoChevron} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
