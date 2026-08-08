import { Worker, Job } from "bullmq";
import { getRedis, QUEUE_NAMES } from "../lib/queue/redis";
import { prisma } from "../lib/db/prisma";
import { getFaceRecognitionProvider } from "../lib/face/FaceRecognitionProvider";
import { sendNotification, NotificationPayload } from "../lib/notifications";
import { generateScheduleForSchool } from "../lib/scheduler/generate";
import { enqueueNotification } from "../lib/notifications";
import { resolveEffectiveSlots, dateToDayOfWeek, startOfDay } from "../lib/scheduler/smart-scheduler";
import { processPayrollJobs } from "../lib/payroll/process-jobs";
import { schedulePayrollJobs } from "../lib/queue/queues";

interface FaceVerificationJob {
  type?: "teacher" | "staff";
  attendanceId: string;
  attemptId: string;
  userId: string;
  teacherId?: string;
  schoolId: string;
  attemptNumber: number;
  imageBase64?: string;
}

async function processFaceVerification(job: Job<FaceVerificationJob>) {
  const {
    attendanceId,
    attemptId,
    attemptNumber,
    imageBase64,
    schoolId,
  } = job.data;
  const userId = job.data.userId ?? job.data.teacherId;
  const type = job.data.type ?? "teacher";

  const provider = getFaceRecognitionProvider();
  let matched = false;
  let confidence = 0;

  if (imageBase64 && userId) {
    const buffer = Buffer.from(imageBase64, "base64");
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
      await enqueueNotification({
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
    await enqueueNotification({
      schoolId,
      userId,
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
  console.log(`[scheduler] Worker processing job ${job.id} for school ${job.data.schoolId}`);
  const result = await generateScheduleForSchool(job.data.schoolId);

  if (result.success) {
    console.log(
      `[scheduler] Worker completed job ${job.id}: v${result.versionId} (${result.slotCount} slots)`,
    );
  } else {
    console.error(`[scheduler] Worker job ${job.id} failed:`, result.errors);
    const admins = await prisma.userSchoolMembership.findMany({
      where: { schoolId: job.data.schoolId, role: "SCHOOL_ADMIN", isActive: true },
    });

    for (const admin of admins) {
      await enqueueNotification({
        schoolId: job.data.schoolId,
        userId: admin.userId,
        title: "Schedule Generation Failed",
        body: result.errors.slice(0, 2).join("; ") || "Could not generate timetable",
        metadata: { errors: result.errors },
      });
    }
  }

  return result;
}

async function processScheduleReminders() {
  const schools = await prisma.school.findMany({ where: { status: "ACTIVE" } });
  const now = new Date();
  const today = startOfDay(now);
  const dayOfWeek = dateToDayOfWeek(now);

  for (const school of schools) {
    const version = await prisma.scheduleVersion.findFirst({
      where: { schoolId: school.id, isActive: true },
    });
    if (!version) continue;

    const effective = await resolveEffectiveSlots(school.id, today);
    const daySlots = effective.filter((s) => s.dayOfWeek === dayOfWeek);

    const timings = await prisma.periodTiming.findMany({
      where: { schoolId: school.id },
    });

    for (const slot of daySlots) {
      const timing = timings.find((t) => t.periodNo === slot.periodNo);
      if (!timing) continue;

      const [hours, minutes] = timing.startTime.split(":").map(Number);
      const periodStart = new Date(now);
      periodStart.setHours(hours, minutes, 0, 0);

      const diffMs = periodStart.getTime() - now.getTime();
      if (diffMs > 0 && diffMs <= 5 * 60 * 1000) {
        const sectionName = slot.classSection?.name ?? "class";
        const subjectName = slot.subject?.name ?? "subject";
        await enqueueNotification({
          schoolId: school.id,
          userId: slot.teacherId,
          title: "Upcoming Class",
          body: `${subjectName} with ${sectionName} starts at ${timing.startTime}`,
          metadata: { slotId: slot.id, isAltered: slot.isAltered },
        });
      }
    }
  }
}

async function processPayrollJob() {
  await processPayrollJobs(new Date());
}

export function startWorkers() {
  const connection = getRedis();

  new Worker(QUEUE_NAMES.ATTENDANCE_FACE, processFaceVerification, { connection });
  new Worker(QUEUE_NAMES.NOTIFICATIONS, processNotification, { connection });
  new Worker(QUEUE_NAMES.SCHEDULER, processScheduler, { connection });
  new Worker(QUEUE_NAMES.SCHEDULE_REMINDERS, processScheduleReminders, { connection });
  new Worker(QUEUE_NAMES.PAYROLL_JOBS, processPayrollJob, { connection });

  schedulePayrollJobs().catch((err) => {
    console.error("[payroll] Failed to schedule daily payroll jobs:", err);
  });

  console.log("BullMQ workers started");
}

if (require.main === module) {
  startWorkers();
}
