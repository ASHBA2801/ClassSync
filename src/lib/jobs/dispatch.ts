import { after } from "next/server";
import type {
  DocumentProcessingJobPayload,
  FaceVerificationJobPayload,
  NotificationJobPayload,
  ScheduleGenerationJobPayload,
} from "./types";

function workerBaseUrl(): string {
  const url = process.env.WORKER_URL;
  if (!url) {
    throw new Error("WORKER_URL is not configured — the background worker cannot be reached.");
  }
  return url.replace(/\/$/, "");
}

async function postJob(path: string, payload: unknown, timeoutMs = 15_000): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${workerBaseUrl()}${path}`, {
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

/**
 * Dispatches a background job to the worker service over HTTP.
 *
 * Inside a Next.js request (Server Action / Route Handler) the network call
 * is deferred with `after()` so the response isn't held up and the call
 * survives serverless function teardown. Outside a request scope (scripts,
 * tests) `after()` throws synchronously, so we fall back to firing the
 * request immediately.
 */
function dispatchJob(path: string, payload: unknown): void {
  const run = () =>
    postJob(path, payload).catch((err) => {
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
