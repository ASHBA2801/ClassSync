"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateEmployeeAction,
  upsertEmployeeSalaryAction,
  upsertEmployeeBankAccountAction,
  verifyEmployeeBankAccountAction,
} from "@/actions/employees";
import type { EmployeeJobType, EmploymentStatus, Prisma } from "@prisma/client";
import { JOB_TYPE_LABELS } from "@/lib/employees/job-types";
import { parseSalaryComponents, type SalaryComponentMap } from "@/lib/employees/salary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SalaryComponentsEditor, emptySalaryComponents } from "@/components/employees/salary-components-editor";

interface BankAccount {
  id: string;
  accountHolder: string;
  accountNumberMasked: string;
  ifscMasked: string;
  upiMasked: string | null;
  bankName: string | null;
  isVerified: boolean;
}

interface Salary {
  id: string;
  baseSalary: { toString(): string };
  allowances: Prisma.JsonValue;
  deductions: Prisma.JsonValue;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

interface Props {
  employee: {
    id: string;
    employeeCode: string;
    jobType: EmployeeJobType;
    employmentStatus: EmploymentStatus;
    department: string | null;
    dateOfJoining: Date;
    emergencyContact: string | null;
    user: { name: string; email: string; phone: string | null };
    salaries: Salary[];
    bankAccounts: BankAccount[];
  };
  defaultTab?: "profile" | "salary" | "bank";
}

function formatComponents(components: SalaryComponentMap): string {
  const entries = Object.entries(components);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}: ₹${v}`).join(", ");
}

function getDefaultTab(employee: Props["employee"], override?: Props["defaultTab"]) {
  if (override) return override;
  if (employee.salaries.length === 0) return "salary";
  if (!employee.bankAccounts[0]?.isVerified) return "bank";
  return "profile";
}

export function EmployeeDetailTabs({ employee, defaultTab }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [status, setStatus] = useState(employee.employmentStatus);
  const [tab, setTab] = useState(getDefaultTab(employee, defaultTab));

  const currentSalary = employee.salaries[0];
  const currentAllowances = currentSalary ? parseSalaryComponents(currentSalary.allowances) : {};
  const currentDeductions = currentSalary ? parseSalaryComponents(currentSalary.deductions) : {};
  const [allowances, setAllowances] = useState<SalaryComponentMap>(currentAllowances);
  const [deductions, setDeductions] = useState<SalaryComponentMap>(currentDeductions);

  const bank = employee.bankAccounts[0];
  const hasSalary = employee.salaries.length > 0;
  const hasVerifiedBank = Boolean(bank?.isVerified);
  const needsPayrollSetup =
    employee.employmentStatus === "ACTIVE" && (!hasSalary || !hasVerifiedBank);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await updateEmployeeAction({
        id: employee.id,
        name: fd.get("name") as string,
        phone: (fd.get("phone") as string) || undefined,
        department: (fd.get("department") as string) || undefined,
        employmentStatus: status,
        emergencyContact: (fd.get("emergencyContact") as string) || undefined,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function saveSalary(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const baseSalary = Number(fd.get("baseSalary"));
    const previousBase = currentSalary ? Number(currentSalary.baseSalary) : 0;
    try {
      await upsertEmployeeSalaryAction({
        employeeId: employee.id,
        baseSalary,
        effectiveFrom: fd.get("effectiveFrom") as string,
        allowances,
        deductions,
      });
      if (baseSalary > previousBase && previousBase > 0) {
        // Increment recorded via audit metadata in server action
      }
      setAllowances(emptySalaryComponents().allowances);
      setDeductions(emptySalaryComponents().deductions);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salary update failed");
    }
  }

  async function saveBank(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await upsertEmployeeBankAccountAction({
        employeeId: employee.id,
        accountHolder: fd.get("accountHolder") as string,
        accountNumber: fd.get("accountNumber") as string,
        ifsc: fd.get("ifsc") as string,
        upiId: (fd.get("upiId") as string) || undefined,
        bankName: (fd.get("bankName") as string) || undefined,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bank update failed");
    }
  }

  async function verifyBank() {
    try {
      await verifyEmployeeBankAccountAction(employee.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      {needsPayrollSetup && (
        <Card className="mb-4 border-warning/30 bg-warning-light">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-text-1">Complete payroll setup before month-end</p>
              <ul className="mt-1 text-sm text-text-2">
                {!hasSalary && <li>Salary structure not set</li>}
                {hasSalary && !bank && <li>Bank account not added</li>}
                {bank && !hasVerifiedBank && <li>Bank account pending verification</li>}
              </ul>
            </div>
            <div className="flex gap-2">
              {!hasSalary && (
                <Button size="sm" variant="outline" onClick={() => setTab("salary")}>Set salary</Button>
              )}
              {hasSalary && !hasVerifiedBank && (
                <Button size="sm" variant="outline" onClick={() => setTab("bank")}>Set bank</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="salary">Salary</TabsTrigger>
        <TabsTrigger value="bank">Bank</TabsTrigger>
      </TabsList>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <TabsContent value="profile">
        <Card>
          <CardHeader><CardTitle>Employee Profile</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4 max-w-md">
              <p className="text-sm text-text-2">{JOB_TYPE_LABELS[employee.jobType]} · {employee.employeeCode}</p>
              <div><Label>Name</Label><Input name="name" defaultValue={employee.user.name} required /></div>
              <div><Label>Email</Label><Input value={employee.user.email} disabled /></div>
              <div><Label>Phone</Label><Input name="phone" defaultValue={employee.user.phone ?? ""} /></div>
              <div><Label>Department</Label><Input name="department" defaultValue={employee.department ?? ""} /></div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as EmploymentStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                    <SelectItem value="PROBATION">Probation</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Emergency Contact</Label><Input name="emergencyContact" defaultValue={employee.emergencyContact ?? ""} /></div>
              <Button type="submit">Save Profile</Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="salary">
        <Card>
          <CardHeader><CardTitle>Salary Structure</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {employee.salaries.map((s, index) => {
              const prev = employee.salaries[index + 1];
              const base = Number(s.baseSalary);
              const prevBase = prev ? Number(prev.baseSalary) : 0;
              const sAllowances = parseSalaryComponents(s.allowances);
              const sDeductions = parseSalaryComponents(s.deductions);
              const isIncrement = prev && base > prevBase;
              return (
                <div key={s.id} className="space-y-1 border-b border-border pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">₹{base.toFixed(2)} / month</span>
                    <div className="flex items-center gap-2">
                      {isIncrement && (
                        <Badge variant="success">
                          Increment (+₹{(base - prevBase).toFixed(2)})
                        </Badge>
                      )}
                      <span className="text-sm text-text-2">
                        From {s.effectiveFrom.toISOString().slice(0, 10)}
                        {s.effectiveTo ? ` to ${s.effectiveTo.toISOString().slice(0, 10)}` : " (current)"}
                      </span>
                    </div>
                  </div>
                  {formatComponents(sAllowances) && (
                    <p className="text-sm text-text-2">Allowances: {formatComponents(sAllowances)}</p>
                  )}
                  {formatComponents(sDeductions) && (
                    <p className="text-sm text-text-2">Deductions: {formatComponents(sDeductions)}</p>
                  )}
                </div>
              );
            })}
            <form onSubmit={saveSalary} className="space-y-4 max-w-lg">
              <div>
                <Label>Base Salary (₹)</Label>
                <Input
                  name="baseSalary"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  defaultValue={currentSalary ? Number(currentSalary.baseSalary) : undefined}
                />
              </div>
              <SalaryComponentsEditor
                allowances={allowances}
                deductions={deductions}
                onAllowancesChange={setAllowances}
                onDeductionsChange={setDeductions}
              />
              <div><Label>Effective From</Label><Input name="effectiveFrom" type="date" required defaultValue={today} /></div>
              <Button type="submit">{hasSalary ? "Add Salary Revision" : "Set Salary"}</Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bank">
        <Card>
          <CardHeader><CardTitle>Bank Account</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {bank && (
              <div className="glass-card space-y-2 p-4">
                <p><strong>{bank.accountHolder}</strong></p>
                <p className="text-sm text-text-2">A/C: {bank.accountNumberMasked} · IFSC: {bank.ifscMasked}</p>
                {bank.upiMasked && <p className="text-sm text-text-2">UPI: {bank.upiMasked}</p>}
                <Badge variant={bank.isVerified ? "success" : "warning"}>{bank.isVerified ? "Verified" : "Pending verification"}</Badge>
                {!bank.isVerified && (
                  <Button type="button" variant="outline" size="sm" onClick={verifyBank}>Mark Verified</Button>
                )}
              </div>
            )}
            <form onSubmit={saveBank} className="space-y-4 max-w-md">
              <div><Label>Account Holder</Label><Input name="accountHolder" defaultValue={bank?.accountHolder ?? employee.user.name} required /></div>
              <div><Label>Account Number</Label><Input name="accountNumber" required minLength={9} maxLength={18} placeholder="Enter full account number" /></div>
              <div><Label>IFSC</Label><Input name="ifsc" required maxLength={11} placeholder="ABCD0123456" /></div>
              <div><Label>UPI ID (optional)</Label><Input name="upiId" /></div>
              <div><Label>Bank Name</Label><Input name="bankName" defaultValue={bank?.bankName ?? ""} /></div>
              <Button type="submit">{bank ? "Update Bank Details" : "Add Bank Details"}</Button>
            </form>
            {!hasVerifiedBank && hasSalary && (
              <p className="text-sm text-text-2">
                Bank details are required for RazorpayX salary payouts.{" "}
                <Link href="/admin/settings" className="underline">Configure RazorpayX</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export function getEmployeeDefaultTab(employee: Props["employee"]): "profile" | "salary" | "bank" {
  return getDefaultTab(employee);
}
