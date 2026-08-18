import { Prisma, type PrismaClient } from "@prisma/client";

const EXTRACTION_FIELDS_OMIT = {
  documentType: true,
  uploaderType: true,
  extracted: true,
  extractionConfidence: true,
} satisfies Prisma.DocumentOmit;

export async function findManyDocuments(
  tx: PrismaClient,
  args: Prisma.DocumentFindManyArgs,
) {
  try {
    return await tx.document.findMany(args);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      return tx.document.findMany({
        ...args,
        omit: EXTRACTION_FIELDS_OMIT,
      });
    }
    throw error;
  }
}
