'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@classsync/ui-web';
import { createSupabaseBrowserClient } from '@classsync/supabase-client/browser';
import { trpc } from '@/lib/trpc';

export default function PlatformPage() {
  const router = useRouter();
  const me = trpc.auth.me.useQuery();
  const tenants = trpc.tenant.list.useQuery(undefined, {
    enabled: me.data?.role === 'SUPER_ADMIN',
  });
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createTenant = trpc.tenant.create.useMutation({
    onSuccess: async () => {
      setName('');
      setSubdomain('');
      setFormError(null);
      await utils.tenant.list.invalidate();
    },
    onError: (err) => setFormError(err.message),
  });

  useEffect(() => {
    if (me.isLoading) return;
    if (!me.data) {
      router.replace('/login');
      return;
    }
    if (me.data.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [me.isLoading, me.data, router]);

  async function logout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (me.isLoading || me.data?.role !== 'SUPER_ADMIN') {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading platform console…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ClassSync Platform</h1>
          <p className="text-sm text-slate-500">
            Super-admin — manage all schools (tenants)
          </p>
        </div>
        <Button variant="outline" onClick={logout}>
          Sign out
        </Button>
      </div>

      <p className="text-sm text-slate-600">
        Signed in as {me.data.name} ({me.data.role}) — no school tenant scope
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Schools</CardTitle>
          <CardDescription>All tenants on the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {tenants.isLoading ? <p>Loading schools…</p> : null}
          {tenants.error ? <p className="text-red-600">{tenants.error.message}</p> : null}
          {tenants.data?.length === 0 ? <p className="text-slate-500">No schools yet.</p> : null}
          <ul className="divide-y divide-slate-100">
            {tenants.data?.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-slate-500">
                    {t.subdomain} · {t.subscriptionTier} · {t._count.students} students ·{' '}
                    {t._count.profiles} profiles
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add school</CardTitle>
          <CardDescription>Create a new tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              createTenant.mutate({ name, subdomain: subdomain.toLowerCase() });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="school-name">School name</Label>
              <Input
                id="school-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Riverside Academy"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="riverside"
                required
              />
            </div>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <Button type="submit" disabled={createTenant.isPending}>
              {createTenant.isPending ? 'Creating…' : 'Create school'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
