import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getSchoolSettingsAction } from "@/actions/school-admin";
import { listPaymentProviderConfigsAction } from "@/actions/payments";
import { getPayoutConfigAction } from "@/actions/payout-config";
import { SettingsForms } from "./settings-forms";
import { schoolAdminNav } from "@/lib/nav-config";

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN" || !ctx.schoolId) redirect("/login");

  const [school, paymentProviders, payoutConfig] = await Promise.all([
    getSchoolSettingsAction(),
    listPaymentProviderConfigsAction(),
    getPayoutConfigAction(),
  ]);

  return (
    <PortalShell title="School Settings" navItems={schoolAdminNav} userName={ctx.name}>
      <SettingsForms
        schoolId={ctx.schoolId}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"}
        school={
          school
            ? {
                campusLat: school.campusLat,
                campusLng: school.campusLng,
                campusRadiusM: school.campusRadiusM,
                timezone: school.timezone,
                name: school.name,
              }
            : null
        }
        paymentProviders={paymentProviders}
        payoutConfig={payoutConfig}
      />
    </PortalShell>
  );
}
