import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';
import { postizService } from '@/services/postizService';

// Sem isso, essa rota GET (sem params, sem cookies/headers) é tratada pelo Next.js
// como estatica e renderizada uma unica vez em build time -- o resultado (inclusive
// erros) fica congelado e nao muda em requests subsequentes nem apos redeploys que so
// alteram logica de runtime. Forcamos execucao dinamica a cada request.
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
        data: { groups: [], integrations: [] },
        message: 'Postiz ainda não configurado. Veja postiz-deploy/README.md.',
      });
    }

    const integrations = await postizService.listIntegrations();

    // Algumas instâncias self-hosted do Postiz não expõem GET /groups nesta versão
    // da API pública -- isso não é bloqueante, o essencial (contas conectadas) já
    // veio de listIntegrations() acima.
    let groups: Awaited<ReturnType<typeof postizService.listGroups>> = [];
    try {
      groups = await postizService.listGroups();
    } catch (groupsError) {
      console.warn('Postiz: GET /groups indisponível nesta instância, seguindo sem multi-tenant groups.', groupsError);
    }

    return NextResponse.json({
      success: true,
      configured: true,
      data: { groups, integrations },
      meta: {
        total: integrations.length,
        identifiers: integrations.map((i) => i.identifier),
        names: integrations.map((i) => i.name),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    if (!postizService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Postiz ainda não configurado. Veja postiz-deploy/README.md.' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const result = await postizService.createPost({
      integrationId: body.integrationId,
      integrationType: body.integrationType,
      content: body.content,
      media: body.media,
      postType: body.postType,
      scheduledFor: body.scheduledFor,
      tiktok: body.tiktok,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao agendar post' },
      { status: 500 }
    );
  }
}
