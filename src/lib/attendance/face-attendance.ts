export const ATTENDANCE_RETRY_WINDOW_MS = 5 * 60 * 1000;
export const ATTENDANCE_MAX_ATTEMPTS = 3;

export type AttendanceAttemptRecord = {
  attemptNumber: number;
  success: boolean;
  createdAt: Date;
};

export function getNextAttemptNumber(
  lastAttempt: AttendanceAttemptRecord | undefined,
): number {
  if (!lastAttempt || lastAttempt.success) return 1;
  const elapsed = Date.now() - lastAttempt.createdAt.getTime();
  if (elapsed > ATTENDANCE_RETRY_WINDOW_MS) return 1;
  return lastAttempt.attemptNumber + 1;
}

export type FaceAttendanceSubmitResult = {
  success: boolean;
  blocked?: boolean;
  message?: string;
  status?: string;
  attemptNumber?: number;
  attendanceId?: string;
};
