import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';
import { postizService } from '@/services/postizService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    if (!postizService.isConfigured()) {
      return NextResponse.json({
        success: true,
        configured: false,
        data: [],
        message: 'Postiz ainda não configurado.',
      });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const start =
      searchParams.get('startDate') || startOfWeek(now).toISOString();
    const end = searchParams.get('endDate') || endOfWeek(now).toISOString();
    const customer = searchParams.get('customer') || undefined;

    const posts = await postizService.listPosts(start, end, customer);

    return NextResponse.json({
      success: true,
      configured: true,
      data: posts,
      range: { startDate: start, endDate: end },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao listar posts' },
      { status: 500 }
    );
  }
}
