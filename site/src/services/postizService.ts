/**
 * Cliente para a Public API do Postiz (motor de agendamento/publicação multi-tenant).
 * Docs: https://docs.postiz.com/public-api/introduction
 *
 * Requer as variáveis de ambiente:
 *   POSTIZ_API_URL  (ex: https://insta.trustcorp.com.br/api/public/v1)
 *   POSTIZ_API_KEY
 */
import axios, { AxiosError } from 'axios';

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
  platform: string; // 'instagram' | 'tiktok' | ...
  picture?: string;
  customer?: { id: string; name: string };
}

export interface CreatePostPayload {
  groupId: string;
  integrationIds: string[];
  content: string;
  mediaUrls?: string[];
  scheduledFor?: string; // ISO date
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
        params: groupId ? { customer: groupId } : undefined,
      });
      return data;
    });
  },

  /**
   * Gera a URL de OAuth para o cliente conectar uma nova conta (Instagram ou TikTok).
   * `platform` deve ser o identificador de integração usado pelo Postiz (ex: 'instagram', 'tiktok').
   */
  async getConnectUrl(platform: string, groupId: string): Promise<{ url: string }> {
    assertConfigured();
    return withDiagnostics('getConnectUrl', async () => {
      const { data } = await client.post(`/integrations/${platform}/connect`, { customer: groupId });
      return data;
    });
  },

  /** Cria/agenda uma publicação para uma ou mais contas conectadas */
  async createPost(payload: CreatePostPayload) {
    assertConfigured();
    return withDiagnostics('createPost', async () => {
      const { data } = await client.post('/posts', {
        type: payload.scheduledFor ? 'schedule' : 'now',
        date: payload.scheduledFor,
        content: payload.content,
        integrations: payload.integrationIds,
        media: payload.mediaUrls,
        customer: payload.groupId,
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

  /** Indica se a integração com o Postiz está configurada neste ambiente */
  isConfigured(): boolean {
    return Boolean(baseURL && apiKey);
  },
};
