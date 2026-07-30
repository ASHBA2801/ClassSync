import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getLinkedStudentsAction } from "@/actions/parent";
import { DocumentUploadForm } from "./document-upload";

const navItems = [
  { href: "/parent", label: "Dashboard" },
  { href: "/parent/documents", label: "Documents" },
  { href: "/parent/leave", label: "Leave Requests" },
  { href: "/parent/fees", label: "Fees & Payments" },
];

export default async function DocumentsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "PARENT") redirect("/login");

  const students = await getLinkedStudentsAction();

  return (
    <PortalShell title="Documents" navItems={navItems} userName={ctx.name}>
      <DocumentUploadForm students={students.map((s) => ({ id: s.id, name: s.name }))} />
    </PortalShell>
  );
}
