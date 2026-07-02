import { NextRequest, NextResponse } from 'next/server';
import { postizService } from '@/services/postizService';

export async function GET() {
  try {
    if (!postizService.isConfigured()) {
      return NextResponse.json({
        success: true,
        configured: false,
        data: [],
        message: 'Postiz ainda não configurado. Veja postiz-deploy/README.md.',
      });
    }
    const groups = await postizService.listGroups();
    const integrations = await postizService.listIntegrations();
    return NextResponse.json({ success: true, configured: true, data: { groups, integrations } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!postizService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Postiz ainda não configurado. Veja postiz-deploy/README.md.' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const result = await postizService.createPost(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao agendar post' },
      { status: 500 }
    );
  }
}
