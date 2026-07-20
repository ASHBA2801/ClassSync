import { createTRPCRouter, publicProcedure } from '../trpc';

export const healthRouter = createTRPCRouter({
  ping: publicProcedure.query(async ({ ctx }) => {
    const tenantCount = await ctx.prisma.tenant.count();
    return {
      ok: true as const,
      timestamp: new Date().toISOString(),
      tenantCount,
      authenticated: Boolean(ctx.profile),
      tenantId: ctx.profile?.tenantId ?? null,
    };
  }),
});
