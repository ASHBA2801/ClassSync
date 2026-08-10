import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { processDocument } from "../src/lib/ai/documentProcessor";

const prisma = new PrismaClient();

async function main() {
  const doc = await prisma.document.findFirst({ orderBy: { createdAt: "desc" } });
  if (!doc) {
    console.log("No documents found");
    process.exit(1);
  }

  console.log("Reprocessing", doc.id, doc.s3Key, doc.mimeType);

  const result = await processDocument({
    s3Key: doc.s3Key,
    mimeType: doc.mimeType,
    documentId: doc.id,
    documentType: doc.documentType,
    uploaderType: (doc.uploaderType as "PARENT" | "TEACHER") || "PARENT",
    studentId: doc.studentId,
    schoolId: doc.schoolId,
    uploadedBy: doc.uploadedBy,
  });

  console.log("Result confidence:", result.confidence);
  console.log("Extracted keys:", result.extracted ? Object.keys(result.extracted) : null);

  const updated = await prisma.document.findUnique({
    where: { id: doc.id },
    select: { status: true, extractionConfidence: true, reviewNote: true },
  });
  console.log("Updated:", JSON.stringify(updated, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
