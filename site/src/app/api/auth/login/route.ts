import { NextRequest, NextResponse } from 'next/server';
import { signAuthToken } from '@/lib/auth/jwt';
import { authenticateUser } from '@/lib/auth/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '');
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Email ou senha inválidos' }, { status: 401 });
    }

    const token = signAuthToken(user);

    return NextResponse.json({
      success: true,
      data: { user, token },
      message: 'Autenticação realizada com sucesso',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno',
      },
      { status: 500 }
    );
  }
}
