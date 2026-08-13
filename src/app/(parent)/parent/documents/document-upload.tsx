"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentType } from "@prisma/client";
import {
  getDocumentUploadUrlAction,
  confirmDocumentUploadAction,
} from "@/actions/parent";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Student {
  id: string;
  name: string;
}

export function DocumentUploadForm({
  students,
  defaultStudentId,
}: {
  students: Student[];
  defaultStudentId?: string;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(
    () => defaultStudentId && students.some((s) => s.id === defaultStudentId)
      ? defaultStudentId
      : students.length === 1
        ? students[0]!.id
        : "",
  );
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [relation, setRelation] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType | "">("");

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!studentId) return;
    const form = e.currentTarget;

    setLoading(true);
    setError("");
    setDone(false);
    const fd = new FormData(form);
    const file = fd.get("file") as File;

    try {
      const { uploadUrl, key } = await getDocumentUploadUrlAction({
        studentId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
      });

      const uploadResp = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadResp.ok) {
        throw new Error(`File upload failed (${uploadResp.status})`);
      }

      await confirmDocumentUploadAction({
        studentId,
        name: file.name,
        s3Key: key,
        mimeType: file.type || "application/octet-stream",
        documentType: documentType || undefined,
      });

      setDone(true);
      setStudentId("");
      setDocumentType("");
      setRelation("");
      try {
        form.reset();
      } catch {}
      router.refresh();
      // Extraction runs async — refresh again so fields appear when ready.
      window.setTimeout(() => router.refresh(), 8000);
      window.setTimeout(() => router.refresh(), 20000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader><CardTitle>Upload Document</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <Label>Student</Label>
            <Select value={studentId || undefined} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
            <div>
              <Label>Uploader</Label>
              <Select value={relation || undefined} onValueChange={setRelation}>
                <SelectTrigger>
                  <SelectValue placeholder="Student / Father / Mother / Guardian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="FATHER">Father</SelectItem>
                  <SelectItem value="MOTHER">Mother</SelectItem>
                  <SelectItem value="GUARDIAN">Guardian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document Type</Label>
              <Select
                value={documentType || undefined}
                onValueChange={(value) => setDocumentType(value as DocumentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AADHAAR">Aadhaar</SelectItem>
                  <SelectItem value="BIRTH_CERTIFICATE">Birth Certificate</SelectItem>
                  <SelectItem value="COMMUNITY_CERTIFICATE">Community Certificate</SelectItem>
                  <SelectItem value="MARKSHEET">Marksheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File</Label>
              <FileInput name="file" required />
              <p className="text-sm text-muted">Please upload a single, clear document in focus — this improves extraction accuracy.</p>
            </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          {done && <p className="text-sm text-success">Document uploaded — extracted details will appear below once processing finishes.</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
