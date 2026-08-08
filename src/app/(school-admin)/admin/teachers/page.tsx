import { redirect } from "next/navigation";
import { backfillTeacherEmployeesAction } from "@/actions/employees";

export default async function TeachersRedirectPage() {
  await backfillTeacherEmployeesAction();
  redirect("/admin/employees?category=teaching");
}
