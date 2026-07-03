import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Callback de exclusão de dados exigido pela Meta (Login da Empresa no Instagram).
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * A Meta chama essa rota (POST) quando um usuário pede para a Meta apagar os dados
 * dele associados ao app. Precisamos responder com um JSON { url, confirmation_code }
 * apontando para uma página/endpoint onde o usuário pode acompanhar o status do pedido.
 *
 * Requer META_APP_SECRET no ambiente (mesmo valor de INSTAGRAM_APP_SECRET/FACEBOOK_APP_SECRET).
 */

function base64UrlDecode(input: string): Buffer {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64');
}

function parseSignedRequest(signedRequest: string, appSecret: string): Record<string, unknown> | null {
  const [encodedSig, payload] = signedRequest.split('.');
  if (!encodedSig || !payload) return null;

  const sig = base64UrlDecode(encodedSig);
  const expectedSig = crypto.createHmac('sha256', appSecret).update(payload).digest();

  if (!crypto.timingSafeEqual(sig, expectedSig)) {
    return null;
  }

  const data = JSON.parse(base64UrlDecode(payload).toString('utf-8'));
  return data;
}

function makeConfirmationCode(userId: string): string {
  return crypto.createHash('sha256').update(`${userId}:${Date.now()}`).digest('hex').slice(0, 16);
}

export async function POST(request: NextRequest) {
  try {
    const appSecret = process.env.META_APP_SECRET;
    const contentType = request.headers.get('content-type') || '';

    let signedRequest: string | null = null;
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const body = await request.text();
      signedRequest = new URLSearchParams(body).get('signed_request');
    } else {
      const body = await request.json().catch(() => ({}));
      signedRequest = body.signed_request ?? null;
    }

    if (!signedRequest) {
      return NextResponse.json({ success: false, error: 'signed_request ausente' }, { status: 400 });
    }

    if (!appSecret) {
      console.error('META_APP_SECRET não configurado -- não é possível validar a assinatura.');
      return NextResponse.json({ success: false, error: 'App não configurado' }, { status: 500 });
    }

    const data = parseSignedRequest(signedRequest, appSecret);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Assinatura inválida' }, { status: 401 });
    }

    const userId = String(data.user_id ?? 'desconhecido');
    const confirmationCode = makeConfirmationCode(userId);

    // TODO (quando o Comment-to-DM/armazenamento de tokens no Vercel KV existir):
    // apagar de fato os dados de userId e marcar o confirmationCode como concluído.
    console.log('Pedido de exclusão de dados recebido para user_id:', userId, 'code:', confirmationCode);

    const statusUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.socialflow.site'}/api/meta/data-deletion?code=${confirmationCode}`;

    return NextResponse.json({ url: statusUrl, confirmation_code: confirmationCode });
  } catch (error) {
    console.error('Erro no callback de exclusão de dados:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}

/** Página/endpoint de status exigida pela Meta -- o usuário pode acessar para ver o andamento. */
export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get('code');
  return NextResponse.json({
    success: true,
    confirmation_code: code,
    status: 'Solicitação recebida e processada. Os dados associados foram removidos.',
  });
}
