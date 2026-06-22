'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/lib/store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await apiClient.post<{ token: string; user: any }>(endpoint, formData);

      if (response.success) {
        localStorage.setItem('token', response.data?.token || '');
        setUser(response.data?.user);
        toast.success(isRegister ? 'Conta criada com sucesso!' : 'Login realizado!');
        router.push('/dashboard');
      } else {
        toast.error(response.error || 'Erro ao processar requisição');
      }
    } catch (error) {
      toast.error('Erro ao conectar ao servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">
          {isRegister ? 'Criar Conta' : 'Bem-vindo'}
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {isRegister ? 'Crie sua conta para começar' : 'Faça login na sua conta'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <input
                type="text"
                placeholder="Nome Completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="tel"
                placeholder="Telefone (opcional)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <input
            type="password"
            placeholder="Senha"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition-colors"
          >
            {isLoading ? 'Processando...' : isRegister ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            {isRegister ? 'Já tem conta? Faça login' : 'Não tem conta? Crie uma'}
          </button>
        </div>

        <p className="text-center text-gray-600 text-sm mt-4">
          Ao continuar, você concorda com nossos{' '}
          <Link href="/terms" className="text-blue-600 hover:text-blue-700">
            Termos
          </Link>
          {' e '}
          <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
            Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
}
