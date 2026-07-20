import { TRPCError } from '@trpc/server';
import { createStudentSchema, studentIdSchema } from '@classsync/shared-types';
import {
  createTRPCRouter,
  protectedProcedure,
  roleProcedure,
  requireTenantId,
  withTenantFilter,
} from '../trpc';

export const studentRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    // SECURITY: always filter by tenantId
    return ctx.prisma.student.findMany({
      where: withTenantFilter(ctx),
      orderBy: { name: 'asc' },
    });
  }),

  getById: protectedProcedure.input(studentIdSchema).query(async ({ ctx, input }) => {
    const student = await ctx.prisma.student.findFirst({
      where: withTenantFilter(ctx, { id: input.id }),
    });
    if (!student) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Student not found' });
    }
    return student;
  }),

  create: roleProcedure('ADMIN', 'TEACHER')
    .input(createStudentSchema)
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      // SECURITY: tenantId forced from authenticated profile — never from client input
      return ctx.prisma.student.create({
        data: {
          tenantId,
          name: input.name,
          admissionNumber: input.admissionNumber,
          classId: input.classId,
          dateOfBirth: input.dateOfBirth,
        },
      });
    }),
});
