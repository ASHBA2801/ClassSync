import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getSchoolSettingsAction } from "@/actions/school-admin";
import { listPaymentProviderConfigsAction } from "@/actions/payments";
import { SettingsForms } from "./settings-forms";
import { schoolAdminNav } from "@/lib/nav-config";

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [school, paymentProviders] = await Promise.all([
    getSchoolSettingsAction(),
    listPaymentProviderConfigsAction(),
  ]);

  return (
    <PortalShell title="School Settings" navItems={schoolAdminNav} userName={ctx.name}>
      <SettingsForms
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
      />
    </PortalShell>
  );
}
