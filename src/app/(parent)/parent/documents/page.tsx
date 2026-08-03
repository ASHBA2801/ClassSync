import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getLinkedStudentsAction } from "@/actions/parent";
import { DocumentUploadForm } from "./document-upload";
import { parentNav } from "@/lib/nav-config";

export default async function DocumentsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "PARENT") redirect("/login");

  const students = await getLinkedStudentsAction();

  return (
    <PortalShell title="Documents" navItems={parentNav} userName={ctx.name}>
      <DocumentUploadForm students={students.map((s) => ({ id: s.id, name: s.name }))} />
    </PortalShell>
  );
}
