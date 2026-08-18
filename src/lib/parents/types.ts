import type { Role } from "@prisma/client";
import type { BulkParentFailure } from "@/lib/parents/bulk-csv";

export interface BulkParentCreatedRow {
  rowNumber: number;
  email: string;
  parentName: string;
  studentName: string;
  temporaryPassword: string;
  credentialsIssued: boolean;
}

export interface BulkParentUpdatedRow {
  rowNumber: number;
  email: string;
  parentName: string;
  studentName: string;
  existingRoles: Role[];
}

export interface BulkParentLinkedRow {
  rowNumber: number;
  email: string;
  parentName: string;
  studentName: string;
}

export interface BulkParentImportResult {
  created: BulkParentCreatedRow[];
  roleAdded: BulkParentUpdatedRow[];
  linked: BulkParentLinkedRow[];
  failed: BulkParentFailure[];
  summary: {
    usersCreated: number;
    usersRoleAdded: number;
    studentsCreated: number;
    failed: number;
  };
}

export function buildCredentialsMessage(input: {
  schoolName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}): string {
  return [
    `School: ${input.schoolName}`,
    `Login URL: ${input.loginUrl}`,
    `Email: ${input.email}`,
    `Temporary password: ${input.temporaryPassword}`,
    "You must change this password after your first login.",
  ].join("\n");
}
