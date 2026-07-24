'use client';

import { useAuth } from '@/lib/store/authStore';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FiLoader } from 'react-icons/fi';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-ink-950/60">
        <div className="flex items-center gap-3 rounded-xl border border-ink-950/10 bg-white px-5 py-4 shadow-sm">
          <FiLoader className="animate-spin text-signal-500" />
          <span className="text-sm font-medium">Preparando seu painel...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
