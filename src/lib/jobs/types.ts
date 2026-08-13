/** Shared payload types for jobs dispatched from the web app to the worker service. */

export interface NotificationJobPayload {
  schoolId: string;
  userId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface FaceVerificationJobPayload {
  type: "teacher" | "staff";
  attendanceId: string;
  attemptId: string;
  userId: string;
  schoolId: string;
  attemptNumber: number;
  /** S3 object key for the captured frame. Omitted when no image was captured. */
  imageKey?: string;
}

export interface ScheduleGenerationJobPayload {
  schoolId: string;
}

export interface DocumentProcessingJobPayload {
  s3Key: string;
  mimeType: string;
  documentId: string;
  documentType?: string | null;
  uploaderType: "PARENT" | "TEACHER";
  studentId: string;
  schoolId: string;
  uploadedBy: string;
}
