import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse, PaginatedResponse } from '@/types';

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || '') {
    this.client = axios.create({
      baseURL: baseURL || undefined,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Interceptor para erro
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
          const path = window.location.pathname;
          localStorage.removeItem('token');
          if (!path.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string) {
    const response = await this.client.get<ApiResponse<T>>(url);
    return response.data;
  }

  async post<T>(url: string, data: any) {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data;
  }

  async postForm<T>(url: string, formData: FormData) {
    const response = await this.client.post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async put<T>(url: string, data: any) {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data: any) {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T>(url: string) {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data;
  }

  async getPaginated<T>(url: string, params: { page: number; limit: number; [key: string]: any }) {
    const response = await this.client.get<PaginatedResponse<T>>(url, { params });
    return response.data;
  }
}

export const apiClient = new ApiClient();
