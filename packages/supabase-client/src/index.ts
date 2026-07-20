export { createSupabaseBrowserClient } from './browser';
export { createSupabaseServerClient } from './server';
export { createSupabaseMobileClient } from './mobile';

import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

/** Typed helper: current session or null. */
export async function getSession(client: SupabaseClient): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

/** Typed helper: current auth user or null. */
export async function getUser(client: SupabaseClient): Promise<User | null> {
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user;
}
