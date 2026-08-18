import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (value.every((v) => typeof v !== "object" || v == null)) {
      return value.map(String).join(", ");
    }
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return Object.entries(item as Record<string, unknown>)
            .map(([k, v]) => `${formatLabel(k)}: ${formatValue(v)}`)
            .join("; ");
        }
        return String(item);
      })
      .join(" · ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${formatLabel(k)}: ${formatValue(v)}`)
      .join("; ");
  }
  return String(value);
}

function flattenEntries(extracted: unknown): Array<{ key: string; value: string }> {
  if (!extracted || typeof extracted !== "object" || Array.isArray(extracted)) {
    return [];
  }
  return Object.entries(extracted as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: formatValue(value),
  }));
}

export type DocumentListItem = {
  id: string;
  name: string;
  status: string;
  documentType?: string | null;
  extractionConfidence?: number | null;
  reviewNote?: string | null;
  extracted?: unknown;
  downloadUrl?: string;
  student?: { id: string; name: string } | null;
  createdAt: string | Date;
};

function statusVariant(status: string): "success" | "danger" | "warning" | "outline" {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  return "warning";
}

export function DocumentList({
  documents,
  emptyMessage = "No documents yet.",
  showStudent = true,
}: {
  documents: DocumentListItem[];
  emptyMessage?: string;
  showStudent?: boolean;
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-text-2 py-4 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const fields = flattenEntries(doc.extracted);
        const confidence =
          typeof doc.extractionConfidence === "number"
            ? `${Math.round(doc.extractionConfidence * 100)}%`
            : null;

        return (
          <Card key={doc.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base">{doc.name}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-text-2">
                    {showStudent && doc.student?.name ? <span>{doc.student.name}</span> : null}
                    {doc.documentType ? <span>{formatLabel(doc.documentType)}</span> : null}
                    <span>{new Date(doc.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                  {confidence ? (
                    <Badge variant="outline" hideIcon>
                      Confidence {confidence}
                    </Badge>
                  ) : null}
                  {doc.downloadUrl ? (
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Download
                    </a>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {doc.reviewNote ? (
                <p className="text-sm text-warning">{doc.reviewNote}</p>
              ) : null}
              {fields.length > 0 ? (
                <dl className="grid gap-2 sm:grid-cols-2">
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      className="rounded-[var(--radius-sm)] border border-border px-3 py-2"
                    >
                      <dt className="text-xs text-text-2">{formatLabel(field.key)}</dt>
                      <dd className="mt-0.5 text-sm text-text-1 break-words">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-text-2">
                  {doc.status === "PENDING" && !doc.reviewNote
                    ? "We are processing your document."
                    : "No extracted details available."}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
