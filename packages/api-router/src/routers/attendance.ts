import {
  getByClassAndDateSchema,
  markAttendanceSchema,
} from '@classsync/shared-types';
import { startOfDayUTC } from '@classsync/utils';
import {
  createTRPCRouter,
  protectedProcedure,
  roleProcedure,
  requireTenantId,
  withTenantFilter,
} from '../trpc';

export const attendanceRouter = createTRPCRouter({
  markAttendance: roleProcedure('ADMIN', 'TEACHER')
    .input(markAttendanceSchema)
    .mutation(async ({ ctx, input }) => {
      const date = startOfDayUTC(input.date);
      const tenantId = requireTenantId(ctx);

      // SECURITY: tenantId from ctx — never trust client for tenant scope
      return ctx.prisma.attendance.upsert({
        where: {
          tenantId_studentId_date: {
            tenantId,
            studentId: input.studentId,
            date,
          },
        },
        update: {
          status: input.status,
          markedByProfileId: ctx.profile.id,
        },
        create: {
          tenantId,
          studentId: input.studentId,
          date,
          status: input.status,
          markedByProfileId: ctx.profile.id,
        },
      });
    }),

  getByClassAndDate: protectedProcedure
    .input(getByClassAndDateSchema)
    .query(async ({ ctx, input }) => {
      const date = startOfDayUTC(input.date);

      // SECURITY: tenant filter on students + attendance
      const students = await ctx.prisma.student.findMany({
        where: withTenantFilter(ctx, { classId: input.classId }),
        include: {
          attendances: {
            where: withTenantFilter(ctx, { date }),
          },
        },
        orderBy: { name: 'asc' },
      });

      return students.map((s) => ({
        studentId: s.id,
        name: s.name,
        admissionNumber: s.admissionNumber,
        attendance: s.attendances[0] ?? null,
      }));
    }),
});
