import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parentNav } from "@/lib/nav-config";

export default async function PaymentCancelPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "PARENT") redirect("/login");

  return (
    <PortalShell title="Payment Cancelled" navItems={parentNav} userName={ctx.name}>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Payment cancelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-2">
            Your payment was not completed. You can try again from the fees page.
          </p>
          <Button asChild>
            <Link href="/parent/fees">Back to Fees</Link>
          </Button>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
