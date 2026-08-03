import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listPendingDocumentsAction } from "@/actions/parent";
import { DocumentReviewList } from "./document-review";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { schoolAdminNav } from "@/lib/nav-config";

export default async function AdminDocumentsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const documents = await listPendingDocumentsAction();

  return (
    <PortalShell title="Document Review" navItems={schoolAdminNav} userName={ctx.name}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Pending Documents</CardTitle>
            {documents.length > 0 && <Badge variant="warning">{documents.length}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <DocumentReviewList documents={documents} />
        </CardContent>
      </Card>
    </PortalShell>
  );
}
