"use client";

import {
  submitTeacherAttendanceAction,
  getTeacherAttendanceStatusAction,
  enrollFaceAction,
} from "@/actions/attendance";
import { FaceAttendanceFlow } from "@/components/attendance/face-attendance-flow";

export function AttendanceFlow({ faceEnrolled }: { faceEnrolled: boolean }) {
  return (
    <FaceAttendanceFlow
      initiallyEnrolled={faceEnrolled}
      actions={{
        submit: submitTeacherAttendanceAction,
        getStatus: async (attendanceId) => {
          const record = await getTeacherAttendanceStatusAction(attendanceId);
          return record ? { status: record.status } : null;
        },
        enrollFace: async (imageBase64) => {
          await enrollFaceAction(imageBase64);
        },
      }}
    />
  );
}
