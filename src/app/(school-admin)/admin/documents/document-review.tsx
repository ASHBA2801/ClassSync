"use client";

import { reviewDocumentAction } from "@/actions/parent";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Document {
  id: string;
  name: string;
  mimeType: string;
  student: { name: string };
}

export function DocumentReviewList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-text-2 py-4 text-center">No pending documents.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          <TableHead>Student</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="font-medium">{doc.name}</TableCell>
            <TableCell className="text-text-2">{doc.student.name}</TableCell>
            <TableCell>
              <Badge variant="outline" hideIcon>{doc.mimeType}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button size="sm" onClick={() => reviewDocumentAction(doc.id, "APPROVED")}>
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => reviewDocumentAction(doc.id, "REJECTED")}>
                  Reject
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
