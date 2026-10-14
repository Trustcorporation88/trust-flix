import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';
import { postizService } from '@/services/postizService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Próximo horário livre na fila do canal no Postiz. */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const integrationId = new URL(request.url).searchParams.get('integrationId') || '';
  if (!integrationId) {
    return NextResponse.json({ success: false, error: 'integrationId obrigatório.' }, { status: 400 });
  }
  if (!postizService.isConfigured()) {
    return NextResponse.json({ success: false, configured: false, error: 'Postiz ainda não configurado.' });
  }

  try {
    const date = await postizService.findSlot(integrationId);
    if (!date) {
      return NextResponse.json({ success: false, error: 'Postiz não devolveu horário livre.' });
    }
    return NextResponse.json({ success: true, data: { date } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar horário livre' },
      { status: 500 }
    );
  }
}
