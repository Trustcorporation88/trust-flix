import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';
import { postizService } from '@/services/postizService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Busca músicas para Reels na biblioteca do Instagram (via Postiz audioSearch). */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const params = new URL(request.url).searchParams;
  const integrationId = params.get('integrationId') || '';
  const q = (params.get('q') || '').slice(0, 100);
  const type = params.get('type') === 'original_sound' ? 'original_sound' : 'music';

  if (!integrationId) {
    return NextResponse.json({ success: false, error: 'integrationId obrigatório.' }, { status: 400 });
  }
  if (!postizService.isConfigured()) {
    return NextResponse.json({ success: false, error: 'Postiz ainda não configurado.' }, { status: 400 });
  }

  try {
    const tracks = await postizService.searchReelAudio(integrationId, q, type);
    return NextResponse.json({ success: true, data: tracks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar músicas';
    let friendly = message;
    if (/\(401\)/.test(message)) {
      friendly = 'A conexão do Instagram expirou no Postiz. Reconecte a conta em insta.trustcorp.com.br.';
    } else if (/\(404\)/.test(message)) {
      friendly =
        'Busca de música indisponível: a conta precisa estar ligada a uma Página do Facebook e o Postiz precisa estar atualizado.';
    } else if (/\(429\)/.test(message)) {
      friendly = 'Limite de buscas do Postiz atingido nesta hora. Tente de novo mais tarde.';
    }
    return NextResponse.json({ success: false, error: friendly }, { status: 502 });
  }
}
