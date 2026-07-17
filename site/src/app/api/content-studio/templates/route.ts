import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';
import { trendsService } from '@/services/trendsService';
import templatesData from '@/data/templates.json';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const nicho = searchParams.get('nicho') || '';
    const objetivo = searchParams.get('objetivo');
    const formato = searchParams.get('formato');

    const trending = nicho ? await trendsService.getTrendingHashtags(nicho) : [];

    let templates = templatesData.map((t) => ({
      ...t,
      trendScore: trendsService.scoreTags(t.tags, trending),
    }));

    if (objetivo && objetivo !== 'all') {
      templates = templates.filter((t) => t.objetivo === objetivo);
    }
    if (formato && formato !== 'all') {
      templates = templates.filter((t) => t.format === formato);
    }

    templates.sort((a, b) => b.trendScore - a.trendScore);

    return NextResponse.json({
      success: true,
      data: templates,
      trendsConfigured: trendsService.isConfigured(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
