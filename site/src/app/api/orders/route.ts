import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    const jetbotApi = process.env.NEXT_PUBLIC_JETBOT_API || 'http://localhost:3001';

    const response = await fetch(`${jetbotApi}/api/orders`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar pedidos');
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data: data.data || [],
      total: data.total || 0,
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
    const body = await request.json();
    const jetbotApi = process.env.NEXT_PUBLIC_JETBOT_API || 'http://localhost:3001';

    const response = await fetch(`${jetbotApi}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar pedido');
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
