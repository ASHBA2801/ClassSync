import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  createTenantSchema,
  tenantIdSchema,
  updateTenantSchema,
} from '@classsync/shared-types';
import { createTRPCRouter, platformProcedure } from '../trpc';

/**
 * Platform-wide tenant (school) management.
 * SUPER_ADMIN only — never uses withTenantFilter (no school scope).
 */
export const tenantRouter = createTRPCRouter({
  list: platformProcedure.query(async ({ ctx }) => {
    return ctx.prisma.tenant.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            profiles: true,
            students: true,
            classes: true,
          },
        },
      },
    });
  }),

  getById: platformProcedure.input(tenantIdSchema).query(async ({ ctx, input }) => {
    const tenant = await ctx.prisma.tenant.findUnique({
      where: { id: input.id },
      include: {
        _count: {
          select: {
            profiles: true,
            students: true,
            classes: true,
          },
        },
      },
    });
    if (!tenant) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School (tenant) not found' });
    }
    return tenant;
  }),

  create: platformProcedure.input(createTenantSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.tenant.findUnique({
      where: { subdomain: input.subdomain },
    });
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Subdomain "${input.subdomain}" is already taken`,
      });
    }

    return ctx.prisma.tenant.create({
      data: {
        name: input.name,
        subdomain: input.subdomain,
        subscriptionTier: input.subscriptionTier ?? 'FREE',
      },
    });
  }),

  update: platformProcedure
    .input(
      updateTenantSchema.extend({
        id: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      try {
        return await ctx.prisma.tenant.update({
          where: { id },
          data,
        });
      } catch {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School (tenant) not found' });
      }
    }),
});
