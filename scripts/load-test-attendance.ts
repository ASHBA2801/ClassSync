/**
 * Load test script for attendance face-verification queue.
 * Simulates peak-hour (8-9 AM) concurrent teacher submissions.
 *
 * Usage: tsx scripts/load-test-attendance.ts
 * Requires: REDIS_URL, running worker process
 */

import { Queue } from "bullmq";
import Redis from "ioredis";
import { QUEUE_NAMES } from "../src/lib/queue/redis";

const TEACHER_COUNT = 50;
const CONCURRENT_BATCH = 10;

async function main() {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
  const queue = new Queue(QUEUE_NAMES.ATTENDANCE_FACE, { connection: redis });

  console.log(`Enqueueing ${TEACHER_COUNT} attendance jobs...`);
  const start = Date.now();

  for (let batch = 0; batch < TEACHER_COUNT; batch += CONCURRENT_BATCH) {
    const jobs = [];
    for (let i = batch; i < Math.min(batch + CONCURRENT_BATCH, TEACHER_COUNT); i++) {
      jobs.push(
        queue.add("verify", {
          attendanceId: `load-test-${i}`,
          attemptId: `attempt-${i}`,
          teacherId: `teacher-${i}`,
          schoolId: "load-test-school",
          attemptNumber: 1,
        }),
      );
    }
    await Promise.all(jobs);
  }

  const elapsed = Date.now() - start;
  const waiting = await queue.getWaitingCount();
  const active = await queue.getActiveCount();
  const completed = await queue.getCompletedCount();
  const failed = await queue.getFailedCount();

  console.log(`Enqueued in ${elapsed}ms`);
  console.log(`Queue state: waiting=${waiting}, active=${active}, completed=${completed}, failed=${failed}`);

  await queue.close();
  await redis.quit();
}

main().catch(console.error);
