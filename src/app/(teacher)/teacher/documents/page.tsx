import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listTeacherStudentDocumentsAction } from "@/actions/parent";
import { getPresignedDownloadUrl } from "@/lib/storage/s3";
import { DocumentList } from "@/components/documents/document-list";
import { teacherNav } from "@/lib/nav-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TeacherDocumentsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const documents = await listTeacherStudentDocumentsAction();
  const docsWithUrls = await Promise.all(
    documents.map(async (d) => ({
      ...d,
      downloadUrl: await getPresignedDownloadUrl(d.s3Key),
    })),
  );

  return (
    <PortalShell title="Student Documents" navItems={teacherNav} userName={ctx.name}>
      <Card>
        <CardHeader>
          <CardTitle>Documents for your students</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentList
            documents={docsWithUrls}
            emptyMessage="No documents uploaded yet for students in your assigned classes."
          />
        </CardContent>
      </Card>
    </PortalShell>
  );
}
