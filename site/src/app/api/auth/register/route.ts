import { NextRequest, NextResponse } from 'next/server';
import { signAuthToken } from '@/lib/auth/jwt';
import { isRegisterAllowed, registerUser } from '@/lib/auth/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await registerUser({
      email: body.email,
      password: body.password,
      name: body.name,
      phone: body.phone,
    });

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    const token = signAuthToken(result.user);

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        token,
      },
      message: 'Conta criada com sucesso',
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

export async function GET() {
  return NextResponse.json({
    success: true,
    data: { allowRegister: isRegisterAllowed() },
  });
}
