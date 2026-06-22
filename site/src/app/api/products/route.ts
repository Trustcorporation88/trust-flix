import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // Aqui você conectará com seu backend JETBOT
    const jetbotApi = process.env.NEXT_PUBLIC_JETBOT_API || 'http://localhost:3001';

    const response = await fetch(`${jetbotApi}/api/products`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar produtos');
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data: data.data || [],
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 10,
      pages: data.pages || 1,
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

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const jetbotApi = process.env.NEXT_PUBLIC_JETBOT_API || 'http://localhost:3001';

    const response = await fetch(`${jetbotApi}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar produto');
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data: data.data });
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

