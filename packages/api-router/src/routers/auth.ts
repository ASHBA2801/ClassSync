import { createClient } from '@supabase/supabase-js';
import { publicProcedure, createTRPCRouter } from '../trpc';
import { loginSchema, registerSchema } from '@classsync/shared-types';
import { TRPCError } from '@trpc/server';

function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Supabase URL/anon key not configured',
    });
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const authRouter = createTRPCRouter({
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const supabase = getAnonSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.session || !data.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: error?.message ?? 'Invalid email or password',
      });
    }

    const profile = await ctx.prisma.profile.findUnique({
      where: { id: data.user.id },
    });

    if (!profile) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No ClassSync profile for this user. Run db:seed after creating Auth users.',
      });
    }

    // Web clients can persist the session via Supabase browser/server clients.
    // Mobile stores access_token in expo-secure-store from this response.
    return {
      status: 'ok' as const,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: data.user.id,
      role: profile.role,
      tenantId: profile.tenantId,
      name: profile.name,
      email: profile.email,
      isPlatformAdmin: profile.role === 'SUPER_ADMIN',
    };
  }),

  logout: publicProcedure.mutation(async () => {
    // Session clearing is client-side (cookies / SecureStore).
    return { status: 'ok' as const };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.supabaseUser || !ctx.profile) {
      return null;
    }
    return {
      id: ctx.profile.id,
      email: ctx.profile.email,
      name: ctx.profile.name,
      role: ctx.profile.role,
      tenantId: ctx.profile.tenantId,
      isPlatformAdmin: ctx.profile.role === 'SUPER_ADMIN',
    };
  }),

  register: publicProcedure.input(registerSchema).mutation(async () => {
    // Scaffold stub — full registration / tenant onboarding comes later.
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Registration is not implemented in the scaffold. Create users in Supabase Auth.',
    });
  }),
});
