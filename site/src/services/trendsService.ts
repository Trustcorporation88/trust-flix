/**
 * Cliente para o sinal de tendências (trendsmcp — tiktok-trends-api).
 * https://github.com/trendsmcp/tiktok-trends-api
 *
 * Fornece volume/crescimento de hashtags de forma oficial (sem scraping).
 * Requer TRENDSMCP_API_KEY.
 */
import axios from 'axios';

const apiKey = process.env.TRENDSMCP_API_KEY || '';
const baseURL = process.env.TRENDSMCP_API_URL || 'https://api.trendsmcp.ai/v1';

const client = axios.create({
  baseURL,
  headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  timeout: 10000,
});

export interface TrendHashtag {
  hashtag: string;
  volume: number;
  growthPercent: number;
}

export const trendsService = {
  isConfigured(): boolean {
    return Boolean(apiKey);
  },

  /** Busca hashtags em alta para uma palavra-chave/nicho */
  async getTrendingHashtags(keyword: string): Promise<TrendHashtag[]> {
    if (!apiKey) return [];
    try {
      const { data } = await client.get('/hashtags/trending', { params: { q: keyword } });
      return data?.hashtags || [];
    } catch (error) {
      console.error('Erro ao buscar tendências:', error);
      return [];
    }
  },

  /**
   * Calcula um score de 0-100 para um conjunto de tags de um template,
   * combinando volume e crescimento das hashtags relacionadas.
   */
  scoreTags(tags: string[], trending: TrendHashtag[]): number {
    if (trending.length === 0) return 50; // score neutro sem dados de tendência
    const matched = trending.filter((t) =>
      tags.some((tag) => t.hashtag.toLowerCase().includes(tag.toLowerCase()))
    );
    if (matched.length === 0) return 40;
    const avgGrowth = matched.reduce((sum, t) => sum + t.growthPercent, 0) / matched.length;
    return Math.max(0, Math.min(100, Math.round(60 + avgGrowth)));
  },
};
