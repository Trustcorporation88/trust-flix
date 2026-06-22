import { useEffect } from 'react';
import { useAuth } from '@/lib/store/authStore';
import { apiClient } from '@/services/apiClient';
import { User } from '@/types';

const DEMO_USER: User = {
  id: 'demo',
  email: 'demo@trustflix.com',
  name: 'Conta Demo',
  phone: '',
  role: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function useAuthInit() {
  const { setUser, logout, setLoading } = useAuth();

  useEffect(() => {
    async function init() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          // Modo demo: permite explorar o painel sem login real.
          setUser(DEMO_USER);
          return;
        }

        const response = await apiClient.get<User>('/api/auth/me');
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          setUser(DEMO_USER);
        }
      } catch (error) {
        // Falha de auth não deve bloquear a navegação no modo demo.
        setUser(DEMO_USER);
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // logout mantido disponível para uso externo
  void logout;
}
