'use client';

import { useEffect, useState } from 'react';
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
  const [allowRegister, setAllowRegister] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });

  useEffect(() => {
    fetch('/api/auth/register')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.data?.allowRegister === 'boolean') {
          setAllowRegister(data.data.allowRegister);
          if (!data.data.allowRegister) setIsRegister(false);
        }
      })
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await apiClient.post<{ token: string; user: any }>(endpoint, formData);

      if (response.success && response.data?.token) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        toast.success(isRegister ? 'Conta criada!' : 'Login realizado!');
        router.push('/dashboard');
      } else {
        toast.error(response.error || 'Erro ao processar requisição');
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error || error?.message || 'Erro ao conectar ao servidor';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden bg-stone-50 px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
      <div className="card-surface relative w-full max-w-md p-8">
        <div className="mb-8 flex justify-center">
          <img src="/logo.png" alt="SocialFlow" className="h-16 w-16 rounded-lg object-contain" />
        </div>

        {allowRegister && (
          <div className="mb-8 flex rounded-md border border-ink-950/10 bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={clsx(
                'flex-1 rounded-md py-2 text-sm font-semibold transition-all',
                !isRegister ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-950/50 hover:text-ink-950'
              )}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={clsx(
                'flex-1 rounded-md py-2 text-sm font-semibold transition-all',
                isRegister ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-950/50 hover:text-ink-950'
              )}
            >
              Criar conta
            </button>
          </div>
        )}

        <h1 className="mb-1 text-center font-display text-2xl font-bold text-ink-950">
          {isRegister ? 'Criar conta' : 'Entrar no SocialFlow'}
        </h1>
        <p className="mb-8 text-center text-sm text-ink-950/55">
          {isRegister ? 'Comece a operar conteúdo e vendas no mesmo fluxo.' : 'Acesse seu painel com e-mail e senha.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <input
                type="text"
                placeholder="Nome completo"
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
            placeholder={isRegister ? 'Senha (mín. 8 caracteres)' : 'Senha'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="input-dark"
            required
            minLength={isRegister ? 8 : 1}
          />

          <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:opacity-60">
            {isLoading ? 'Processando...' : isRegister ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-950/45">
          Ao continuar, você concorda com nossos{' '}
          <Link href="/terms" className="text-signal-600 hover:text-signal-700">
            Termos
          </Link>
          {' e '}
          <Link href="/privacy-policy" className="text-signal-600 hover:text-signal-700">
            Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
}
