import { NextRequest, NextResponse } from 'next/server';
import { getCatalogProduct, listCatalogProducts } from '@/data/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get('slug');
  const category = searchParams.get('category') || undefined;
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') || 12)));

  // Catálogo local primeiro (curso + futuros produtos)
  if (slug) {
    const product = getCatalogProduct(slug);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Produto não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: product });
  }

  const local = listCatalogProducts(category);

  // Tenta enriquecer com backend JETBOT se estiver online; senão usa só o local
  try {
    const jetbotApi = process.env.NEXT_PUBLIC_JETBOT_API || process.env.JETBOT_API_URL;
    if (jetbotApi && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(jetbotApi)) {
      const response = await fetch(`${jetbotApi.replace(/\/$/, '')}/api/products`, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 60 },
      });
      if (response.ok) {
        const data = await response.json();
        const remote = Array.isArray(data.data) ? data.data : [];
        const merged = [...local, ...remote];
        const start = (page - 1) * limit;
        const slice = merged.slice(start, start + limit);
        return NextResponse.json({
          success: true,
          data: slice,
          total: merged.length,
          page,
          limit,
          pages: Math.max(1, Math.ceil(merged.length / limit)),
        });
      }
    }
  } catch {
    // fallback local
  }

  const start = (page - 1) * limit;
  const slice = local.slice(start, start + limit);

  return NextResponse.json({
    success: true,
    data: slice,
    total: local.length,
    page,
    limit,
    pages: Math.max(1, Math.ceil(local.length / limit)),
    source: 'catalog',
  });
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Criação de produtos via API admin ainda não disponível neste ambiente.' },
    { status: 501 }
  );
}
