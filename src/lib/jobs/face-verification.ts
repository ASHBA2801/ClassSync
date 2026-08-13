import { prisma } from "@/lib/db/prisma";
import { getFaceRecognitionProvider } from "@/lib/face/FaceRecognitionProvider";
import { getPresignedDownloadUrl } from "@/lib/storage/s3";
import { sendNotification } from "@/lib/notifications";
import type { FaceVerificationJobPayload } from "./types";

async function downloadImage(imageKey: string): Promise<Buffer> {
  const url = await getPresignedDownloadUrl(imageKey);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download face image ${imageKey}: ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Runs inside the worker service. Verifies a captured frame against the enrolled face and updates attendance. */
export async function runFaceVerification(payload: FaceVerificationJobPayload) {
  const { attendanceId, attemptId, attemptNumber, imageKey, schoolId, userId, type } = payload;

  const provider = getFaceRecognitionProvider();
  let matched = false;
  let confidence = 0;

  if (imageKey && userId) {
    const buffer = await downloadImage(imageKey);
    const result = await provider.verifyFace(userId, buffer);
    matched = result.matched;
    confidence = result.confidence;
  }

  if (type === "staff") {
    await prisma.staffAttendanceAttempt.update({
      where: { id: attemptId },
      data: {
        success: matched,
        errorMessage: matched ? null : `Face match failed (confidence: ${confidence})`,
      },
    });

    if (matched) {
      const now = new Date();
      await prisma.staffAttendance.update({
        where: { id: attendanceId },
        data: {
          status: "PRESENT",
          markedAt: now,
          checkInAt: now,
          method: "face_recognition",
        },
      });
      return { matched: true };
    }

    await prisma.staffAttendance.update({
      where: { id: attendanceId },
      data: { status: "FAILED" },
    });

    if (userId && attemptNumber < 3) {
      await sendNotification({
        schoolId,
        userId,
        title: "Attendance Failed",
        body: "Attendance failed, please retry within 5 minutes.",
        metadata: { attendanceId, attemptNumber },
      });
    }

    return { matched: false, attemptNumber };
  }

  await prisma.attendanceAttempt.update({
    where: { id: attemptId },
    data: {
      success: matched,
      errorMessage: matched ? null : `Face match failed (confidence: ${confidence})`,
    },
  });

  if (matched) {
    await prisma.teacherAttendance.update({
      where: { id: attendanceId },
      data: {
        status: "PRESENT",
        markedAt: new Date(),
        method: "face_recognition",
      },
    });
    return { matched: true };
  }

  await prisma.teacherAttendance.update({
    where: { id: attendanceId },
    data: { status: "FAILED" },
  });

  if (userId && attemptNumber < 3) {
    await sendNotification({
      schoolId,
      userId,
      title: "Attendance Failed",
      body: "Attendance failed, please retry within 5 minutes.",
      metadata: { attendanceId, attemptNumber },
    });
  }

  return { matched: false, attemptNumber };
}
