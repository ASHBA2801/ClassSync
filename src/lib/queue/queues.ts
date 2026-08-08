import { Queue } from "bullmq";
import { getRedis, QUEUE_NAMES } from "./redis";

let attendanceQueue: Queue | null = null;
let notificationsQueue: Queue | null = null;
let schedulerQueue: Queue | null = null;
let remindersQueue: Queue | null = null;
let payrollQueue: Queue | null = null;

function createQueue(name: string): Queue {
  return new Queue(name, { connection: getRedis() });
}

export function getAttendanceQueue() {
  if (!attendanceQueue) attendanceQueue = createQueue(QUEUE_NAMES.ATTENDANCE_FACE);
  return attendanceQueue;
}

export function getNotificationsQueue() {
  if (!notificationsQueue) notificationsQueue = createQueue(QUEUE_NAMES.NOTIFICATIONS);
  return notificationsQueue;
}

export function getSchedulerQueue() {
  if (!schedulerQueue) schedulerQueue = createQueue(QUEUE_NAMES.SCHEDULER);
  return schedulerQueue;
}

export function getRemindersQueue() {
  if (!remindersQueue) remindersQueue = createQueue(QUEUE_NAMES.SCHEDULE_REMINDERS);
  return remindersQueue;
}

export function getPayrollQueue() {
  if (!payrollQueue) payrollQueue = createQueue(QUEUE_NAMES.PAYROLL_JOBS);
  return payrollQueue;
}

export async function schedulePayrollJobs() {
  const queue = getPayrollQueue();
  await queue.add(
    "daily",
    {},
    {
      repeat: { pattern: "0 6 * * *" },
      jobId: "payroll-daily",
    },
  );
}
