import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, senha e nome são obrigatórios' },
        { status: 400 }
      );
    }

    // Aqui você chamaria seu backend para registrar o usuário
    // Por enquanto, vou criar um registro mock
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      phone: phone || '',
      role: 'customer',
      password: hashedPassword,
      createdAt: new Date(),
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    return NextResponse.json({
      success: true,
      data: {
        user,
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
