import { z } from 'zod';

/** School-scoped roles (always have a tenantId). */
export const schoolRoleSchema = z.enum(['ADMIN', 'TEACHER', 'PARENT']);

/** All roles including platform SUPER_ADMIN (tenantId is null). */
export const roleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT']);

export const attendanceStatusSchema = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);
export const submissionStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'GRADED', 'LATE']);

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

/** Tenant (school) self-registration — never creates SUPER_ADMIN. */
export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
  role: schoolRoleSchema,
  tenantSubdomain: z.string().min(2).max(64),
});

export const createTenantSchema = z.object({
  name: z.string().min(2).max(120),
  subdomain: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Subdomain must be lowercase alphanumeric with hyphens'),
  subscriptionTier: z.string().min(1).max(64).default('FREE'),
});

export const updateTenantSchema = createTenantSchema.partial();

export const tenantIdSchema = z.object({
  id: z.string().min(1),
});

export const createStudentSchema = z.object({
  name: z.string().min(1).max(120),
  admissionNumber: z.string().min(1).max(64),
  classId: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const markAttendanceSchema = z.object({
  studentId: z.string().min(1),
  date: z.coerce.date(),
  status: attendanceStatusSchema,
});

export const submitAssignmentSchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  fileUrl: z.url().optional(),
  status: submissionStatusSchema.default('SUBMITTED'),
});

export const getByClassAndDateSchema = z.object({
  classId: z.string().min(1),
  date: z.coerce.date(),
});

export const studentIdSchema = z.object({
  id: z.string().min(1),
});

/** Discriminated union for API-shaped auth responses (scaffold). */
export const authResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    userId: z.string(),
  }),
  z.object({
    status: z.literal('error'),
    message: z.string(),
  }),
]);

export type Role = z.infer<typeof roleSchema>;
export type SchoolRole = z.infer<typeof schoolRoleSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;
export type AuthResult = z.infer<typeof authResultSchema>;
