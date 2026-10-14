import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';
import { postizService } from '@/services/postizService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Envia mídia para o Postiz e devolve a referência {id, path} usada depois para
 * publicar/agendar o post. Dois modos:
 *
 * - multipart (campo "file"): arquivo vindo do navegador. Limitado a ~4.5MB pelo
 *   corpo de requisição das funções da Vercel (limite da plataforma).
 * - JSON { url }: o Postiz baixa o arquivo direto do link público — sem limite da
 *   Vercel, é o caminho para vídeos grandes de Reels.
 */
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

    if ((request.headers.get('content-type') || '').includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      const url = normalizeMediaUrl(String(body?.url || ''));
      if (!url) {
        return NextResponse.json(
          { success: false, error: 'Link inválido. Use um link https público e direto para o arquivo.' },
          { status: 400 }
        );
      }
      const media = await postizService.uploadFromUrl(url);
      return NextResponse.json({ success: true, data: media });
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
          ? 'Arquivo muito grande para envio direto (limite ~4.5MB da Vercel). Use "Enviar por link" com um link público do vídeo.'
          : message,
      },
      { status: 500 }
    );
  }
}

/**
 * Aceita só https público e converte links de compartilhamento comuns em
 * download direto (o Postiz precisa do arquivo, não da página de visualização).
 */
function normalizeMediaUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  if (host === 'drive.google.com') {
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get('id');
    if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  }
  if (host.endsWith('dropbox.com')) {
    url.searchParams.delete('dl');
    url.searchParams.set('raw', '1');
    return url.toString();
  }
  return url.toString();
}
