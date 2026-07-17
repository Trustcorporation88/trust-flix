'use client';

import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthInit } from '@/lib/hooks/useAuthInit';

export function Providers({ children }: { children: ReactNode }) {
  useAuthInit();
  return (
    <>
      {children}
      <Toaster position="top-right" />
    </>
  );
}
