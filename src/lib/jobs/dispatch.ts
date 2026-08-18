import { after } from "next/server";
import type {
  DocumentProcessingJobPayload,
  FaceVerificationJobPayload,
  NotificationJobPayload,
  ScheduleGenerationJobPayload,
} from "./types";

function workerBaseUrl(): string | null {
  const url = process.env.WORKER_URL;
  if (!url) return null;
  return url.replace(/\/$/, "");
}

function allowInlineJobs(): boolean {
  return process.env.NODE_ENV !== "production";
}

function isWorkerUnreachable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const cause = (err as Error & { cause?: { code?: string } }).cause;
  const haystack = `${err.name} ${err.message} ${cause?.code ?? ""}`;
  // AbortError means the worker connected but the job ran long — not unreachable.
  return (
    haystack.includes("ECONNREFUSED") ||
    haystack.includes("WORKER_URL is not configured") ||
    cause?.code === "ECONNREFUSED"
  );
}

async function runJobInProcess(path: string, payload: unknown): Promise<void> {
  switch (path) {
    case "/jobs/document": {
      const { processDocument } = await import("@/lib/ai/documentProcessor");
      await processDocument(payload as DocumentProcessingJobPayload);
      return;
    }
    case "/jobs/face-verify": {
      const { runFaceVerification } = await import("@/lib/jobs/face-verification");
      await runFaceVerification(payload as FaceVerificationJobPayload);
      return;
    }
    case "/jobs/scheduler": {
      const { generateScheduleForSchool } = await import("@/lib/scheduler/generate");
      await generateScheduleForSchool((payload as ScheduleGenerationJobPayload).schoolId);
      return;
    }
    case "/jobs/notify": {
      const { sendNotification } = await import("@/lib/notifications");
      await sendNotification(payload as NotificationJobPayload);
      return;
    }
    default:
      throw new Error(`No in-process handler for ${path}`);
  }
}

async function postJob(path: string, payload: unknown, timeoutMs = 15_000): Promise<void> {
  const base = workerBaseUrl();
  if (!base) {
    throw new Error("WORKER_URL is not configured — the background worker cannot be reached.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.WORKER_SECRET ? { Authorization: `Bearer ${process.env.WORKER_SECRET}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Worker responded ${res.status} for ${path}: ${text.slice(0, 300)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function executeJob(path: string, payload: unknown): Promise<void> {
  if (!workerBaseUrl()) {
    if (!allowInlineJobs()) {
      throw new Error("WORKER_URL is not configured — the background worker cannot be reached.");
    }
    console.warn(`[jobs] WORKER_URL not set; running ${path} in-process`);
    await runJobInProcess(path, payload);
    return;
  }

  try {
    await postJob(path, payload);
  } catch (err) {
    if (allowInlineJobs() && isWorkerUnreachable(err)) {
      console.warn(`[jobs] worker unreachable for ${path}; running in-process`);
      await runJobInProcess(path, payload);
      return;
    }
    throw err;
  }
}

/**
 * Dispatches a background job to the worker service over HTTP.
 *
 * Inside a Next.js request (Server Action / Route Handler) the network call
 * is deferred with `after()` so the response isn't held up and the call
 * survives serverless function teardown. Outside a request scope (scripts,
 * tests) `after()` throws synchronously, so we fall back to firing the
 * request immediately.
 *
 * In local development, jobs run in-process if WORKER_URL is missing or the
 * worker isn't reachable, so document extraction still completes without
 * `npm run worker`.
 */
function dispatchJob(path: string, payload: unknown): void {
  const run = () =>
    executeJob(path, payload).catch((err) => {
      console.error(`[jobs] dispatch to ${path} failed`, err);
    });

  try {
    after(run);
  } catch {
    void run();
  }
}

export function dispatchFaceVerification(payload: FaceVerificationJobPayload): void {
  dispatchJob("/jobs/face-verify", payload);
}

export function dispatchScheduleGeneration(payload: ScheduleGenerationJobPayload): void {
  dispatchJob("/jobs/scheduler", payload);
}

export function dispatchDocumentProcessing(payload: DocumentProcessingJobPayload): void {
  dispatchJob("/jobs/document", payload);
}

export function dispatchNotification(payload: NotificationJobPayload): void {
  dispatchJob("/jobs/notify", payload);
}
