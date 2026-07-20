import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createClient } from '@supabase/supabase-js';
import { appRouter, type TrpcContext } from '@classsync/api-router';
import { prisma } from '@classsync/database';

const corsHeaders: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function createContext(req: Request): Promise<TrpcContext> {
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let supabaseUser = null;
  let profile = null;

  if (bearer) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anonKey) {
      const supabase = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await supabase.auth.getUser(bearer);
      supabaseUser = data.user;

      if (supabaseUser) {
        profile = await prisma.profile.findUnique({
          where: { id: supabaseUser.id },
        });
      }
    }
  }

  return {
    prisma,
    supabaseUser,
    profile,
    setCookieHeaders: [],
  };
}

const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req),
  });

  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export { handler as GET, handler as POST, handler as OPTIONS };
