import type { PrismaClient, Profile } from '@classsync/database';
import type { User } from '@supabase/supabase-js';

export type TrpcContext = {
  prisma: PrismaClient;
  /** Supabase auth user when a valid JWT was presented; otherwise null. */
  supabaseUser: User | null;
  /** ClassSync Profile row for the authenticated user; otherwise null. */
  profile: Profile | null;
  /**
   * Optional Set-Cookie style headers the auth router may attach
   * (web adapter can forward these on the HTTP response).
   */
  setCookieHeaders: string[];
};

export type AuthenticatedContext = TrpcContext & {
  supabaseUser: User;
  profile: Profile;
};
