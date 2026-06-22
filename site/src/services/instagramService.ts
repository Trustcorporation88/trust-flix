import axios from 'axios';

interface InstagramPost {
  id: string;
  caption: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  imageUrl?: string;
  scheduledFor?: Date;
  status: 'scheduled' | 'published' | 'failed';
}

interface InstagramAccount {
  id: string;
  username: string;
  name: string;
  biography: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profilePictureUrl: string;
}

class InstagramService {
  private accessToken: string;
  private businessAccountId: string;
  private apiVersion = 'v18.0';
  private baseUrl = 'https://graph.instagram.com';

  constructor(accessToken: string, businessAccountId: string) {
    this.accessToken = accessToken;
    this.businessAccountId = businessAccountId;
  }

  /**
   * Obter informações da conta
   */
  async getAccountInfo(): Promise<InstagramAccount> {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${this.businessAccountId}`;
      const response = await axios.get(url, {
        params: {
          fields: 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url',
          access_token: this.accessToken,
        },
      });

      return response.data as InstagramAccount;
    } catch (error) {
      console.error('Erro ao obter info da conta:', error);
      throw error;
    }
  }

  /**
   * Agendar um post de imagem
   */
  async scheduleImagePost(
    imageUrl: string,
    caption: string,
    scheduledFor: Date
  ): Promise<{ id: string; scheduledTime: Date }> {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${this.businessAccountId}/media`;

      // Criar container de mídia
      const containerResponse = await axios.post(url, {
        image_url: imageUrl,
        caption,
        media_type: 'IMAGE',
        scheduled_publish_time: Math.floor(scheduledFor.getTime() / 1000),
        access_token: this.accessToken,
      });

      return {
        id: containerResponse.data.id,
        scheduledTime: scheduledFor,
      };
    } catch (error) {
      console.error('Erro ao agendar post:', error);
      throw error;
    }
  }

  /**
   * Agendar um vídeo
   */
  async scheduleVideoPost(
    videoUrl: string,
    caption: string,
    scheduledFor: Date,
    thumbnail?: string
  ): Promise<{ id: string; scheduledTime: Date }> {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${this.businessAccountId}/media`;

      const containerResponse = await axios.post(url, {
        video_url: videoUrl,
        caption,
        media_type: 'VIDEO',
        scheduled_publish_time: Math.floor(scheduledFor.getTime() / 1000),
        thumbnail_url: thumbnail,
        access_token: this.accessToken,
      });

      return {
        id: containerResponse.data.id,
        scheduledTime: scheduledFor,
      };
    } catch (error) {
      console.error('Erro ao agendar vídeo:', error);
      throw error;
    }
  }

  /**
   * Listar posts agendados
   */
  async listScheduledPosts(): Promise<InstagramPost[]> {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${this.businessAccountId}/media`;
      const response = await axios.get(url, {
        params: {
          fields: 'id,caption,media_type,timestamp,status',
          access_token: this.accessToken,
        },
      });

      return response.data.data.map((post: any) => ({
        id: post.id,
        caption: post.caption,
        media_type: post.media_type,
        status: post.status === 'PUBLISHED' ? 'published' : 'scheduled',
      }));
    } catch (error) {
      console.error('Erro ao listar posts:', error);
      throw error;
    }
  }

  /**
   * Obter analytics de um post
   */
  async getPostAnalytics(postId: string) {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${postId}/insights`;
      const response = await axios.get(url, {
        params: {
          metric: 'engagement,impressions,reach,saved,shares',
          access_token: this.accessToken,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao obter analytics:', error);
      throw error;
    }
  }

  /**
   * Obter insights da conta
   */
  async getAccountInsights() {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${this.businessAccountId}/insights`;
      const response = await axios.get(url, {
        params: {
          metric: 'follower_count,profile_views,reach,impressions',
          period: 'day',
          access_token: this.accessToken,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao obter insights:', error);
      throw error;
    }
  }

  /**
   * Enviar DM automático
   */
  async sendAutoMessage(conversationId: string, message: string) {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${conversationId}/messages`;
      const response = await axios.post(url, {
        message,
        access_token: this.accessToken,
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  /**
   * Cancelar post agendado
   */
  async cancelScheduledPost(postId: string) {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${postId}`;
      await axios.delete(url, {
        params: {
          access_token: this.accessToken,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao cancelar post:', error);
      throw error;
    }
  }

  /**
   * Obter hashtags recomendadas
   */
  async getRecommendedHashtags(keyword: string, limit = 10) {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/ig_hashtag_search`;
      const response = await axios.get(url, {
        params: {
          user_id: this.businessAccountId,
          fields: 'id,name',
          search_string: keyword,
          access_token: this.accessToken,
        },
      });

      return response.data.data.slice(0, limit);
    } catch (error) {
      console.error('Erro ao obter hashtags:', error);
      throw error;
    }
  }
}

export const createInstagramService = (accessToken: string, businessAccountId: string) => {
  return new InstagramService(accessToken, businessAccountId);
};
