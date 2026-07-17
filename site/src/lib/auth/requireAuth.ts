import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, extractBearerToken, verifyAuthToken } from './jwt';

export function unauthorized(message = 'Não autorizado'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function requireAuth(request: NextRequest): { user: AuthUser } | NextResponse {
  try {
    const token = extractBearerToken(request);
    if (!token) return unauthorized();
    const user = verifyAuthToken(token);
    return { user };
  } catch {
    return unauthorized('Token inválido ou expirado');
  }
}

export function isAuthError(result: { user: AuthUser } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
