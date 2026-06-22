import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    return NextResponse.json({
      success: true,
      data: decoded,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Token inválido ou expirado' },
      { status: 401 }
    );
  }
}

