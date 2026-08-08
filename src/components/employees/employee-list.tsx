"use client";

import Link from "next/link";
import type { EmployeeJobType, EmploymentStatus } from "@prisma/client";
import { JOB_TYPE_LABELS, JOB_CATEGORY_LABELS, type JobCategory } from "@/lib/employees/job-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface EmployeeRow {
  id: string;
  employeeCode: string;
  jobType: EmployeeJobType;
  employmentStatus: EmploymentStatus;
  department: string | null;
  user: { name: string; email: string };
  salaries: { baseSalary: string }[];
  bankAccounts: { isVerified: boolean }[];
}

interface Props {
  employees: EmployeeRow[];
  activeCategory?: string;
}

function getPayrollSetupStatus(employee: EmployeeRow) {
  const hasSalary = employee.salaries.length > 0;
  const bank = employee.bankAccounts[0];
  const hasVerifiedBank = Boolean(bank?.isVerified);
  const isActive = employee.employmentStatus === "ACTIVE";
  const needsSetup = isActive && (!hasSalary || !hasVerifiedBank);
  return { hasSalary, bank, hasVerifiedBank, needsSetup };
}

export function EmployeeList({ employees, activeCategory }: Props) {
  const categories: (JobCategory | "all")[] = ["all", "teaching", "administrative", "transport", "security", "maintenance", "support"];

  return (
    <div className="space-y-4">
      <Tabs value={activeCategory ?? "all"}>
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} asChild>
              <Link href={cat === "all" ? "/admin/employees" : `/admin/employees?category=${cat}`}>
                {cat === "all" ? "All" : JOB_CATEGORY_LABELS[cat]}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Salary</TableHead>
            <TableHead>Bank</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => {
            const { hasSalary, bank, hasVerifiedBank, needsSetup } = getPayrollSetupStatus(e);
            return (
              <TableRow key={e.id} className={cn(needsSetup && "bg-warning-light/30")}>
                <TableCell>
                  <Link href={`/admin/employees/${e.id}`} className="font-medium hover:underline">
                    {e.employeeCode}
                  </Link>
                </TableCell>
                <TableCell>
                  <div>{e.user.name}</div>
                  <div className="text-xs text-text-2">{e.user.email}</div>
                </TableCell>
                <TableCell>{JOB_TYPE_LABELS[e.jobType]}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      e.employmentStatus === "ACTIVE" ? "success" :
                      e.employmentStatus === "TERMINATED" ? "danger" :
                      "warning"
                    }
                  >
                    {e.employmentStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  {hasSalary ? (
                    <span>₹{e.salaries[0].baseSalary}</span>
                  ) : (
                    <Badge variant="warning">Not set</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!bank ? (
                    <Badge variant="warning">Missing</Badge>
                  ) : hasVerifiedBank ? (
                    <Badge variant="success">Verified</Badge>
                  ) : (
                    <Badge variant="warning">Pending verification</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/employees/${e.id}`}>Manage</Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
