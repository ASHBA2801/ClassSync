/**
 * Server Supabase client for Next.js Server Components, Route Handlers, and Middleware.
 * Reads/writes the auth session from cookies. Uses the anon key (RLS-aware).
 * For privileged admin ops only, create a separate service-role client on the server —
 * never ship SUPABASE_SERVICE_ROLE_KEY to the browser or mobile bundle.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.');
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — middleware will refresh the session.
        }
      },
    },
  });
}
