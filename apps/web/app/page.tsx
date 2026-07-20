'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

/** Route signed-in users to platform console or school dashboard by role. */
export default function HomePage() {
  const router = useRouter();
  const me = trpc.auth.me.useQuery();

  useEffect(() => {
    if (me.isLoading) return;
    if (!me.data) {
      router.replace('/login');
      return;
    }
    router.replace(me.data.role === 'SUPER_ADMIN' ? '/platform' : '/dashboard');
  }, [me.isLoading, me.data, router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      Redirecting…
    </main>
  );
}
