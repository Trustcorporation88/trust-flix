import { apiClient } from './apiClient';
import { Lead, PaginationParams } from '@/types';

export const leadService = {
  async getAll(params?: PaginationParams) {
    return apiClient.getPaginated<Lead>('/api/admin/leads', {
      page: params?.page || 1,
      limit: params?.limit || 10,
      sortBy: params?.sortBy || 'createdAt',
      sortOrder: params?.sortOrder || 'desc',
    });
  },

  async getById(id: string) {
    return apiClient.get<Lead>(`/api/admin/leads/${id}`);
  },

  async create(data: Partial<Lead>) {
    return apiClient.post<Lead>('/api/leads', data);
  },

  async update(id: string, data: Partial<Lead>) {
    return apiClient.put<Lead>(`/api/admin/leads/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/api/admin/leads/${id}`);
  },

  async updateStatus(id: string, status: Lead['status']) {
    return apiClient.patch<Lead>(`/api/admin/leads/${id}/status`, { status });
  },

  async importLeads(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm<{ success: boolean; imported: number }>(
      '/api/admin/leads/import',
      formData
    );
  },

  async getStats() {
    return apiClient.get('/api/admin/leads/stats');
  },
};
