import { useEffect } from 'react';
import { useAuth } from '@/lib/store/authStore';
import { apiClient } from '@/services/apiClient';
import { User } from '@/types';

export function useAuthInit() {
  const { setUser, logout, setLoading } = useAuth();

  useEffect(() => {
    async function init() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          logout();
          return;
        }

        const response = await apiClient.get<User>('/api/auth/me');
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          localStorage.removeItem('token');
          logout();
        }
      } catch {
        localStorage.removeItem('token');
        logout();
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
