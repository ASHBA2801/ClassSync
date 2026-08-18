import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listStudentsAction, listClassSectionsAction } from "@/actions/school-admin";
import { CreateStudentForm } from "./create-student-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { schoolAdminNav } from "@/lib/nav-config";
import Link from "next/link";

export default async function StudentsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [students, classes] = await Promise.all([
    listStudentsAction(),
    listClassSectionsAction(),
  ]);

  return (
    <PortalShell title="Students" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Add Student</CardTitle></CardHeader>
          <CardContent><CreateStudentForm classes={classes} /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Students ({students.length})</CardTitle>
            <Link href="/admin/parents" className="text-sm font-medium text-primary hover:underline">
              Bulk parent upload
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Admission #</TableHead>
                  <TableHead>Guardians</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant={s.classSection ? "default" : "outline"}>
                        {s.classSection?.name ?? "Unassigned"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-text-2 font-mono text-xs">{s.admissionNo}</TableCell>
                    <TableCell className="text-text-2">{s.guardianRelationships.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
