import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export type AuthRole = 'customer' | 'admin' | 'seller';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: AuthRole;
}

const WEAK_SECRETS = new Set(['', 'your-secret-key-change-this', 'seu-secret-jwt-super-seguro-mude-isto']);

export function getJwtSecret(): string {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret || WEAK_SECRETS.has(secret)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET fraco ou ausente. Configure um segredo forte na Vercel.');
    }
    return 'dev-only-jwt-secret-change-me';
  }
  return secret;
}

export function signAuthToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export function verifyAuthToken(token: string): AuthUser {
  const decoded = jwt.verify(token, getJwtSecret()) as AuthUser & { iat?: number; exp?: number };
  if (!decoded?.id || !decoded?.email || !decoded?.role) {
    throw new Error('Token inválido');
  }
  return {
    id: decoded.id,
    email: decoded.email,
    name: decoded.name || 'Usuário',
    phone: decoded.phone || '',
    role: decoded.role,
  };
}

export function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
