import { createTRPCRouter } from './trpc';
import { authRouter } from './routers/auth';
import { healthRouter } from './routers/health';
import { profileRouter } from './routers/profile';
import { studentRouter } from './routers/student';
import { attendanceRouter } from './routers/attendance';
import { tenantRouter } from './routers/tenant';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  health: healthRouter,
  profile: profileRouter,
  student: studentRouter,
  attendance: attendanceRouter,
  tenant: tenantRouter,
});

export type AppRouter = typeof appRouter;

export {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  roleProcedure,
  platformProcedure,
  schoolStaffProcedure,
  withTenantFilter,
  withExplicitTenant,
  requireTenantId,
} from './trpc';
export type { TrpcContext, AuthenticatedContext } from './context';
