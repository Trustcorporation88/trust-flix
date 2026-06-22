import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Aqui você chamaria seu backend para criar usuário ou fazer login
    // Por enquanto, vou criar um JWT mock
    const user = {
      id: '1',
      email,
      name: name || 'Usuário',
      phone: phone || '',
      role: 'customer',
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    return NextResponse.json({
      success: true,
      data: {
        user,
        token,
      },
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

