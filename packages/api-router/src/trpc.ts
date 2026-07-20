import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Role } from '@classsync/shared-types';
import type { AuthenticatedContext, TrpcContext } from './context';

/**
 * ============================================================================
 * MULTI-TENANCY SECURITY INVARIANT (#1)
 * ============================================================================
 * EVERY Prisma query against tenant-scoped school data MUST include:
 *   where: { tenantId: <school tenant id>, ... }
 *
 * - School roles (ADMIN / TEACHER / PARENT): use `withTenantFilter(ctx)` —
 *   injects ctx.profile.tenantId.
 * - SUPER_ADMIN: has no tenantId. Never call `withTenantFilter` for them.
 *   Use platform routers, or `withExplicitTenant(tenantId)` when acting on
 *   a specific school chosen by the platform operator.
 *
 * A query missing a tenant filter is a CRITICAL SECURITY BUG — never ship it.
 * ============================================================================
 */
export function withTenantFilter<T extends Record<string, unknown>>(
  ctx: AuthenticatedContext,
  where: T = {} as T,
): T & { tenantId: string } {
  if (ctx.profile.role === 'SUPER_ADMIN') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'SUPER_ADMIN has no school tenant. Use platform procedures or withExplicitTenant(tenantId).',
    });
  }

  if (!ctx.profile.tenantId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'School profile is missing tenantId — cannot scope query.',
    });
  }

  return {
    ...where,
    tenantId: ctx.profile.tenantId,
  };
}

/** Explicit tenant scope for platform operators acting on one school. */
export function withExplicitTenant<T extends Record<string, unknown>>(
  tenantId: string,
  where: T = {} as T,
): T & { tenantId: string } {
  if (!tenantId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'tenantId is required for explicit tenant scoping.',
    });
  }
  return { ...where, tenantId };
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.supabaseUser || !ctx.profile) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({
    ctx: {
      ...ctx,
      supabaseUser: ctx.supabaseUser,
      profile: ctx.profile,
    } satisfies AuthenticatedContext,
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

/** Factory: require one of the given roles. */
export function roleProcedure(...roles: Role[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!roles.includes(ctx.profile.role as Role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Requires role: ${roles.join(' | ')}`,
      });
    }
    return next({ ctx });
  });
}

/** Platform operators only — manage all schools, no tenant filter. */
export const platformProcedure = roleProcedure('SUPER_ADMIN');

/** School staff (single-tenant ADMIN or TEACHER). */
export const schoolStaffProcedure = roleProcedure('ADMIN', 'TEACHER');

/** Assert school profile has a tenantId (never call for SUPER_ADMIN). */
export function requireTenantId(ctx: AuthenticatedContext): string {
  if (!ctx.profile.tenantId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This action requires a school-scoped profile with tenantId.',
    });
  }
  return ctx.profile.tenantId;
}
