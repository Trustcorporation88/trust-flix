'use client';

import { useAuth } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'seller' | 'customer';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-ink-950/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-950/15 border-t-signal-500" />
          <span className="text-sm font-medium">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Acesso negado</div>
      </div>
    );
  }

  return <>{children}</>;
}
