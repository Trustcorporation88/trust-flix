import { NextRequest, NextResponse } from 'next/server';
import { findUserById } from '@/lib/auth/users';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const fresh = findUserById(auth.user.id) || auth.user;

  return NextResponse.json({
    success: true,
    data: fresh,
  });
}
