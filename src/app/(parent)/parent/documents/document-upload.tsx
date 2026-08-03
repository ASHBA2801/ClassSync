"use client";

import { useState } from "react";
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

export function DocumentUploadForm({ students }: { students: Student[] }) {
  const [studentId, setStudentId] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!studentId) return;

    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File;

    try {
      const { uploadUrl, key } = await getDocumentUploadUrlAction({
        studentId,
        filename: file.name,
        mimeType: file.type,
      });

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      await confirmDocumentUploadAction({
        studentId,
        name: file.name,
        s3Key: key,
        mimeType: file.type,
      });

      setDone(true);
      setStudentId("");
      e.currentTarget.reset();
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
            <Label>File</Label>
            <FileInput name="file" required />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          {done && <p className="text-sm text-success">Document uploaded for review</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
