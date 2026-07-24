'use client';

import { useAuth } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error('Faça login para acessar o painel');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-100">
        <div className="flex items-center gap-3 text-ink-950/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-950/15 border-t-signal-500" />
          <span className="text-sm font-medium">Carregando...</span>
        </div>
      </div>
    );
  }

  return children;
}
