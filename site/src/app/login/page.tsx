'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/lib/store/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent-500/20 blur-[120px]" />

      <div className="card-surface relative w-full max-w-md p-8">
        <div className="mb-8 flex justify-center">
          <img src="/logo.png" alt="Social Flow" className="h-20 w-20 rounded-xl object-contain" />
        </div>

        {/* Toggle Tabs */}
        <div className="mb-8 flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={clsx(
              'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
              !isRegister ? 'bg-white/[0.08] text-white' : 'text-ink-400 hover:text-ink-200'
            )}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={clsx(
              'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
              isRegister ? 'bg-white/[0.08] text-white' : 'text-ink-400 hover:text-ink-200'
            )}
          >
            Criar Conta
          </button>
        </div>

        <h1 className="mb-1 text-center font-display text-2xl font-bold text-white">
          {isRegister ? 'Criar Conta' : 'Bem-vindo de volta'}
        </h1>
        <p className="mb-8 text-center text-sm text-ink-300">
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
                className="input-dark"
                required
              />
              <input
                type="tel"
                placeholder="Telefone (opcional)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-dark"
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input-dark"
            required
          />

          <input
            type="password"
            placeholder="Senha"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="input-dark"
            required
          />

          <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:opacity-60">
            {isLoading ? 'Processando...' : isRegister ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm font-semibold text-accent-300 hover:text-accent-200"
          >
            {isRegister ? 'Já tem conta? Faça login' : 'Não tem conta? Crie uma'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          Ao continuar, você concorda com nossos{' '}
          <Link href="/terms" className="text-accent-300 hover:text-accent-200">
            Termos
          </Link>
          {' e '}
          <Link href="/privacy" className="text-accent-300 hover:text-accent-200">
            Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
}
