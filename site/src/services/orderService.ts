import { apiClient } from './apiClient';
import { Order, PaginationParams } from '@/types';

export const orderService = {
  async getAll(params?: PaginationParams) {
    return apiClient.getPaginated<Order>('/api/orders', {
      page: params?.page || 1,
      limit: params?.limit || 10,
      sortBy: params?.sortBy || 'createdAt',
      sortOrder: params?.sortOrder || 'desc',
    });
  },

  async getById(id: string) {
    return apiClient.get<Order>(`/api/orders/${id}`);
  },

  async create(data: Partial<Order>) {
    return apiClient.post<Order>('/api/orders', data);
  },

  async update(id: string, data: Partial<Order>) {
    return apiClient.put<Order>(`/api/orders/${id}`, data);
  },

  async cancel(id: string, reason: string) {
    return apiClient.patch<Order>(`/api/orders/${id}/cancel`, { reason });
  },

  async updateStatus(id: string, status: Order['status']) {
    return apiClient.patch<Order>(`/api/orders/${id}/status`, { status });
  },

  async getUserOrders() {
    return apiClient.get<Order[]>('/api/orders/user');
  },

  async initializePayment(orderId: string, method: 'pix' | 'mercado_pago' | 'pushinpay') {
    return apiClient.post(`/api/orders/${orderId}/payment/initialize`, { method });
  },

  async checkPaymentStatus(paymentId: string) {
    return apiClient.get(`/api/payments/${paymentId}/status`);
  },
};
