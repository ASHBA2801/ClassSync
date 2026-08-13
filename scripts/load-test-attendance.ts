/**
 * Load test script for the attendance face-verification worker endpoint.
 * Simulates peak-hour (8-9 AM) concurrent teacher submissions.
 *
 * Usage: tsx scripts/load-test-attendance.ts
 * Requires: WORKER_URL (and WORKER_SECRET, if configured) pointing at a running worker.
 */

const TEACHER_COUNT = 50;
const CONCURRENT_BATCH = 10;

async function postJob(path: string, payload: unknown) {
  const baseUrl = (process.env.WORKER_URL ?? "http://localhost:3001").replace(/\/$/, "");
  const secret = process.env.WORKER_SECRET;

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  console.log(`Dispatching ${TEACHER_COUNT} attendance verify jobs...`);
  const start = Date.now();
  let ok = 0;
  let failed = 0;

  for (let batch = 0; batch < TEACHER_COUNT; batch += CONCURRENT_BATCH) {
    const jobs = [];
    for (let i = batch; i < Math.min(batch + CONCURRENT_BATCH, TEACHER_COUNT); i++) {
      jobs.push(
        postJob("/jobs/face-verify", {
          type: "teacher",
          attendanceId: `load-test-${i}`,
          attemptId: `attempt-${i}`,
          userId: `teacher-${i}`,
          schoolId: "load-test-school",
          attemptNumber: 1,
        })
          .then(() => {
            ok++;
          })
          .catch((err) => {
            failed++;
            console.error(`Job ${i} failed:`, err instanceof Error ? err.message : err);
          }),
      );
    }
    await Promise.all(jobs);
  }

  const elapsed = Date.now() - start;
  console.log(`Completed in ${elapsed}ms: ok=${ok}, failed=${failed}`);
}

main().catch(console.error);
