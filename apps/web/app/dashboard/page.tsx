'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@classsync/ui-web';
import { createSupabaseBrowserClient } from '@classsync/supabase-client/browser';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

export default function DashboardPage() {
  const router = useRouter();
  const ping = trpc.health.ping.useQuery();
  const me = trpc.auth.me.useQuery();

  useEffect(() => {
    if (me.isLoading) return;
    if (me.data?.role === 'SUPER_ADMIN') {
      router.replace('/platform');
    }
  }, [me.isLoading, me.data, router]);

  async function logout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ClassSync</h1>
          <p className="text-sm text-slate-500">School admin dashboard (single tenant)</p>
        </div>
        <Button variant="outline" onClick={logout}>
          Sign out
        </Button>
      </div>

      <nav className="flex gap-4 text-sm text-slate-600">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/students">Students</Link>
        <Link href="/attendance">Attendance</Link>
        <Link href="/agents">Agents</Link>
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>Health check</CardTitle>
          <CardDescription>
            End-to-end proof: web → tRPC → Prisma → Supabase Postgres
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {ping.isLoading ? <p>Calling health.ping…</p> : null}
          {ping.error ? <p className="text-red-600">{ping.error.message}</p> : null}
          {ping.data ? (
            <>
              <p>
                <span className="font-medium">OK:</span> {String(ping.data.ok)}
              </p>
              <p>
                <span className="font-medium">Timestamp:</span> {ping.data.timestamp}
              </p>
              <p>
                <span className="font-medium">Tenant count:</span> {ping.data.tenantCount}
              </p>
              <p>
                <span className="font-medium">Authenticated:</span> {String(ping.data.authenticated)}
              </p>
            </>
          ) : null}
          {me.data ? (
            <p className="pt-2 text-slate-600">
              Signed in as {me.data.name} ({me.data.role})
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
