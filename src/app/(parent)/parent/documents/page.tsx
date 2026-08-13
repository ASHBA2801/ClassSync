import { ParentPortalShell } from "@/components/parent-portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getLinkedStudentsAction, listParentDocumentsAction } from "@/actions/parent";
import { getPresignedDownloadUrl } from "@/lib/storage/s3";
import { DocumentUploadForm } from "./document-upload";
import { DocumentList } from "@/components/documents/document-list";
import { parentNav } from "@/lib/nav-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DocumentsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "PARENT") redirect("/login");

  const students = await getLinkedStudentsAction();
  const documents = await listParentDocumentsAction();
  const docsWithUrls = await Promise.all(
    documents.map(async (d) => ({
      ...d,
      downloadUrl: await getPresignedDownloadUrl(d.s3Key),
    })),
  );

  return (
    <ParentPortalShell title="Documents" navItems={parentNav} userName={ctx.name}>
      <div className="space-y-6">
        <DocumentUploadForm
          students={students.map((s) => ({ id: s.id, name: s.name }))}
          defaultStudentId={ctx.activeStudentId ?? undefined}
        />
        <Card>
          <CardHeader>
            <CardTitle>Student documents & extracted details</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList
              documents={docsWithUrls}
              emptyMessage="No documents uploaded yet."
            />
          </CardContent>
        </Card>
      </div>
    </ParentPortalShell>
  );
}
