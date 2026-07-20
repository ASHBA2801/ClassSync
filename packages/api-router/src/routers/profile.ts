import { createTRPCRouter, protectedProcedure } from '../trpc';

export const profileRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.profile.id,
      email: ctx.profile.email,
      name: ctx.profile.name,
      role: ctx.profile.role,
      tenantId: ctx.profile.tenantId,
      isPlatformAdmin: ctx.profile.role === 'SUPER_ADMIN',
      createdAt: ctx.profile.createdAt,
    };
  }),
});
