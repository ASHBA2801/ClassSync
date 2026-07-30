"use client";

import { reviewDocumentAction } from "@/actions/parent";
import { Button } from "@/components/ui/button";

interface Document {
  id: string;
  name: string;
  mimeType: string;
  student: { name: string };
}

export function DocumentReviewList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-zinc-500">No pending documents.</p>;
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between rounded border p-3">
          <div>
            <p className="font-medium">{doc.name}</p>
            <p className="text-sm text-zinc-500">{doc.student.name} · {doc.mimeType}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => reviewDocumentAction(doc.id, "APPROVED")}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => reviewDocumentAction(doc.id, "REJECTED")}>
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
