import { getPresignedDownloadUrl, getPresignedUploadUrl } from "@/lib/storage/s3";
import { prisma } from "@/lib/db/prisma";
import { enqueueNotification } from "@/lib/notifications";

interface Params {
  s3Key: string;
  mimeType: string;
  documentId: string;
  documentType?: string | null;
  uploaderType: "PARENT" | "TEACHER";
  studentId: string;
  schoolId: string;
  uploadedBy: string;
}

function normalizeResponseText(resp: any) {
  if (!resp) return "";
  if (typeof resp.output_text === "string" && resp.output_text.trim()) return resp.output_text;
  if (typeof resp.output === "string" && resp.output.trim()) return resp.output;
  if (Array.isArray(resp.output)) {
    return resp.output
      .map((o: any) => {
        if (o?.content) {
          return o.content
            .map((c: any) => c.text || (Array.isArray(c.parts) ? c.parts.join("") : ""))
            .join("");
        }
        return o.text || "";
      })
      .join("\n");
  }
  if (typeof resp === "string") return resp;
  return "";
}

async function updateDocumentRecord(documentId: string, data: any) {
  try {
    await prisma.document.update({ where: { id: documentId }, data });
  } catch (dbErr) {
    console.error("Failed to update document record", dbErr, data);
  }
}

async function buildFailureResponse(documentId: string, schoolId: string, uploadedBy: string, message: string) {
  const updateData: any = { status: "PENDING", reviewNote: message };
  try {
    const model = (prisma as any)?._dmmf?.modelMap?.Document;
    const hasExtracted = !!model?.fields?.find((f: any) => f.name === "extracted");
    const hasExtractionConfidence = !!model?.fields?.find((f: any) => f.name === "extractionConfidence");
    if (hasExtracted) updateData.extracted = null;
    if (hasExtractionConfidence) updateData.extractionConfidence = 0;
  } catch {
    // ignore
  }

  await updateDocumentRecord(documentId, updateData);

  try {
    await enqueueNotification({
      schoolId,
      userId: uploadedBy,
      title: "Document processing failed",
      body: message,
      metadata: { documentId },
    });
  } catch (notifyErr) {
    console.error("Failed to enqueue notification after processing failure", notifyErr);
  }
}

export async function processDocument(params: Params) {
  const { s3Key, mimeType, documentId, documentType, uploaderType, studentId, schoolId, uploadedBy } = params;

  const downloadUrl = await getPresignedDownloadUrl(s3Key);
  const fileResp = await fetch(downloadUrl);
  if (!fileResp.ok) {
    const msg = `Failed to download file ${s3Key}: ${fileResp.status} ${fileResp.statusText}`;
    console.error(msg);
    await buildFailureResponse(documentId, schoolId, uploadedBy, msg);
    return { extracted: null, confidence: 0 };
  }

  const arrayBuffer = await fileResp.arrayBuffer();
  // Azure cannot fetch private/local MinIO URLs — send the file inline as base64.
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const effectiveMime = mimeType || "application/octet-stream";
  const dataUrl = `data:${effectiveMime};base64,${base64}`;

  const azureEndpoint = process.env.AZURE_END_POINT;
  const deploymentName = process.env.AZURE_DEPLOYMENT_NAME ?? "gpt-5";
  const azureKey = process.env.AZURE_OPEN_AI_API_KEY;
  if (!azureEndpoint || !azureKey) {
    const msg = "Azure endpoint or API key is not configured.";
    console.error(msg);
    await buildFailureResponse(documentId, schoolId, uploadedBy, msg);
    return { extracted: null, confidence: 0 };
  }

  const endpointBase = azureEndpoint.replace(/\/$/, "") + "/openai/v1";
  const url = `${endpointBase}/responses`;

  const prompt = `You are an extractor. Given a document image and the document type ${documentType ?? "unknown"}, extract the relevant fields and return a JSON object with keys: extracted (object), confidence (0-1). Use only valid JSON output with no additional text.`;

  const isImage = effectiveMime.startsWith("image/");
  const filePart = isImage
    ? { type: "input_image", image_url: dataUrl }
    : {
        type: "input_file",
        filename: s3Key.split("/").pop() ?? "document",
        file_data: dataUrl,
      };

  const requestBody = {
    model: deploymentName,
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }, filePart],
      },
    ],
    // GPT-5 reasoning tokens count against this budget; too-low values yield status=incomplete.
    max_output_tokens: 4096,
    reasoning: { effort: "low" },
    text: { format: { type: "json_object" } },
  };

  let responseJson: any;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": azureKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text();
      const msg = `Azure processing failed: ${response.status} ${response.statusText} - ${text}`;
      console.error(msg);
      await buildFailureResponse(documentId, schoolId, uploadedBy, msg);
      return { extracted: null, confidence: 0 };
    }

    responseJson = await response.json();
  } catch (err: any) {
    const msg = `Azure processing failed: ${err?.message ?? String(err)}`;
    console.error(msg, err);
    await buildFailureResponse(documentId, schoolId, uploadedBy, msg);
    return { extracted: null, confidence: 0 };
  }

  const outputText = normalizeResponseText(responseJson);
  if (!outputText) {
    const msg = `Azure returned no usable text response: ${JSON.stringify(responseJson).slice(0, 1000)}`;
    console.error(msg);
    await buildFailureResponse(documentId, schoolId, uploadedBy, msg);
    return { extracted: null, confidence: 0 };
  }

  let extracted: any = null;
  let confidence = NaN;
  const jsonMatch = outputText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      extracted = parsed.extracted ?? parsed.fields ?? parsed;
      confidence = typeof parsed.confidence === "number" ? parsed.confidence : parseFloat(parsed.confidence);
    } catch (err) {
      console.warn("Failed to parse JSON from model output", err);
    }
  }

  if (!extracted && Array.isArray(responseJson.output)) {
    for (const item of responseJson.output) {
      if (!item?.content) continue;
      for (const block of item.content) {
        if (block.type === "application/json" && block.data) {
          try {
            const parsed = typeof block.data === "string" ? JSON.parse(block.data) : block.data;
            extracted = parsed.extracted ?? parsed.fields ?? parsed;
            confidence = typeof parsed.confidence === "number" ? parsed.confidence : parseFloat(parsed.confidence) || 0;
            break;
          } catch (err) {
            console.warn("Failed to parse structured JSON output", err);
          }
        }
      }
      if (extracted) break;
    }
  }

  if (!extracted) {
    const msg = `Unable to extract JSON from Azure response. Raw output: ${outputText.slice(0, 1000)}`;
    console.error(msg);
    await updateDocumentRecord(documentId, {
      status: "PENDING",
      reviewNote: msg,
      extracted: null,
      extractionConfidence: 0,
    });
    return { extracted: null, confidence: 0 };
  }

  if (!Number.isFinite(confidence)) {
    confidence = 0.8;
  }

  try {
    const extractedKey = `${s3Key}.extracted.json`;
    const uploadUrl = await getPresignedUploadUrl(extractedKey, "application/json");
    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extracted, confidence }),
    });
  } catch (err) {
    console.warn("Failed to upload extracted json to S3", err);
  }

  const status = confidence >= 0.8 ? "APPROVED" : "PENDING";
  const reviewNote = confidence >= 0.8 ? null : `Low confidence (${confidence}). Please reupload a clearer document.`;

  await updateDocumentRecord(documentId, {
    status,
    reviewNote,
    extracted,
    extractionConfidence: confidence,
  });

  if (confidence < 0.8) {
    await enqueueNotification({
      schoolId,
      userId: uploadedBy,
      title: "Document extraction needs attention",
      body: "We couldn't reliably extract data from your uploaded document. Please reupload a clearer, single-focused document.",
    });
  }

  if (uploaderType === "PARENT") {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student?.classSectionId) {
      const assignments = await prisma.teacherAssignment.findMany({ where: { classSectionId: student.classSectionId } });
      for (const a of assignments) {
        await enqueueNotification({
          schoolId,
          userId: a.teacherId,
          title: "New student document uploaded",
          body: `A parent uploaded a document for ${student.name}. Confidence: ${Math.round(confidence * 100)}%`,
          metadata: { studentId, documentId },
        });
      }
    }
  } else {
    const admins = await prisma.userSchoolMembership.findMany({ where: { schoolId, role: "SCHOOL_ADMIN", isActive: true } });
    for (const a of admins) {
      await enqueueNotification({
        schoolId,
        userId: a.userId,
        title: "Teacher uploaded a document",
        body: `A teacher uploaded a document for student ${studentId}. Confidence: ${Math.round(confidence * 100)}%`,
        metadata: { studentId, documentId },
      });
    }
  }

  return { extracted, confidence };
}

export default processDocument;
