import { apiClient } from './apiClient';
import { Product, PaginationParams } from '@/types';

export const productService = {
  async getAll(params?: PaginationParams) {
    return apiClient.getPaginated<Product>('/api/products', {
      page: params?.page || 1,
      limit: params?.limit || 10,
      sortBy: params?.sortBy || 'createdAt',
      sortOrder: params?.sortOrder || 'desc',
    });
  },

  async getById(id: string) {
    return apiClient.get<Product>(`/api/products/${id}`);
  },

  async getBySlug(slug: string) {
    return apiClient.get<Product>(`/api/products/slug/${slug}`);
  },

  async search(query: string) {
    return apiClient.get<Product[]>(`/api/products/search?q=${query}`);
  },

  async getByCategory(category: string, params?: PaginationParams) {
    return apiClient.getPaginated<Product>(`/api/products/category/${category}`, {
      page: params?.page || 1,
      limit: params?.limit || 10,
    });
  },

  async create(data: Partial<Product>) {
    return apiClient.post<Product>('/api/admin/products', data);
  },

  async update(id: string, data: Partial<Product>) {
    return apiClient.put<Product>(`/api/admin/products/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/api/admin/products/${id}`);
  },

  async updateStock(id: string, quantity: number) {
    return apiClient.patch<Product>(`/api/admin/products/${id}/stock`, { quantity });
  },
};
