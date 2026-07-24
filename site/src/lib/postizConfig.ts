/**
 * URLs públicas do Postiz (instância Trust).
 * NEXT_PUBLIC_* permite uso no client; server também lê POSTIZ_API_URL.
 */

const DEFAULT_POSTIZ_APP = 'https://insta.trustcorp.com.br';

function stripApiSuffix(url: string): string {
  return url
    .replace(/\/api\/public\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');
}

/** Painel web do Postiz (conectar contas, calendário nativo, settings). */
export function getPostizAppUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_POSTIZ_APP_URL ||
    (typeof process.env.POSTIZ_API_URL === 'string' && process.env.POSTIZ_API_URL
      ? stripApiSuffix(process.env.POSTIZ_API_URL)
      : '');
  return (fromEnv || DEFAULT_POSTIZ_APP).replace(/\/$/, '');
}

export const POSTIZ_APP_URL = getPostizAppUrl();
