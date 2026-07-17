/**
 * fetch autenticado para rotas /api do SocialFlow.
 * Injeta Bearer do localStorage e redireciona para /login em 401.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token');
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  return res;
}
