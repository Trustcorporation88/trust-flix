import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Callback de desautorização exigido pela Meta (Login da Empresa no Instagram).
 * A Meta chama essa rota quando um usuário remove o acesso do app pela conta dele.
 * Docs: https://developers.facebook.com/docs/facebook-login/guides/permissions/deauthorization-callback
 *
 * Requer META_APP_SECRET no ambiente (mesmo valor de INSTAGRAM_APP_SECRET/FACEBOOK_APP_SECRET
 * configurado no app da Meta) para verificar a assinatura do signed_request.
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

    // TODO (quando o Comment-to-DM/armazenamento de tokens no Vercel KV existir):
    // remover campanhas e tokens associados a data.user_id aqui.
    console.log('Instagram deauthorize recebido para user_id:', data.user_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no callback de desautorização:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}
