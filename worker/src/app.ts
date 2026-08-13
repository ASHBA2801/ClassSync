import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { prisma } from "@/lib/db/prisma";
import { sendNotification } from "@/lib/notifications";
import { generateScheduleForSchool } from "@/lib/scheduler/generate";
import { processPayrollJobs } from "@/lib/payroll/process-jobs";
import { processDocument } from "@/lib/ai/documentProcessor";
import { runFaceVerification } from "@/lib/jobs/face-verification";
import { runScheduleReminders } from "@/lib/jobs/schedule-reminders";
import type {
  DocumentProcessingJobPayload,
  FaceVerificationJobPayload,
  NotificationJobPayload,
  ScheduleGenerationJobPayload,
} from "@/lib/jobs/types";

// Marks this process as the worker so shared lib code (e.g. enqueueNotification)
// sends directly instead of dispatching another HTTP hop back to itself.
process.env.WORKER_ROLE = process.env.WORKER_ROLE ?? "worker";

const app = new Hono();

app.get("/health", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ status: "ok", time: new Date().toISOString() });
  } catch (err) {
    return c.json(
      { status: "error", error: err instanceof Error ? err.message : String(err) },
      503,
    );
  }
});

const secret = process.env.WORKER_SECRET;
if (secret) {
  app.use("/jobs/*", bearerAuth({ token: secret }));
} else {
  console.warn(
    "[worker] WORKER_SECRET is not set — /jobs/* endpoints are unauthenticated. Set it before deploying.",
  );
}

app.post("/jobs/face-verify", async (c) => {
  const payload = await c.req.json<FaceVerificationJobPayload>();
  const result = await runFaceVerification(payload);
  return c.json(result);
});

app.post("/jobs/notify", async (c) => {
  const payload = await c.req.json<NotificationJobPayload>();
  await sendNotification(payload);
  return c.json({ ok: true });
});

app.post("/jobs/scheduler", async (c) => {
  const payload = await c.req.json<ScheduleGenerationJobPayload>();
  const result = await generateScheduleForSchool(payload.schoolId);
  return c.json(result);
});

app.post("/jobs/document", async (c) => {
  const payload = await c.req.json<DocumentProcessingJobPayload>();
  const result = await processDocument(payload);
  return c.json(result);
});

// GET is also accepted so Vercel Cron (which issues GET requests) can trigger these directly.
app.on(["GET", "POST"], "/jobs/reminders", async (c) => {
  await runScheduleReminders();
  return c.json({ ok: true });
});

app.on(["GET", "POST"], "/jobs/payroll", async (c) => {
  await processPayrollJobs(new Date());
  return c.json({ ok: true });
});

export default app;
