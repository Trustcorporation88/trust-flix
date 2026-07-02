/**
 * Cliente para a Public API do Postiz (motor de agendamento/publicação multi-tenant).
 * Docs: https://docs.postiz.com/public-api/introduction
 *
 * Requer as variáveis de ambiente:
 *   POSTIZ_API_URL  (ex: https://insta.trustcorp.com.br/api/public/v1)
 *   POSTIZ_API_KEY
 */
import axios from 'axios';

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

export const postizService = {
  /** Lista os clientes/tenants (multi-tenant nativo do Postiz) */
  async listGroups(): Promise<PostizGroup[]> {
    assertConfigured();
    const { data } = await client.get('/groups');
    return data;
  },

  /** Lista as contas conectadas (Instagram/TikTok/etc), opcionalmente filtradas por cliente */
  async listIntegrations(groupId?: string): Promise<PostizIntegration[]> {
    assertConfigured();
    const { data } = await client.get('/integrations', {
      params: groupId ? { customer: groupId } : undefined,
    });
    return data;
  },

  /**
   * Gera a URL de OAuth para o cliente conectar uma nova conta (Instagram ou TikTok).
   * `platform` deve ser o identificador de integração usado pelo Postiz (ex: 'instagram', 'tiktok').
   */
  async getConnectUrl(platform: string, groupId: string): Promise<{ url: string }> {
    assertConfigured();
    const { data } = await client.post(`/integrations/${platform}/connect`, { customer: groupId });
    return data;
  },

  /** Cria/agenda uma publicação para uma ou mais contas conectadas */
  async createPost(payload: CreatePostPayload) {
    assertConfigured();
    const { data } = await client.post('/posts', {
      type: payload.scheduledFor ? 'schedule' : 'now',
      date: payload.scheduledFor,
      content: payload.content,
      integrations: payload.integrationIds,
      media: payload.mediaUrls,
      customer: payload.groupId,
    });
    return data;
  },

  /** Métricas de performance de uma conta/post conectado */
  async getAnalytics(integrationId: string) {
    assertConfigured();
    const { data } = await client.get(`/analytics/${integrationId}`);
    return data;
  },

  /** Indica se a integração com o Postiz está configurada neste ambiente */
  isConfigured(): boolean {
    return Boolean(baseURL && apiKey);
  },
};
