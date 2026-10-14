import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';
import { postizService } from '@/services/postizService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cancela um post agendado/rascunho no Postiz. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  if (!postizService.isConfigured()) {
    return NextResponse.json({ success: false, error: 'Postiz ainda não configurado.' }, { status: 400 });
  }
  if (!params.id) {
    return NextResponse.json({ success: false, error: 'ID do post obrigatório.' }, { status: 400 });
  }

  try {
    const data = await postizService.deletePost(params.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao cancelar post' },
      { status: 500 }
    );
  }
}
