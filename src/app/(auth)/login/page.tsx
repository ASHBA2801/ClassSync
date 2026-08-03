import { Suspense } from "react";
import { Lock } from "lucide-react";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={`glass ${styles.card}`}>
        <header className={styles.header}>
          <div className={styles.brandRow}>
            <div className={styles.logo}>CS</div>
            <h1 className={styles.title}>ClassSync</h1>
          </div>
          <p className={styles.subtitle}>Sign in to your school portal</p>
        </header>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>

      <p className={styles.footer}>
        <Lock className={styles.footerIcon} />
        Secure &bull; Reliable &bull; Built for Education
      </p>
    </div>
  );
}
