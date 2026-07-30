"use client";

import { useState } from "react";
import {
  getDocumentUploadUrlAction,
  confirmDocumentUploadAction,
} from "@/actions/parent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Student {
  id: string;
  name: string;
}

export function DocumentUploadForm({ students }: { students: Student[] }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const file = (fd.get("file") as File);
    const studentId = fd.get("studentId") as string;

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
            <select name="studentId" className="flex h-10 w-full rounded-md border px-3 text-sm" required>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>File</Label>
            <Input name="file" type="file" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {done && <p className="text-sm text-green-600">Document uploaded for review</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
