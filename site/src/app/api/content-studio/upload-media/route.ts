import { NextRequest, NextResponse } from 'next/server';
import { postizService } from '@/services/postizService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Recebe um arquivo (imagem ou vídeo) do navegador e repassa para o Postiz
 * (POST /upload), devolvendo a referência {id, path} usada depois para
 * publicar/agendar o post.
 *
 * ATENÇÃO -- limite de tamanho: rotas de API do Next.js na Vercel têm um limite
 * de corpo de requisição de ~4.5MB (limite da própria plataforma, não do nosso
 * código). Vídeos de Reels maiores que isso vão falhar aqui -- nesse caso,
 * comprima o vídeo antes de enviar ou publique esse post específico direto
 * pelo painel do Postiz (que não tem esse limite).
 */
export async function POST(request: NextRequest) {
  try {
    if (!postizService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Postiz ainda não configurado. Veja postiz-deploy/README.md.' },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ success: false, error: 'Arquivo obrigatório (campo "file").' }, { status: 400 });
    }

    const filename = (file as File).name || 'upload';
    const media = await postizService.uploadMedia(file, filename);

    return NextResponse.json({ success: true, data: media });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar arquivo';
    const tooLarge = /413|too large|payload/i.test(message);
    return NextResponse.json(
      {
        success: false,
        error: tooLarge
          ? 'Arquivo muito grande para este envio (limite ~4.5MB da Vercel). Comprima o vídeo ou publique esse post direto no painel do Postiz.'
          : message,
      },
      { status: 500 }
    );
  }
}
