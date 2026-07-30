import { Worker, Job } from "bullmq";
import { getRedis, QUEUE_NAMES } from "../lib/queue/redis";
import { prisma } from "../lib/db/prisma";
import { getFaceRecognitionProvider } from "../lib/face/FaceRecognitionProvider";
import { sendNotification, NotificationPayload } from "../lib/notifications";
import { generateScheduleForSchool } from "../lib/scheduler/generate";
import { enqueueNotification } from "../lib/notifications";

interface FaceVerificationJob {
  attendanceId: string;
  attemptId: string;
  teacherId: string;
  schoolId: string;
  attemptNumber: number;
  imageBase64?: string;
}

async function processFaceVerification(job: Job<FaceVerificationJob>) {
  const { attendanceId, attemptId, teacherId, attemptNumber, imageBase64 } = job.data;

  const provider = getFaceRecognitionProvider();
  let matched = false;
  let confidence = 0;

  if (imageBase64) {
    const buffer = Buffer.from(imageBase64, "base64");
    const result = await provider.verifyFace(teacherId, buffer);
    matched = result.matched;
    confidence = result.confidence;
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

  if (attemptNumber < 3) {
    await enqueueNotification({
      schoolId: job.data.schoolId,
      userId: teacherId,
      title: "Attendance Failed",
      body: "Attendance failed, please retry within 5 minutes.",
      metadata: { attendanceId, attemptNumber },
    });
  }

  return { matched: false, attemptNumber };
}

async function processNotification(job: Job<NotificationPayload>) {
  await sendNotification(job.data);
}

async function processScheduler(job: Job<{ schoolId: string }>) {
  return generateScheduleForSchool(job.data.schoolId);
}

async function processScheduleReminders() {
  const schools = await prisma.school.findMany({ where: { status: "ACTIVE" } });
  const now = new Date();
  const dayOfWeek = now.getDay();

  for (const school of schools) {
    const version = await prisma.scheduleVersion.findFirst({
      where: { schoolId: school.id, isActive: true },
    });
    if (!version) continue;

    const slots = await prisma.scheduleSlot.findMany({
      where: { versionId: version.id, dayOfWeek },
      include: { subject: true, classSection: true },
    });

    const timings = await prisma.periodTiming.findMany({
      where: { schoolId: school.id },
    });

    for (const slot of slots) {
      const timing = timings.find((t) => t.periodNo === slot.periodNo);
      if (!timing) continue;

      const [hours, minutes] = timing.startTime.split(":").map(Number);
      const periodStart = new Date(now);
      periodStart.setHours(hours, minutes, 0, 0);

      const diffMs = periodStart.getTime() - now.getTime();
      if (diffMs > 0 && diffMs <= 5 * 60 * 1000) {
        await enqueueNotification({
          schoolId: school.id,
          userId: slot.teacherId,
          title: "Upcoming Class",
          body: `${slot.subject.name} with ${slot.classSection.name} starts at ${timing.startTime}`,
          metadata: { slotId: slot.id },
        });
      }
    }
  }
}

export function startWorkers() {
  const connection = getRedis();

  new Worker(QUEUE_NAMES.ATTENDANCE_FACE, processFaceVerification, { connection });
  new Worker(QUEUE_NAMES.NOTIFICATIONS, processNotification, { connection });
  new Worker(QUEUE_NAMES.SCHEDULER, processScheduler, { connection });
  new Worker(QUEUE_NAMES.SCHEDULE_REMINDERS, processScheduleReminders, { connection });

  console.log("BullMQ workers started");
}

if (require.main === module) {
  startWorkers();
}
