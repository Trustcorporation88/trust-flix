import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Agendamento real fica no Content Studio (Postiz). Esta rota só orienta o cliente. */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  return NextResponse.json({
    success: true,
    data: {
      redirect: '/dashboard/content-studio',
      message: 'Use o Content Studio para agendar e publicar via Postiz.',
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  return NextResponse.json(
    {
      success: false,
      error: 'Agendamento movido para o Content Studio.',
      redirect: '/dashboard/content-studio',
    },
    { status: 410 }
  );
}
