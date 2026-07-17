import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';
import { postizService } from '@/services/postizService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    if (!postizService.isConfigured()) {
      return NextResponse.json({
        success: true,
        configured: false,
        data: null,
        message: 'Postiz ainda não configurado.',
      });
    }

    const integrationId = request.nextUrl.searchParams.get('integrationId');
    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Informe integrationId da conta Instagram.' },
        { status: 400 }
      );
    }

    const analytics = await postizService.getAnalytics(integrationId);

    return NextResponse.json({
      success: true,
      configured: true,
      data: analytics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        configured: true,
        error: error instanceof Error ? error.message : 'Erro ao buscar analytics no Postiz',
      },
      { status: 502 }
    );
  }
}
