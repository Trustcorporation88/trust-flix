import { apiClient } from './apiClient';
import { Campaign, PaginationParams } from '@/types';

export const campaignService = {
  async getAll(params?: PaginationParams) {
    return apiClient.getPaginated<Campaign>('/api/admin/campaigns', {
      page: params?.page || 1,
      limit: params?.limit || 10,
      sortBy: params?.sortBy || 'createdAt',
      sortOrder: params?.sortOrder || 'desc',
    });
  },

  async getById(id: string) {
    return apiClient.get<Campaign>(`/api/admin/campaigns/${id}`);
  },

  async create(data: Partial<Campaign>) {
    return apiClient.post<Campaign>('/api/admin/campaigns', data);
  },

  async update(id: string, data: Partial<Campaign>) {
    return apiClient.put<Campaign>(`/api/admin/campaigns/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/api/admin/campaigns/${id}`);
  },

  async start(id: string) {
    return apiClient.patch<Campaign>(`/api/admin/campaigns/${id}/start`, {});
  },

  async pause(id: string) {
    return apiClient.patch<Campaign>(`/api/admin/campaigns/${id}/pause`, {});
  },

  async getStats(id: string) {
    return apiClient.get(`/api/admin/campaigns/${id}/stats`);
  },

  async sendTest(id: string, recipient: string) {
    return apiClient.post(`/api/admin/campaigns/${id}/test`, { recipient });
  },
};
