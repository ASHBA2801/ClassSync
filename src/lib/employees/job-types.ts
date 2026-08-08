import type { EmployeeJobType } from "@prisma/client";

export type JobCategory =
  | "teaching"
  | "administrative"
  | "transport"
  | "security"
  | "maintenance"
  | "support"
  | "leadership";

export const JOB_TYPE_LABELS: Record<EmployeeJobType, string> = {
  TEACHER: "Teacher",
  CLASS_TEACHER: "Class Teacher",
  PET_MASTER: "PET Master",
  LIBRARIAN: "Librarian",
  LAB_ASSISTANT: "Lab Assistant",
  SPORTS_COACH: "Sports Coach",
  ACCOUNTANT: "Accountant",
  OFFICE_CLERK: "Office Clerk",
  RECEPTIONIST: "Receptionist",
  VAN_DRIVER: "Van Driver",
  BUS_DRIVER: "Bus Driver",
  TRANSPORT_COORDINATOR: "Transport Coordinator",
  SECURITY_GUARD: "Security Guard",
  SECURITY_SUPERVISOR: "Security Supervisor",
  CLEANER: "Cleaner",
  JANITOR: "Janitor",
  GARDENER: "Gardener",
  MAINTENANCE_STAFF: "Maintenance Staff",
  CANTEEN_STAFF: "Canteen Staff",
  NURSE: "Nurse",
  COUNSELLOR: "Counsellor",
  PRINCIPAL: "Principal",
  VICE_PRINCIPAL: "Vice Principal",
};

export const JOB_TYPE_CATEGORIES: Record<EmployeeJobType, JobCategory> = {
  TEACHER: "teaching",
  CLASS_TEACHER: "teaching",
  PET_MASTER: "teaching",
  LIBRARIAN: "teaching",
  LAB_ASSISTANT: "teaching",
  SPORTS_COACH: "teaching",
  ACCOUNTANT: "administrative",
  OFFICE_CLERK: "administrative",
  RECEPTIONIST: "administrative",
  VAN_DRIVER: "transport",
  BUS_DRIVER: "transport",
  TRANSPORT_COORDINATOR: "transport",
  SECURITY_GUARD: "security",
  SECURITY_SUPERVISOR: "security",
  CLEANER: "maintenance",
  JANITOR: "maintenance",
  GARDENER: "maintenance",
  MAINTENANCE_STAFF: "maintenance",
  CANTEEN_STAFF: "support",
  NURSE: "support",
  COUNSELLOR: "support",
  PRINCIPAL: "leadership",
  VICE_PRINCIPAL: "leadership",
};

export const TEACHING_JOB_TYPES: EmployeeJobType[] = [
  "TEACHER",
  "CLASS_TEACHER",
  "PET_MASTER",
  "LIBRARIAN",
  "LAB_ASSISTANT",
  "SPORTS_COACH",
];

export const ALL_JOB_TYPES = Object.keys(JOB_TYPE_LABELS) as EmployeeJobType[];

export function getPlatformRoleForJobType(jobType: EmployeeJobType): "TEACHER" | "STAFF" {
  if (TEACHING_JOB_TYPES.includes(jobType)) return "TEACHER";
  return "STAFF";
}

export function getJobTypesByCategory(category: JobCategory): EmployeeJobType[] {
  return ALL_JOB_TYPES.filter((jt) => JOB_TYPE_CATEGORIES[jt] === category);
}

export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  teaching: "Teaching",
  administrative: "Administrative",
  transport: "Transport",
  security: "Security",
  maintenance: "Maintenance",
  support: "Support",
  leadership: "Leadership",
};
