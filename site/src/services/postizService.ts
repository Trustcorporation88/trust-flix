/**
 * Cliente para a Public API do Postiz (motor de agendamento/publicação multi-tenant).
 * Docs: https://docs.postiz.com/public-api/introduction
 *
 * Requer as variáveis de ambiente:
 *   POSTIZ_API_URL  (ex: https://insta.trustcorp.com.br/api/public/v1)
 *   POSTIZ_API_KEY
 */
import axios, { AxiosError } from 'axios';
import { isInstagramIntegration, isTikTokIntegration } from '@/lib/postizPlatforms';

export { isInstagramIntegration, isTikTokIntegration } from '@/lib/postizPlatforms';

const baseURL = process.env.POSTIZ_API_URL || '';
const apiKey = process.env.POSTIZ_API_KEY || '';

const client = axios.create({
  baseURL,
  headers: {
    Authorization: apiKey,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export interface PostizGroup {
  id: string;
  name: string;
}

export interface PostizIntegration {
  id: string;
  name: string;
  /** Identificador da plataforma retornado pelo Postiz, ex: 'instagram', 'instagram-standalone', 'tiktok' */
  identifier: string;
  picture?: string;
  disabled?: boolean;
  profile?: string;
  customer?: { id: string; name: string };
}

export interface PostizMedia {
  id: string;
  path: string;
}

/** Item retornado por GET /posts (shape flexível — a API self-hosted varia um pouco) */
export interface PostizPost {
  id?: string;
  content?: string;
  state?: string;
  status?: string;
  publishDate?: string;
  releaseURL?: string;
  date?: string;
  integration?: { id?: string; name?: string; identifier?: string; picture?: string };
  [key: string]: unknown;
}

export interface CreatePostPayload {
  /** ID da integração (conta) de destino, retornado por listIntegrations() */
  integrationId: string;
  /** identifier da integração (ex: 'instagram', 'instagram-standalone', 'tiktok') */
  integrationType: string;
  content: string;
  media?: PostizMedia[];
  /** 'post' = feed/Reel (Reel quando ha um unico video), 'story' = Story de 24h — só Instagram */
  postType?: 'post' | 'story';
  scheduledFor?: string; // ISO date; se omitido, publica agora
  /** Overrides do schema TikTok (docs.postiz.com/public-api/providers/tiktok) */
  tiktok?: Partial<TikTokPostSettings>;
}

/** Settings oficiais Postiz para TikTok */
export interface TikTokPostSettings {
  __type: 'tiktok';
  title: string;
  privacy_level: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
  duet: boolean;
  stitch: boolean;
  comment: boolean;
  autoAddMusic: 'yes' | 'no';
  brand_content_toggle: boolean;
  brand_organic_toggle: boolean;
  video_made_with_ai: boolean;
  content_posting_method: 'DIRECT_POST' | 'UPLOAD';
}

function assertConfigured() {
  if (!baseURL || !apiKey) {
    throw new Error(
      'Postiz não configurado. Defina POSTIZ_API_URL e POSTIZ_API_KEY (veja postiz-deploy/README.md).'
    );
  }
}

/**
 * Envolve chamadas axios para expor o corpo/status reais retornados pelo Postiz
 * em vez da mensagem genérica do axios ("Request failed with status code 404").
 * Isso facilita muito o diagnóstico quando a instância self-hosted difere um
 * pouco da API pública documentada.
 */
async function withDiagnostics<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axiosErr.isAxiosError) {
      const status = axiosErr.response?.status;
      const body =
        typeof axiosErr.response?.data === 'string'
          ? axiosErr.response?.data
          : JSON.stringify(axiosErr.response?.data);
      const requestUrl = `${baseURL}${axiosErr.config?.url ?? ''}`;
      throw new Error(
        `Postiz [${label}] falhou (${status ?? 'sem status'}) em ${requestUrl}: ${body ?? axiosErr.message}`
      );
    }
    throw err;
  }
}

/** __type aceito pelas settings do Postiz para contas Instagram */
const INSTAGRAM_TYPES = new Set(['instagram', 'instagram-standalone']);

function buildPostSettings(payload: CreatePostPayload): Record<string, unknown> {
  const type = String(payload.integrationType || '').toLowerCase();

  if (isTikTokIntegration(type)) {
    const defaults: TikTokPostSettings = {
      __type: 'tiktok',
      title: (payload.tiktok?.title || '').slice(0, 90),
      privacy_level: payload.tiktok?.privacy_level || 'PUBLIC_TO_EVERYONE',
      duet: payload.tiktok?.duet ?? true,
      stitch: payload.tiktok?.stitch ?? true,
      comment: payload.tiktok?.comment ?? true,
      autoAddMusic: payload.tiktok?.autoAddMusic || 'no',
      brand_content_toggle: payload.tiktok?.brand_content_toggle ?? false,
      brand_organic_toggle: payload.tiktok?.brand_organic_toggle ?? false,
      video_made_with_ai: payload.tiktok?.video_made_with_ai ?? false,
      content_posting_method: payload.tiktok?.content_posting_method || 'DIRECT_POST',
    };
    return { ...defaults, ...payload.tiktok, __type: 'tiktok' };
  }

  if (INSTAGRAM_TYPES.has(type) || isInstagramIntegration(type)) {
    return {
      __type: INSTAGRAM_TYPES.has(type) ? type : 'instagram',
      post_type: payload.postType || 'post',
      is_trial_reel: false,
    };
  }

  return { __type: payload.integrationType };
}

function normalizeIntegrations(data: unknown): PostizIntegration[] {
  const raw = Array.isArray(data)
    ? data
    : Array.isArray((data as { integrations?: unknown })?.integrations)
      ? (data as { integrations: unknown[] }).integrations
      : Array.isArray((data as { data?: unknown })?.data)
        ? (data as { data: unknown[] }).data
        : [];

  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = String(row.id || row._id || '').trim();
      if (!id) return null;
      return {
        id,
        name: String(row.name || row.profile || 'Conta'),
        identifier: String(row.identifier || row.providerIdentifier || row.provider || '').toLowerCase(),
        picture: typeof row.picture === 'string' ? row.picture : undefined,
        disabled: Boolean(row.disabled),
        profile: typeof row.profile === 'string' ? row.profile : undefined,
        customer:
          row.customer && typeof row.customer === 'object'
            ? (row.customer as PostizIntegration['customer'])
            : undefined,
      } as PostizIntegration;
    })
    .filter(Boolean) as PostizIntegration[];
}

export const postizService = {
  /** Lista os clientes/tenants (multi-tenant nativo do Postiz) */
  async listGroups(): Promise<PostizGroup[]> {
    assertConfigured();
    return withDiagnostics('listGroups', async () => {
      const { data } = await client.get('/groups');
      return data;
    });
  },

  /** Lista as contas conectadas (Instagram/TikTok/etc), opcionalmente filtradas por cliente */
  async listIntegrations(groupId?: string): Promise<PostizIntegration[]> {
    assertConfigured();
    return withDiagnostics('listIntegrations', async () => {
      const { data } = await client.get('/integrations', {
        params: groupId ? { group: groupId } : undefined,
      });
      return normalizeIntegrations(data);
    });
  },

  /**
   * Faz upload de um arquivo de mídia (imagem ou vídeo) para o Postiz e retorna
   * a referência {id, path} usada no campo `image` do post.
   */
  async uploadMedia(file: Blob, filename: string): Promise<PostizMedia> {
    assertConfigured();
    return withDiagnostics('uploadMedia', async () => {
      const form = new FormData();
      form.append('file', file, filename);
      const res = await fetch(`${baseURL.replace(/\/$/, '')}/upload`, {
        method: 'POST',
        headers: { Authorization: apiKey },
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`(${res.status}) ${text}`);
      }
      return res.json();
    });
  },

  /**
   * Cria/agenda uma publicação para uma conta conectada, seguindo o schema oficial
   * da Public API: POST /posts com { type, date, posts: [{ integration, value, settings }] }.
   * Docs: https://docs.postiz.com/public-api/posts/create
   */
  async createPost(payload: CreatePostPayload) {
    assertConfigured();
    return withDiagnostics('createPost', async () => {
      const settings = buildPostSettings(payload);

      const { data } = await client.post('/posts', {
        type: payload.scheduledFor ? 'schedule' : 'now',
        date: payload.scheduledFor || new Date().toISOString(),
        shortLink: false,
        tags: [],
        posts: [
          {
            integration: { id: payload.integrationId },
            value: [{ content: payload.content, image: payload.media || [] }],
            settings,
          },
        ],
      });
      return data;
    });
  },

  /** Métricas de performance de uma conta/post conectado */
  async getAnalytics(integrationId: string) {
    assertConfigured();
    return withDiagnostics('getAnalytics', async () => {
      const { data } = await client.get(`/analytics/${integrationId}`);
      return data;
    });
  },

  /**
   * Lista posts (agendados/publicados/rascunhos) em um intervalo de datas.
   * Docs: GET /posts?startDate=&endDate=
   */
  async listPosts(startDate: string, endDate: string, customer?: string): Promise<PostizPost[]> {
    assertConfigured();
    return withDiagnostics('listPosts', async () => {
      const { data } = await client.get('/posts', {
        params: {
          startDate,
          endDate,
          ...(customer ? { customer } : {}),
        },
      });
      if (Array.isArray(data)) return data as PostizPost[];
      if (Array.isArray(data?.posts)) return data.posts as PostizPost[];
      return [];
    });
  },

  /** Indica se a integração com o Postiz está configurada neste ambiente */
  isConfigured(): boolean {
    return Boolean(baseURL && apiKey);
  },
};
