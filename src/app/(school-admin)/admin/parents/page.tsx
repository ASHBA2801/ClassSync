import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listSchoolParentsAction } from "@/actions/bulk-parents";
import { getSchoolSettingsAction } from "@/actions/school-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { schoolAdminNav } from "@/lib/nav-config";
import { BulkParentImport } from "./bulk-parent-import";

export default async function ParentsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [parents, school] = await Promise.all([
    listSchoolParentsAction(),
    getSchoolSettingsAction(),
  ]);

  return (
    <PortalShell title="Parents" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="space-y-6">
        <BulkParentImport schoolName={school?.name ?? "School"} />

        <Card>
          <CardHeader>
            <CardTitle>Parent accounts ({parents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Children</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-text-2">
                      No parent accounts yet. Upload the template to create them.
                    </TableCell>
                  </TableRow>
                ) : (
                  parents.map((membership) => (
                    <TableRow key={membership.id}>
                      <TableCell className="font-medium">{membership.user.name}</TableCell>
                      <TableCell>{membership.user.email}</TableCell>
                      <TableCell className="text-text-2">{membership.user.phone ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {membership.user.guardianRelationships.length === 0 ? (
                            <span className="text-text-2">None</span>
                          ) : (
                            membership.user.guardianRelationships.map((rel) => (
                              <Badge key={rel.id} variant="outline" hideIcon>
                                {rel.student.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
