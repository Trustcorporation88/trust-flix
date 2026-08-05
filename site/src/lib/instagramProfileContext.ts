/**
 * Contexto do Instagram autorizado via Postiz.
 *
 * Em vez de "varrer a web" do perfil (Instagram bloqueia crawler), lemos a
 * conta já conectada e autorizada no Postiz — a mesma usada para publicar.
 *
 * Default do site pessoal: @cyntiarinaldidoces
 */
import {
  postizService,
  isInstagramIntegration,
  type PostizIntegration,
  type PostizPost,
} from '@/services/postizService';

export const DEFAULT_IG_HANDLE =
  (process.env.COPILOT_DEFAULT_IG_HANDLE || 'cyntiarinaldidoces').replace(/^@/, '').toLowerCase();

export interface ProfilePostSummary {
  date?: string;
  content: string;
  state?: string;
  url?: string;
}

export interface InstagramProfileContext {
  configured: boolean;
  handle: string;
  accountName: string;
  integrationId?: string;
  identifier?: string;
  postsAnalyzed: number;
  recentPosts: ProfilePostSummary[];
  /** Texto pronto para injetar no system prompt do Copilot. */
  promptBlock: string;
  /** Aviso curto se algo falhou (Postiz off, conta não achada, etc.). */
  notice?: string;
}

function normalizeHandle(raw?: string): string {
  return String(raw || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

function postText(post: PostizPost): string {
  if (typeof post.content === 'string' && post.content.trim()) return post.content.trim();
  // algumas instâncias aninham value[0].content
  const value = (post as { value?: Array<{ content?: string }> }).value;
  if (Array.isArray(value) && value[0]?.content) return String(value[0].content).trim();
  return '';
}

function postDateIso(post: PostizPost): string | undefined {
  const raw = post.publishDate || post.date;
  if (!raw || typeof raw !== 'string') return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function matchesHandle(integration: PostizIntegration, handle: string): boolean {
  const h = handle.toLowerCase();
  const name = String(integration.name || '').toLowerCase();
  const profile = String(integration.profile || '').toLowerCase().replace(/^@/, '');
  return (
    name === h ||
    name === `@${h}` ||
    name.includes(h) ||
    profile === h ||
    profile.includes(h)
  );
}

function pickInstagramAccount(
  integrations: PostizIntegration[],
  handle: string
): PostizIntegration | undefined {
  const ig = integrations.filter(
    (i) => !i.disabled && isInstagramIntegration(i.identifier || '')
  );
  if (ig.length === 0) return undefined;

  const exact = ig.find((i) => matchesHandle(i, handle));
  if (exact) return exact;

  // site pessoal: se só há 1 conta IG, usa ela
  if (ig.length === 1) return ig[0];

  // tenta default global
  const def = ig.find((i) => matchesHandle(i, DEFAULT_IG_HANDLE));
  return def || ig[0];
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function buildPromptBlock(opts: {
  handle: string;
  accountName: string;
  posts: ProfilePostSummary[];
}): string {
  const lines: string[] = [];
  lines.push(`PERFIL INSTAGRAM AUTORIZADO: @${opts.handle}`);
  lines.push(`Nome da conta conectada: ${opts.accountName}`);
  lines.push(
    'Use este perfil como BASE DE VERDADE: tom de voz, temas, produtos, linguagem e ritmo de publicação.'
  );
  lines.push(
    'NÃO invente posts que não estão abaixo. Se a lista for curta, diga e complete com formatos do playbook no MESMO tom.'
  );

  if (opts.posts.length === 0) {
    lines.push('Nenhum post recente encontrado no Postiz para análise.');
    return lines.join('\n');
  }

  lines.push(`Últimos ${opts.posts.length} posts (mais recentes primeiro):`);
  opts.posts.forEach((p, i) => {
    const date = p.date ? p.date.slice(0, 10) : 'sem data';
    const state = p.state ? ` [${p.state}]` : '';
    const body = p.content.length > 280 ? `${p.content.slice(0, 280)}…` : p.content;
    lines.push(`${i + 1}. ${date}${state}`);
    lines.push(`   ${body || '(sem legenda)'}`);
    if (p.url) lines.push(`   url: ${p.url}`);
  });

  lines.push('');
  lines.push('Ao gerar ideias:');
  lines.push('- continue a identidade visual/verbal desse perfil');
  lines.push('- prefira temas que já performam no histórico acima');
  lines.push('- entregue roteiro filmável + legenda no tom da conta');
  lines.push('- se for doces/confeitaria, seja sensorial e concreto (sabor, textura, ocasião)');
  return lines.join('\n');
}

/**
 * Carrega contexto do Instagram conectado no Postiz.
 * Best-effort: nunca lança — devolve notice se algo faltar.
 */
export async function loadInstagramProfileContext(opts?: {
  handle?: string;
  days?: number;
  maxPosts?: number;
}): Promise<InstagramProfileContext> {
  const handle = normalizeHandle(opts?.handle) || DEFAULT_IG_HANDLE;
  const days = opts?.days ?? 180;
  const maxPosts = opts?.maxPosts ?? 24;

  if (!postizService.isConfigured()) {
    return {
      configured: false,
      handle,
      accountName: handle,
      postsAnalyzed: 0,
      recentPosts: [],
      promptBlock: '',
      notice:
        'Postiz não configurado neste ambiente — não deu para ler o Instagram autorizado. Defina POSTIZ_API_URL e POSTIZ_API_KEY.',
    };
  }

  try {
    const integrations = await postizService.listIntegrations();
    const account = pickInstagramAccount(integrations, handle);

    if (!account) {
      return {
        configured: true,
        handle,
        accountName: handle,
        postsAnalyzed: 0,
        recentPosts: [],
        promptBlock: '',
        notice: `Nenhuma conta Instagram conectada no Postiz para @${handle}. Conecte a conta no painel Instagram/Postiz.`,
      };
    }

    const resolvedHandle =
      normalizeHandle(account.profile) ||
      normalizeHandle(account.name).replace(/\s+/g, '') ||
      handle;

    const start = daysAgoIso(days);
    const end = new Date().toISOString();
    let posts: PostizPost[] = [];
    try {
      posts = await postizService.listPosts(start, end);
    } catch {
      posts = [];
    }

    // filtra posts da conta quando o payload traz integration
    const forAccount = posts.filter((p) => {
      const igId = p.integration?.id;
      const igName = String(p.integration?.name || '').toLowerCase();
      if (igId && account.id && igId === account.id) return true;
      if (igName && matchesHandle({ ...account, name: igName }, resolvedHandle)) return true;
      // se a API não marca integration, mantém (melhor ter sinal do que zero)
      if (!p.integration) return true;
      return false;
    });

    const sorted = [...forAccount].sort((a, b) => {
      const da = postDateIso(a) || '';
      const db = postDateIso(b) || '';
      return db.localeCompare(da);
    });

    const recentPosts: ProfilePostSummary[] = sorted.slice(0, maxPosts).map((p) => ({
      date: postDateIso(p),
      content: postText(p),
      state: String(p.state || p.status || ''),
      url: typeof p.releaseURL === 'string' ? p.releaseURL : undefined,
    }));

    const accountName = account.name || resolvedHandle;
    const promptBlock = buildPromptBlock({
      handle: resolvedHandle,
      accountName,
      posts: recentPosts,
    });

    return {
      configured: true,
      handle: resolvedHandle,
      accountName,
      integrationId: account.id,
      identifier: account.identifier,
      postsAnalyzed: recentPosts.length,
      recentPosts,
      promptBlock,
      notice:
        recentPosts.length === 0
          ? `Conta @${resolvedHandle} conectada, mas sem posts no intervalo de ${days} dias no Postiz.`
          : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro ao ler Postiz';
    return {
      configured: true,
      handle,
      accountName: handle,
      postsAnalyzed: 0,
      recentPosts: [],
      promptBlock: '',
      notice: `Falha ao ler Instagram autorizado: ${msg}`,
    };
  }
}
