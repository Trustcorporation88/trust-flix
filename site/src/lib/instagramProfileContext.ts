/**
 * Contexto do Instagram autorizado (Postiz + Graph opcional).
 *
 * Monitora:
 *  - Feed (posts/carrossel)
 *  - Reels
 *  - Stories (quando o Postiz/Graph expõe)
 *  - Mídias anexadas (URLs de imagem/vídeo já salvas no Postiz)
 *
 * "Coleção Salvos" do app Instagram (bookmark pessoal) NÃO é exposta pela
 * Graph API de conta business — se o usuário quiser isso, precisa Graph com
 * permissões extras ou export manual. Aqui usamos as mídias já publicadas/
 * agendadas na conta autorizada.
 *
 * Default: @cyntiarinaldidoces
 */
import {
  postizService,
  isInstagramIntegration,
  type PostizIntegration,
  type PostizPost,
} from '@/services/postizService';

export const DEFAULT_IG_HANDLE =
  (process.env.COPILOT_DEFAULT_IG_HANDLE || 'cyntiarinaldidoces').replace(/^@/, '').toLowerCase();

export type ContentKind = 'reel' | 'story' | 'feed' | 'carousel' | 'unknown';

export interface ProfileMediaItem {
  url: string;
  kind: 'image' | 'video' | 'unknown';
}

export interface ProfilePostSummary {
  date?: string;
  content: string;
  state?: string;
  url?: string;
  kind: ContentKind;
  media: ProfileMediaItem[];
}

export interface InstagramProfileContext {
  configured: boolean;
  handle: string;
  accountName: string;
  integrationId?: string;
  identifier?: string;
  postsAnalyzed: number;
  reelsAnalyzed: number;
  storiesAnalyzed: number;
  feedAnalyzed: number;
  mediaCount: number;
  recentPosts: ProfilePostSummary[];
  /** Texto pronto para injetar no system prompt do Copilot. */
  promptBlock: string;
  /** Aviso curto se algo falhou (Postiz off, conta não achada, etc.). */
  notice?: string;
  graphUsed?: boolean;
}

function normalizeHandle(raw?: string): string {
  return String(raw || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function postText(post: PostizPost): string {
  if (typeof post.content === 'string' && post.content.trim()) return post.content.trim();
  const row = post as Record<string, unknown>;
  const value = row.value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const rec = asRecord(item);
      if (rec && typeof rec.content === 'string' && rec.content.trim()) {
        return rec.content.trim();
      }
    }
  }
  // alguns payloads aninham posts: [{ value: [{ content }] }]
  const nestedPosts = row.posts;
  if (Array.isArray(nestedPosts)) {
    for (const np of nestedPosts) {
      const npr = asRecord(np);
      if (!npr) continue;
      if (typeof npr.content === 'string' && npr.content.trim()) return npr.content.trim();
      const nv = npr.value;
      if (Array.isArray(nv)) {
        for (const item of nv) {
          const rec = asRecord(item);
          if (rec && typeof rec.content === 'string' && rec.content.trim()) {
            return rec.content.trim();
          }
        }
      }
    }
  }
  const settings = asRecord(row.settings);
  if (settings && typeof settings.caption === 'string') return settings.caption.trim();
  if (typeof row.caption === 'string' && row.caption.trim()) return row.caption.trim();
  if (typeof row.text === 'string' && row.text.trim()) return row.text.trim();
  if (typeof row.message === 'string' && row.message.trim()) return row.message.trim();
  return '';
}

function postDateIso(post: PostizPost): string | undefined {
  const raw = post.publishDate || post.date;
  if (!raw || typeof raw !== 'string') return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function looksLikeMediaUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (/\.(jpg|jpeg|png|webp|gif|mp4|mov|m4v|webm)(\?|$)/i.test(url)) return true;
  // CDNs do Postiz / S3 / Instagram CDN costumam não ter extensão limpa
  if (/cloudfront|s3\.|postiz|cdninstagram|fbcdn|instagram\.com\/.*\.(jpg|mp4)/i.test(url)) {
    return true;
  }
  return /\/media\/|\/upload\/|\/image|\/video/i.test(url);
}

function mediaKindFromUrl(url: string): ProfileMediaItem['kind'] {
  if (/\.(mp4|mov|m4v|webm)(\?|$)/i.test(url)) return 'video';
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url)) return 'image';
  if (/video|reel/i.test(url)) return 'video';
  return 'unknown';
}

function pushMedia(out: ProfileMediaItem[], url: unknown) {
  if (typeof url !== 'string' || !url.trim()) return;
  const u = url.trim();
  if (!looksLikeMediaUrl(u) && !/^https?:\/\//i.test(u)) return;
  if (!/^https?:\/\//i.test(u)) return;
  if (out.some((m) => m.url === u)) return;
  out.push({ url: u, kind: mediaKindFromUrl(u) });
}

function extractMedia(post: PostizPost): ProfileMediaItem[] {
  const out: ProfileMediaItem[] = [];
  const row = post as Record<string, unknown>;

  // formatos comuns Postiz
  const value = row.value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const rec = asRecord(item);
      if (!rec) continue;
      const image = rec.image;
      if (Array.isArray(image)) {
        for (const img of image) {
          const ir = asRecord(img);
          if (!ir) continue;
          pushMedia(out, ir.path);
          pushMedia(out, ir.url);
          pushMedia(out, ir.media);
        }
      }
      pushMedia(out, rec.image);
      pushMedia(out, rec.media);
      pushMedia(out, rec.url);
    }
  }

  const media = row.media;
  if (Array.isArray(media)) {
    for (const m of media) {
      if (typeof m === 'string') pushMedia(out, m);
      const mr = asRecord(m);
      if (mr) {
        pushMedia(out, mr.path);
        pushMedia(out, mr.url);
      }
    }
  }

  pushMedia(out, row.image);
  pushMedia(out, row.video);
  pushMedia(out, row.thumbnail);
  pushMedia(out, row.picture);

  const settings = asRecord(row.settings);
  if (settings) {
    pushMedia(out, settings.image);
    pushMedia(out, settings.video);
  }

  // posts: [{ value: [{ image: [{path,url}] }] }]
  const nestedPosts = row.posts;
  if (Array.isArray(nestedPosts)) {
    for (const np of nestedPosts) {
      const npr = asRecord(np);
      if (!npr) continue;
      const nv = npr.value;
      if (Array.isArray(nv)) {
        for (const item of nv) {
          const rec = asRecord(item);
          if (!rec) continue;
          const image = rec.image;
          if (Array.isArray(image)) {
            for (const img of image) {
              const ir = asRecord(img);
              if (!ir) continue;
              pushMedia(out, ir.path);
              pushMedia(out, ir.url);
            }
          }
          pushMedia(out, rec.image);
          pushMedia(out, rec.url);
        }
      }
      pushMedia(out, npr.image);
      pushMedia(out, npr.video);
    }
  }

  // varredura rasa de qualquer string https no objeto (último recurso)
  if (out.length === 0) {
    const stack: unknown[] = [row];
    let guard = 0;
    while (stack.length && guard < 80) {
      guard++;
      const cur = stack.pop();
      if (typeof cur === 'string') {
        if (/^https?:\/\//i.test(cur)) pushMedia(out, cur);
        continue;
      }
      if (Array.isArray(cur)) {
        for (const x of cur.slice(0, 20)) stack.push(x);
        continue;
      }
      const rec = asRecord(cur);
      if (!rec) continue;
      for (const [k, v] of Object.entries(rec)) {
        if (['path', 'url', 'media', 'image', 'video', 'thumbnail', 'picture', 'media_url', 'permalink'].includes(k)) {
          stack.push(v);
        } else if (k === 'value' || k === 'posts' || k === 'children' || k === 'image') {
          stack.push(v);
        }
      }
    }
  }

  return out;
}

function classifyKind(post: PostizPost, media: ProfileMediaItem[]): ContentKind {
  const row = post as Record<string, unknown>;
  const settings = asRecord(row.settings) || {};
  const blob = [
    row.state,
    row.status,
    row.type,
    row.postType,
    settings.post_type,
    settings.postType,
    settings.__type,
    post.releaseURL,
    post.content,
  ]
    .map((x) => String(x || '').toLowerCase())
    .join(' ');

  if (/\bstory|stories\b/.test(blob) || settings.post_type === 'story') return 'story';
  if (/\breel|reels|trial_reel|is_trial_reel\b/.test(blob)) return 'reel';
  if (/\bcarousel|album\b/.test(blob)) return 'carousel';

  // heurística: 1 vídeo e legenda curta / URL de reel
  const videos = media.filter((m) => m.kind === 'video');
  const images = media.filter((m) => m.kind === 'image');
  if (videos.length === 1 && images.length <= 1) {
    // no Postiz, Reel costuma ser post com 1 vídeo
    if (/instagram\.com\/reel\//i.test(String(post.releaseURL || ''))) return 'reel';
    // se settings diz post e tem video único, trata como reel (padrão IG)
    if (String(settings.post_type || 'post') === 'post' && videos.length === 1) return 'reel';
  }
  if (images.length >= 2) return 'carousel';
  if (images.length >= 1 && videos.length === 0) return 'feed';
  if (videos.length >= 1) return 'reel';
  // Postiz costuma devolver legenda sem mídia/tipo. Se tem conteúdo publicado,
  // conta como FEED — nunca deixar "unknown" zerar o badge.
  const hasText = Boolean(String(post.content || postText(post) || '').trim());
  if (hasText || media.length || post.releaseURL) return 'feed';
  return 'feed';
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
  if (ig.length === 1) return ig[0];
  const def = ig.find((i) => matchesHandle(i, DEFAULT_IG_HANDLE));
  return def || ig[0];
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function kindLabel(k: ContentKind): string {
  switch (k) {
    case 'reel':
      return 'REEL';
    case 'story':
      return 'STORY';
    case 'carousel':
      return 'CARROSSEL';
    case 'feed':
      return 'FEED';
    default:
      return 'POST';
  }
}

function buildPromptBlock(opts: {
  handle: string;
  accountName: string;
  posts: ProfilePostSummary[];
  graphUsed?: boolean;
  savedNote?: string;
}): string {
  const lines: string[] = [];
  const reels = opts.posts.filter((p) => p.kind === 'reel');
  const stories = opts.posts.filter((p) => p.kind === 'story');
  const feed = opts.posts.filter((p) => p.kind === 'feed' || p.kind === 'carousel');
  const mediaTotal = opts.posts.reduce((n, p) => n + p.media.length, 0);

  lines.push(`PERFIL INSTAGRAM AUTORIZADO: @${opts.handle}`);
  lines.push(`Nome da conta conectada: ${opts.accountName}`);
  lines.push(
    `Cobertura: ${reels.length} Reels · ${stories.length} Stories · ${feed.length} Feed/Carrossel · ${mediaTotal} mídias com URL`
  );
  if (opts.graphUsed) {
    lines.push('Fonte extra: Instagram Graph API (mídia publicada da conta business).');
  }
  lines.push(
    'Use este perfil como BASE DE VERDADE: tom, temas, produtos, estética visual e ritmo.'
  );
  lines.push(
    'NÃO invente posts/reels/stories que não estejam abaixo. Se faltar tipo (ex: zero stories), diga.'
  );
  if (opts.savedNote) lines.push(opts.savedNote);

  if (opts.posts.length === 0) {
    lines.push('Nenhum conteúdo recente encontrado no Postiz/Graph para análise.');
    return lines.join('\n');
  }

  const sections: Array<{ title: string; items: ProfilePostSummary[] }> = [
    { title: 'REELS', items: reels },
    { title: 'STORIES', items: stories },
    { title: 'FEED / CARROSSEL', items: feed },
    {
      title: 'OUTROS',
      items: opts.posts.filter((p) => !['reel', 'story', 'feed', 'carousel'].includes(p.kind)),
    },
  ];

  for (const sec of sections) {
    if (!sec.items.length) continue;
    lines.push('');
    lines.push(`### ${sec.title} (${sec.items.length})`);
    sec.items.slice(0, 12).forEach((p, i) => {
      const date = p.date ? p.date.slice(0, 10) : 'sem data';
      const state = p.state ? ` [${p.state}]` : '';
      const body = p.content.length > 220 ? `${p.content.slice(0, 220)}…` : p.content;
      lines.push(`${i + 1}. [${kindLabel(p.kind)}] ${date}${state}`);
      lines.push(`   ${body || '(sem legenda)'}`);
      if (p.url) lines.push(`   link: ${p.url}`);
      if (p.media.length) {
        const shown = p.media.slice(0, 3);
        for (const m of shown) {
          lines.push(`   mídia(${m.kind}): ${m.url}`);
        }
        if (p.media.length > 3) lines.push(`   … +${p.media.length - 3} mídias`);
      }
    });
  }

  lines.push('');
  lines.push('Ao gerar ideias:');
  lines.push('- misture formatos: pelo menos 1 Reel + 1 ideia de Story + 1 Feed quando fizer sentido');
  lines.push('- descreva o visual com base nas mídias (cores, produto, enquadramento) quando houver URL');
  lines.push('- continue a identidade do perfil; não copie legenda literal — reescreva');
  lines.push('- se for doces/confeitaria, seja sensorial e concreto');
  return lines.join('\n');
}

/** Graph API opcional: lista mídia publicada (inclui Reels via media_product_type). */
async function fetchGraphMedia(opts: {
  accessToken: string;
  businessAccountId: string;
  limit?: number;
}): Promise<ProfilePostSummary[]> {
  const limit = opts.limit ?? 30;
  const fields = [
    'id',
    'caption',
    'media_type',
    'media_product_type',
    'media_url',
    'thumbnail_url',
    'permalink',
    'timestamp',
    'children{media_type,media_url,thumbnail_url}',
  ].join(',');

  const url = new URL(
    `https://graph.facebook.com/v19.0/${opts.businessAccountId}/media`
  );
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', opts.accessToken);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph media (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    data?: Array<Record<string, unknown>>;
  };
  const rows = Array.isArray(data.data) ? data.data : [];

  return rows.map((row) => {
    const media: ProfileMediaItem[] = [];
    pushMedia(media, row.media_url);
    pushMedia(media, row.thumbnail_url);
    const children = asRecord(row.children);
    const childData = children && Array.isArray(children.data) ? children.data : [];
    for (const c of childData) {
      const cr = asRecord(c);
      if (!cr) continue;
      pushMedia(media, cr.media_url);
      pushMedia(media, cr.thumbnail_url);
    }

    const product = String(row.media_product_type || '').toUpperCase();
    const mtype = String(row.media_type || '').toUpperCase();
    let kind: ContentKind = 'feed';
    if (product === 'REELS' || product === 'CLIPS') kind = 'reel';
    else if (product === 'STORY') kind = 'story';
    else if (mtype === 'CAROUSEL_ALBUM') kind = 'carousel';
    else if (mtype === 'VIDEO' && product === 'FEED') kind = 'feed';
    else if (mtype === 'VIDEO') kind = 'reel';
    else if (mtype === 'IMAGE') kind = 'feed';

    const ts = typeof row.timestamp === 'string' ? row.timestamp : undefined;
    return {
      date: ts,
      content: typeof row.caption === 'string' ? row.caption : '',
      state: 'GRAPH',
      url: typeof row.permalink === 'string' ? row.permalink : undefined,
      kind,
      media,
    } satisfies ProfilePostSummary;
  });
}

/** Stories ativos (24h) via Graph — best effort. */
async function fetchGraphStories(opts: {
  accessToken: string;
  businessAccountId: string;
}): Promise<ProfilePostSummary[]> {
  const fields = ['id', 'media_type', 'media_url', 'thumbnail_url', 'timestamp', 'permalink'].join(
    ','
  );
  const url = new URL(
    `https://graph.facebook.com/v19.0/${opts.businessAccountId}/stories`
  );
  url.searchParams.set('fields', fields);
  url.searchParams.set('access_token', opts.accessToken);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    // stories costuma falhar sem permissão — silencioso
    return [];
  }
  const data = (await res.json()) as { data?: Array<Record<string, unknown>> };
  const rows = Array.isArray(data.data) ? data.data : [];
  return rows.map((row) => {
    const media: ProfileMediaItem[] = [];
    pushMedia(media, row.media_url);
    pushMedia(media, row.thumbnail_url);
    return {
      date: typeof row.timestamp === 'string' ? row.timestamp : undefined,
      content: '',
      state: 'STORY_LIVE',
      url: typeof row.permalink === 'string' ? row.permalink : undefined,
      kind: 'story' as const,
      media,
    };
  });
}

function mergePosts(a: ProfilePostSummary[], b: ProfilePostSummary[]): ProfilePostSummary[] {
  const out: ProfilePostSummary[] = [];
  const seen = new Set<string>();
  for (const p of [...a, ...b]) {
    const key = `${p.url || ''}|${p.date || ''}|${p.content.slice(0, 40)}|${p.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  out.sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
  return out;
}

/**
 * Carrega contexto do Instagram conectado no Postiz (+ Graph se configurado).
 * Best-effort: nunca lança — devolve notice se algo faltar.
 */
/** Achata payloads do Postiz que vêm como grupos / posts aninhados. */
function flattenPostizPayload(posts: PostizPost[]): PostizPost[] {
  const out: PostizPost[] = [];
  for (const p of posts) {
    const row = p as Record<string, unknown>;
    const nested = row.posts;
    if (Array.isArray(nested) && nested.length && !postText(p) && !extractMedia(p).length) {
      for (const n of nested) {
        if (n && typeof n === 'object') out.push(n as PostizPost);
      }
      continue;
    }
    out.push(p);
  }
  return out;
}

export async function loadInstagramProfileContext(opts?: {
  handle?: string;
  days?: number;
  maxPosts?: number;
}): Promise<InstagramProfileContext> {
  const handle = normalizeHandle(opts?.handle) || DEFAULT_IG_HANDLE;
  const days = opts?.days ?? 180;
  const maxPosts = opts?.maxPosts ?? 40;

  const empty = (
    partial: Partial<InstagramProfileContext> & { notice?: string }
  ): InstagramProfileContext => ({
    configured: partial.configured ?? false,
    handle: partial.handle || handle,
    accountName: partial.accountName || handle,
    integrationId: partial.integrationId,
    identifier: partial.identifier,
    postsAnalyzed: partial.postsAnalyzed ?? 0,
    reelsAnalyzed: partial.reelsAnalyzed ?? 0,
    storiesAnalyzed: partial.storiesAnalyzed ?? 0,
    feedAnalyzed: partial.feedAnalyzed ?? 0,
    mediaCount: partial.mediaCount ?? 0,
    recentPosts: partial.recentPosts || [],
    promptBlock: partial.promptBlock || '',
    notice: partial.notice,
    graphUsed: partial.graphUsed,
  });

  if (!postizService.isConfigured()) {
    // ainda tenta Graph sozinho
  }

  let account: PostizIntegration | undefined;
  let resolvedHandle = handle;
  let accountName = handle;
  let postizPosts: ProfilePostSummary[] = [];
  let postizNotice: string | undefined;

  if (postizService.isConfigured()) {
    try {
      const integrations = await postizService.listIntegrations();
      account = pickInstagramAccount(integrations, handle);

      if (!account) {
        postizNotice = `Nenhuma conta Instagram conectada no Postiz para @${handle}.`;
      } else {
        resolvedHandle =
          normalizeHandle(account.profile) ||
          normalizeHandle(account.name).replace(/\s+/g, '') ||
          handle;
        accountName = account.name || resolvedHandle;

        const start = daysAgoIso(days);
        const end = new Date().toISOString();
        let posts: PostizPost[] = [];
        try {
          posts = await postizService.listPosts(start, end);
        } catch {
          posts = [];
        }

        // Algumas instâncias devolvem agrupado; achata 1 nível.
        posts = flattenPostizPayload(posts);

        const forAccount = posts.filter((p) => {
          const igId = p.integration?.id;
          const igName = String(p.integration?.name || '').toLowerCase();
          if (igId && account?.id && igId === account.id) return true;
          if (igName && account && matchesHandle({ ...account, name: igName }, resolvedHandle)) {
            return true;
          }
          if (!p.integration) return true;
          return false;
        });

        postizPosts = forAccount.map((p) => {
          const media = extractMedia(p);
          return {
            date: postDateIso(p),
            content: postText(p),
            state: String(p.state || p.status || ''),
            url: typeof p.releaseURL === 'string' ? p.releaseURL : undefined,
            kind: classifyKind(p, media),
            media,
          };
        });
      }
    } catch (err) {
      postizNotice = `Falha Postiz: ${err instanceof Error ? err.message : 'erro'}`;
    }
  } else {
    postizNotice =
      'Postiz não configurado — tentando só Graph API se houver token.';
  }

  // Graph opcional
  let graphPosts: ProfilePostSummary[] = [];
  let graphUsed = false;
  let graphNotice: string | undefined;
  const graphToken =
    process.env.INSTAGRAM_ACCESS_TOKEN ||
    process.env.IG_ACCESS_TOKEN ||
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    '';
  const graphUser =
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ||
    process.env.IG_BUSINESS_ACCOUNT_ID ||
    process.env.INSTAGRAM_ACCOUNT_ID ||
    '';

  if (graphToken && graphUser) {
    try {
      const [media, stories] = await Promise.all([
        fetchGraphMedia({
          accessToken: graphToken,
          businessAccountId: graphUser,
          limit: Math.min(50, maxPosts),
        }),
        fetchGraphStories({ accessToken: graphToken, businessAccountId: graphUser }),
      ]);
      graphPosts = mergePosts(media, stories);
      graphUsed = graphPosts.length > 0;
      if (!graphUsed) {
        graphNotice =
          'Graph respondeu sem mídia. Confira se INSTAGRAM_BUSINESS_ACCOUNT_ID é o id de instagram_business_account (não o id da Page) e se o token é da Page correta.';
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falhou';
      graphNotice = `Graph API falhou: ${msg.slice(0, 180)}`;
    }
  } else if (graphToken && !graphUser) {
    graphNotice = 'INSTAGRAM_ACCESS_TOKEN presente, mas falta INSTAGRAM_BUSINESS_ACCOUNT_ID.';
  } else if (!graphToken && graphUser) {
    graphNotice = 'INSTAGRAM_BUSINESS_ACCOUNT_ID presente, mas falta INSTAGRAM_ACCESS_TOKEN.';
  }

  const merged = mergePosts(postizPosts, graphPosts).slice(0, maxPosts);
  const reelsAnalyzed = merged.filter((p) => p.kind === 'reel').length;
  const storiesAnalyzed = merged.filter((p) => p.kind === 'story').length;
  const feedAnalyzed = merged.filter((p) => p.kind === 'feed' || p.kind === 'carousel').length;
  const mediaCount = merged.reduce((n, p) => n + p.media.length, 0);

  const savedNote =
    'Nota: a coleção "Salvos" (bookmarks) do app Instagram não é exposta pela API business. ' +
    'As mídias listadas são as publicadas/agendadas na conta autorizada (Postiz/Graph), incluindo imagens e vídeos anexados.';

  const notices = [postizNotice, graphNotice].filter(Boolean);
  if (merged.length === 0) {
    notices.push(
      `Sem Reels/Stories/Feed no intervalo de ${days} dias. Confira se o Postiz lista o histórico ou se INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID estão na Vercel.`
    );
  }

  const promptBlock =
    merged.length || account
      ? buildPromptBlock({
          handle: resolvedHandle,
          accountName,
          posts: merged,
          graphUsed,
          savedNote,
        })
      : '';

  return empty({
    configured: postizService.isConfigured() || Boolean(graphToken && graphUser),
    handle: resolvedHandle,
    accountName,
    integrationId: account?.id,
    identifier: account?.identifier,
    postsAnalyzed: merged.length,
    reelsAnalyzed,
    storiesAnalyzed,
    feedAnalyzed,
    mediaCount,
    recentPosts: merged,
    promptBlock,
    notice: notices.length ? notices.join(' ') : undefined,
    graphUsed,
  });
}
