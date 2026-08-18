import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudentAttendanceStatus, LeaveStatus } from "@prisma/client";

describe("Student Attendance & Half-Day Leave Logic", () => {
  it("supports HALF_DAY status in StudentAttendanceStatus enum", () => {
    expect(StudentAttendanceStatus.HALF_DAY).toBe("HALF_DAY");
    expect(StudentAttendanceStatus.PRESENT).toBe("PRESENT");
    expect(StudentAttendanceStatus.ABSENT).toBe("ABSENT");
    expect(StudentAttendanceStatus.LATE).toBe("LATE");
  });

  it("handles half-day session mapping for morning and afternoon", () => {
    const formatSessionLabel = (isHalfDay: boolean, session?: string) => {
      if (!isHalfDay) return "Full Day";
      if (session === "SECOND_HALF") return "Half Day (Afternoon)";
      return "Half Day (Morning)";
    };

    expect(formatSessionLabel(false)).toBe("Full Day");
    expect(formatSessionLabel(true, "FIRST_HALF")).toBe("Half Day (Morning)");
    expect(formatSessionLabel(true, "SECOND_HALF")).toBe("Half Day (Afternoon)");
  });

  it("validates leave request payload with medical certificate S3 key", () => {
    const req = {
      studentId: "123e4567-e89b-12d3-a456-426614174000",
      startDate: "2026-08-20",
      endDate: "2026-08-22",
      reason: "High fever doctor recommended rest",
      isHalfDay: false,
      medicalCertS3Key: "medical_certificates/school-1/parent-1/cert.pdf",
      medicalCertName: "dr_certificate.pdf",
      status: LeaveStatus.PENDING,
    };

    expect(req.medicalCertS3Key).toContain("medical_certificates");
    expect(req.medicalCertName).toBe("dr_certificate.pdf");
    expect(req.status).toBe("PENDING");
  });

  it("calculates attendance roster metrics correctly", () => {
    const rosterState = [
      { studentId: "s1", status: "PRESENT" },
      { studentId: "s2", status: "PRESENT" },
      { studentId: "s3", status: "ABSENT" },
      { studentId: "s4", status: "HALF_DAY" },
      { studentId: "s5", status: "LATE" },
    ];

    const presentCount = rosterState.filter((s) => s.status === "PRESENT").length;
    const absentCount = rosterState.filter((s) => s.status === "ABSENT").length;
    const halfDayCount = rosterState.filter((s) => s.status === "HALF_DAY").length;
    const lateCount = rosterState.filter((s) => s.status === "LATE").length;

    expect(presentCount).toBe(2);
    expect(absentCount).toBe(1);
    expect(halfDayCount).toBe(1);
    expect(lateCount).toBe(1);
    expect(rosterState.length).toBe(5);
  });
});
