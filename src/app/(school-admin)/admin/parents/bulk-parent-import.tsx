"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { importBulkParentsAction } from "@/actions/bulk-parents";
import type { BulkParentImportResult } from "@/lib/parents/types";
import { generateBulkParentTemplateCsv } from "@/lib/parents/bulk-csv";
import { buildCredentialsMessage } from "@/lib/parents/types";
import { formatRoleLabel } from "@/lib/nav-config";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function downloadTextFile(filename: string, contents: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toResultsCsv(result: BulkParentImportResult): string {
  const headers = ["Status", "Row", "Email", "Parent Name", "Student Name", "Temporary Password", "Details"];
  const lines = [headers.join(",")];
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;

  for (const row of result.created) {
    lines.push(
      ["Created", row.rowNumber, row.email, row.parentName, row.studentName, row.temporaryPassword, "New parent user"]
        .map((cell) => quote(String(cell)))
        .join(","),
    );
  }
  for (const row of result.roleAdded) {
    const roles = row.existingRoles.map(formatRoleLabel).join(", ") || "Other";
    lines.push(
      ["Role added", row.rowNumber, row.email, row.parentName, row.studentName, "", `Added Parent role (existing: ${roles})`]
        .map((cell) => quote(String(cell)))
        .join(","),
    );
  }
  for (const row of result.linked) {
    lines.push(
      ["Linked", row.rowNumber, row.email, row.parentName, row.studentName, "", "Existing parent, new child linked"]
        .map((cell) => quote(String(cell)))
        .join(","),
    );
  }
  for (const row of result.failed) {
    lines.push(
      ["Failed", row.rowNumber, row.email, "", row.studentName, "", row.reason]
        .map((cell) => quote(String(cell)))
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}

export function BulkParentImport({ schoolName }: { schoolName: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BulkParentImportResult | null>(null);

  const loginUrl = useMemo(() => {
    if (typeof window === "undefined") return "/login";
    return `${window.location.origin}/login`;
  }, []);

  function handleDownloadTemplate() {
    downloadTextFile("bulk-parent-template.csv", generateBulkParentTemplateCsv());
  }

  async function handleImport() {
    if (!file) {
      setError("Choose a completed CSV file first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const next = await importBulkParentsAction(formData);
      setResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk parent user creation</CardTitle>
          <CardDescription>
            Download the template, fill student and parent details, then upload the CSV. Temporary
            passwords are generated only for newly created parent accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-text-2">
            <li>Download the bulk upload template.</li>
            <li>Enter Student Name, Father&apos;s Name, Mother&apos;s Name, Email ID, and Phone Number.</li>
            <li>Save the file as CSV (UTF-8) and upload it here.</li>
          </ol>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4" />
              Download template
            </Button>
            <div className="min-w-0 flex-1">
              <FileInput name="file" accept=".csv,text/csv" onChange={setFile} />
            </div>
            <Button type="button" onClick={handleImport} disabled={loading || !file}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {loading ? "Importing…" : "Upload and process"}
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <ImportSummary result={result} schoolName={schoolName} loginUrl={loginUrl} />
      )}
    </div>
  );
}

function ImportSummary({
  result,
  schoolName,
  loginUrl,
}: {
  result: BulkParentImportResult;
  schoolName: string;
  loginUrl: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Import summary</CardTitle>
          <CardDescription>
            New accounts received a temporary password. Existing users kept their current password.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadTextFile("bulk-parent-import-results.csv", toResultsCsv(result))}
        >
          <Download className="h-4 w-4" />
          Download report
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <SummaryStat label="Users created" value={result.summary.usersCreated} />
          <SummaryStat label="Users updated" value={result.summary.usersRoleAdded} />
          <SummaryStat label="Children linked" value={result.summary.studentsCreated} />
          <SummaryStat label="Failed rows" value={result.summary.failed} tone="danger" />
        </div>

        {result.created.length > 0 && (
          <ResultTable
            title="Successfully created users"
            status="Created"
            badge="success"
            headers={["Row", "Parent", "Email", "Child", "Temporary password"]}
          >
            {result.created.map((row) => (
              <TableRow key={`created-${row.rowNumber}-${row.email}`}>
                <TableCell>{row.rowNumber}</TableCell>
                <TableCell className="font-medium">{row.parentName}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.studentName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-xs">{row.temporaryPassword}</code>
                    <CopyButton
                      value={buildCredentialsMessage({
                        schoolName,
                        email: row.email,
                        temporaryPassword: row.temporaryPassword,
                        loginUrl,
                      })}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </ResultTable>
        )}

        {result.roleAdded.length > 0 && (
          <ResultTable
            title="Existing users updated with Parent role"
            status="Updated"
            badge="warning"
            headers={["Row", "Parent", "Email", "Child", "Previous roles"]}
          >
            {result.roleAdded.map((row) => (
              <TableRow key={`role-${row.rowNumber}-${row.email}`}>
                <TableCell>{row.rowNumber}</TableCell>
                <TableCell className="font-medium">{row.parentName}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.studentName}</TableCell>
                <TableCell className="text-text-2">
                  {row.existingRoles.map(formatRoleLabel).join(", ") || "None"}
                </TableCell>
              </TableRow>
            ))}
          </ResultTable>
        )}

        {result.linked.length > 0 && (
          <ResultTable
            title="Existing parents linked to a new child"
            status="Linked"
            badge="info"
            headers={["Row", "Parent", "Email", "Child"]}
          >
            {result.linked.map((row) => (
              <TableRow key={`linked-${row.rowNumber}-${row.email}`}>
                <TableCell>{row.rowNumber}</TableCell>
                <TableCell className="font-medium">{row.parentName}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.studentName}</TableCell>
              </TableRow>
            ))}
          </ResultTable>
        )}

        {result.failed.length > 0 && (
          <ResultTable
            title="Failed records"
            status="Failed"
            badge="danger"
            headers={["Row", "Student", "Email", "Reason"]}
          >
            {result.failed.map((row) => (
              <TableRow key={`failed-${row.rowNumber}-${row.email}-${row.reason}`}>
                <TableCell>{row.rowNumber}</TableCell>
                <TableCell>{row.studentName || "—"}</TableCell>
                <TableCell>{row.email || "—"}</TableCell>
                <TableCell className="text-danger">{row.reason}</TableCell>
              </TableRow>
            ))}
          </ResultTable>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger";
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface-nested px-4 py-3">
      <p className="text-sm text-text-2">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "danger" ? "text-danger" : "text-text-1"}`}>
        {value}
      </p>
    </div>
  );
}

function ResultTable({
  title,
  status,
  badge,
  headers,
  children,
}: {
  title: string;
  status: string;
  badge: "success" | "warning" | "info" | "danger";
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-text-1">{title}</h3>
        <Badge variant={badge} hideIcon>
          {status}
        </Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={copy}>
      {copied ? "Copied" : "Copy login"}
    </Button>
  );
}
