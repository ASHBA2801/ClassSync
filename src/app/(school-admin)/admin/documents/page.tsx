import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listPendingDocumentsAction } from "@/actions/parent";
import { DocumentReviewList } from "./document-review";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/teachers", label: "Teachers" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/leave", label: "Leave Requests" },
  { href: "/admin/fees", label: "Fees" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminDocumentsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const documents = await listPendingDocumentsAction();

  return (
    <PortalShell title="Document Review" navItems={navItems} userName={ctx.name}>
      <Card>
        <CardHeader><CardTitle>Pending Documents ({documents.length})</CardTitle></CardHeader>
        <CardContent>
          <DocumentReviewList documents={documents} />
        </CardContent>
      </Card>
    </PortalShell>
  );
}
