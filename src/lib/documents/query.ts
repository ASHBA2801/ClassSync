import { Prisma, type PrismaClient } from "@prisma/client";

const EXTRACTION_FIELDS_OMIT = {
  documentType: true,
  uploaderType: true,
  extracted: true,
  extractionConfidence: true,
} satisfies Prisma.DocumentOmit;

export async function findManyDocuments<T extends Prisma.DocumentFindManyArgs>(
  tx: any,
  args: Prisma.SelectSubset<T, Prisma.DocumentFindManyArgs>,
): Promise<Prisma.DocumentGetPayload<T>[]> {
  try {
    return await tx.document.findMany(args);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      return await tx.document.findMany({
        ...(args as any),
        omit: EXTRACTION_FIELDS_OMIT,
      });
    }
    throw error;
  }
}
