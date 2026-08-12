import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getSessionContext } from "@/lib/rbac/guard";
import { SelectContextClient } from "./select-context-client";
import styles from "../(auth)/login/login.module.css";

export default async function SelectContextPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  return (
    <div className={styles.page}>
      <div className={`glass ${styles.card}`}>
        <header className={styles.header}>
          <div className={styles.brandRow}>
            <div className={styles.logo}>CS</div>
            <h1 className={styles.title}>ClassSync</h1>
          </div>
          <p className={styles.subtitle}>
            Welcome, {ctx.name}. Choose how you want to use the app.
          </p>
        </header>

        <Suspense
          fallback={
            <p className="py-6 text-center text-sm text-text-2">Preparing your portal…</p>
          }
        >
          <SelectContextClient />
        </Suspense>
      </div>

      <p className={styles.footer}>
        <Lock className={styles.footerIcon} />
        One account · Multiple schools &amp; roles
      </p>
    </div>
  );
}
