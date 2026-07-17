'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiInstagram, FiBarChart2, FiCalendar, FiLoader, FiRefreshCw, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { authFetch } from '@/lib/auth/clientFetch';
import type { PostizPost } from '@/services/postizService';

interface Integration {
  id: string;
  name: string;
  identifier: string;
  picture?: string;
  disabled?: boolean;
  profile?: string;
}

const IG_TYPES = new Set(['instagram', 'instagram-standalone']);

function isInstagramAccount(identifier: string): boolean {
  const id = String(identifier || '').toLowerCase();
  return IG_TYPES.has(id) || id.includes('instagram');
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function postDate(post: PostizPost): Date | null {
  const raw = post.publishDate || post.date;
  if (!raw || typeof raw !== 'string') return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function postLabel(post: PostizPost): string {
  const content = typeof post.content === 'string' ? post.content : '';
  if (content.trim()) return content.trim().slice(0, 100);
  return post.integration?.name || 'Publicação';
}

function flattenMetrics(data: unknown): { key: string; value: string }[] {
  if (data == null) return [];
  if (typeof data !== 'object') return [{ key: 'valor', value: String(data) }];

  const obj = data as Record<string, unknown>;
  const rows: { key: string; value: string }[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      rows.push({ key, value: String(value) });
    } else if (Array.isArray(value)) {
      rows.push({ key, value: `${value.length} itens` });
    } else if (typeof value === 'object') {
      const nested = value as Record<string, unknown>;
      for (const [nk, nv] of Object.entries(nested)) {
        if (typeof nv === 'number' || typeof nv === 'string') {
          rows.push({ key: `${key}.${nk}`, value: String(nv) });
        }
      }
    }
  }

  return rows.slice(0, 24);
}

type Tab = 'accounts' | 'agenda' | 'analytics';

export default function InstagramPage() {
  const [tab, setTab] = useState<Tab>('accounts');
  const [configured, setConfigured] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [meta, setMeta] = useState<{ total: number; identifiers: string[]; names: string[] } | null>(null);
  const [accountsError, setAccountsError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [posts, setPosts] = useState<PostizPost[]>([]);
  const [analytics, setAnalytics] = useState<unknown>(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const igAccounts = useMemo(() => {
    const ig = integrations.filter((i) => isInstagramAccount(i.identifier) && !i.disabled);
    // Se a API trouxe canais mas nenhum passou no filtro Instagram, mostra todos
    // para o operador não ficar "cego" (identifier pode variar no self-host).
    if (ig.length === 0 && integrations.length > 0) {
      return integrations.filter((i) => !i.disabled);
    }
    return ig;
  }, [integrations]);

  const selected = igAccounts.find((a) => a.id === selectedId) || igAccounts[0];

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    setAccountsError('');
    try {
      const res = await authFetch('/api/content-studio/accounts');
      const json = await res.json();
      if (!res.ok || json.success === false) {
        setConfigured(json.configured !== false);
        setIntegrations([]);
        setMeta(null);
        setAccountsError(json.error || 'Falha ao listar contas no Postiz.');
        return;
      }
      setConfigured(json.configured !== false);
      const list: Integration[] = json?.data?.integrations || [];
      setIntegrations(list);
      setMeta(json.meta || { total: list.length, identifiers: list.map((i) => i.identifier), names: list.map((i) => i.name) });
      const firstIg =
        list.find((i) => isInstagramAccount(i.identifier) && !i.disabled) ||
        list.find((i) => !i.disabled);
      if (firstIg) setSelectedId((prev) => prev || firstIg.id);
    } catch {
      setAccountsError('Erro de rede ao carregar contas.');
      toast.error('Erro ao carregar contas');
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const start = startOfWeek(new Date());
      const end = addDays(start, 6);
      end.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      const res = await authFetch(`/api/content-studio/posts?${params}`);
      const json = await res.json();
      if (json.success) {
        const all: PostizPost[] = Array.isArray(json.data) ? json.data : [];
        const filtered = selectedId
          ? all.filter((p) => !p.integration?.id || p.integration.id === selectedId)
          : all;
        setPosts(filtered);
      } else if (res.status !== 401) {
        toast.error(json.error || 'Erro ao carregar agenda');
      }
    } catch {
      toast.error('Erro ao carregar agenda');
    } finally {
      setLoadingPosts(false);
    }
  }, [selectedId]);

  const loadAnalytics = useCallback(async () => {
    if (!selectedId) {
      setAnalytics(null);
      setAnalyticsError('Selecione uma conta Instagram.');
      return;
    }
    setLoadingAnalytics(true);
    setAnalyticsError('');
    try {
      const res = await authFetch(`/api/instagram/insights?integrationId=${encodeURIComponent(selectedId)}`);
      const json = await res.json();
      if (!json.success) {
        setAnalytics(null);
        setAnalyticsError(json.error || 'Analytics indisponível nesta instância Postiz.');
        return;
      }
      if (json.configured === false) {
        setAnalytics(null);
        setAnalyticsError('Postiz ainda não configurado.');
        return;
      }
      setAnalytics(json.data);
    } catch {
      setAnalytics(null);
      setAnalyticsError('Falha ao buscar analytics.');
    } finally {
      setLoadingAnalytics(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (tab === 'agenda') loadPosts();
  }, [tab, loadPosts]);

  useEffect(() => {
    if (tab === 'analytics') loadAnalytics();
  }, [tab, loadAnalytics]);

  const metricRows = flattenMetrics(analytics);
  const weekStart = startOfWeek(new Date());
  const weekLabel = `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${addDays(weekStart, 6).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;

  return (
    <DashboardShell
      title="Instagram"
      subtitle="Contas, agenda e métricas via Postiz"
      actions={
        <Link href="/dashboard/content-studio" className="btn-primary !py-2 !text-sm">
          Criar no Content Studio
        </Link>
      }
    >
      {!configured && (
        <div className="mb-6 rounded-lg border border-signal-500/30 bg-signal-50 px-4 py-3 text-sm text-signal-800">
          Postiz não conectado. Defina <code>POSTIZ_API_URL</code> e <code>POSTIZ_API_KEY</code> na Vercel
          (ex.: <code>https://insta.trustcorp.com.br/api/public/v1</code>).
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 border-b border-ink-950/10 pb-3">
        {(
          [
            { id: 'accounts', label: 'Contas', icon: FiUsers },
            { id: 'agenda', label: 'Agenda', icon: FiCalendar },
            { id: 'analytics', label: 'Analytics', icon: FiBarChart2 },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors',
              tab === t.id
                ? 'bg-signal-500 text-white'
                : 'bg-stone-100 text-ink-950/70 hover:bg-stone-200'
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'accounts' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-950/60">
              Contas Instagram conectadas no Postiz ({igAccounts.length})
            </p>
            <button
              type="button"
              onClick={loadAccounts}
              className="inline-flex items-center gap-2 rounded-md border border-ink-950/10 px-3 py-1.5 text-sm hover:bg-stone-100"
            >
              <FiRefreshCw size={14} /> Atualizar
            </button>
          </div>

          {loadingAccounts ? (
            <div className="flex items-center gap-2 text-ink-950/50">
              <FiLoader className="animate-spin" /> Carregando contas...
            </div>
          ) : accountsError ? (
            <div className="rounded-xl border border-danger-500/30 bg-danger-50 p-6 text-sm text-danger-700">
              <p className="font-semibold">Erro ao falar com o Postiz</p>
              <p className="mt-2">{accountsError}</p>
              <p className="mt-3 text-xs opacity-80">
                Confira na Vercel: <code>POSTIZ_API_URL=https://insta.trustcorp.com.br/api/public/v1</code> e a{' '}
                <code>POSTIZ_API_KEY</code> da mesma organização onde a conta &quot;socialflow&quot; está conectada.
              </p>
            </div>
          ) : igAccounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-950/15 bg-white p-8 text-center">
              <FiInstagram className="mx-auto text-ink-950/30" size={32} />
              <p className="mt-3 font-display text-lg font-semibold text-ink-950">
                Nenhuma conta Instagram encontrada
              </p>
              <p className="mt-2 text-sm text-ink-950/55">
                {configured
                  ? `A API respondeu, mas veio vazia (total: ${meta?.total ?? 0}). A API Key na Vercel precisa ser da mesma org do Postiz onde a conta aparece.`
                  : 'Postiz ainda não configurado nas variáveis de ambiente.'}
              </p>
              {meta && meta.total > 0 && (
                <p className="mt-2 text-xs text-ink-950/45">
                  Canais retornados: {meta.names.join(', ')} ({meta.identifiers.join(', ')})
                </p>
              )}
              <p className="mt-3 text-sm text-ink-950/55">
                Conecte/verifique em{' '}
                <a
                  href="https://insta.trustcorp.com.br"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-signal-600 hover:text-signal-700"
                >
                  insta.trustcorp.com.br
                </a>{' '}
                → Settings → API (mesma organização).
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {igAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedId(acc.id)}
                  className={clsx(
                    'rounded-xl border p-5 text-left transition-all',
                    selectedId === acc.id
                      ? 'border-signal-500 bg-signal-50 shadow-sm'
                      : 'border-ink-950/10 bg-white hover:border-signal-500/40'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {acc.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={acc.picture} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-signal-500 text-white">
                        <FiInstagram size={20} />
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-ink-950">{acc.name}</p>
                      <p className="text-xs text-ink-950/50">{acc.identifier}</p>
                      {acc.profile && (
                        <p className="mt-0.5 text-xs text-flow-700">@{acc.profile.replace(/^@/, '')}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 rounded-xl border border-ink-950/10 bg-white p-6">
            <h3 className="font-display text-lg font-bold text-ink-950">Publicar conteúdo</h3>
            <p className="mt-2 text-sm text-ink-950/60">
              Legenda, mídia, Stories/Reels e agendamento ficam no Content Studio — motor Postiz.
            </p>
            <Link href="/dashboard/content-studio" className="btn-primary mt-4 inline-flex">
              Abrir Content Studio
            </Link>
          </div>
        </div>
      )}

      {tab === 'agenda' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold text-ink-950">Semana · {weekLabel}</p>
              <p className="text-sm text-ink-950/55">
                {selected ? `Filtrado: ${selected.name}` : 'Todas as contas'}
              </p>
            </div>
            <div className="flex gap-2">
              {igAccounts.length > 0 && (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="input-dark max-w-xs !py-2"
                >
                  {igAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={loadPosts}
                className="inline-flex items-center gap-2 rounded-md border border-ink-950/10 px-3 py-2 text-sm hover:bg-stone-100"
              >
                <FiRefreshCw size={14} /> Atualizar
              </button>
            </div>
          </div>

          {loadingPosts ? (
            <div className="flex items-center gap-2 text-ink-950/50">
              <FiLoader className="animate-spin" /> Carregando posts...
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-950/15 bg-white p-8 text-center">
              <p className="font-semibold text-ink-950">Nenhum post nesta semana</p>
              <p className="mt-2 text-sm text-ink-950/55">Agende o próximo no Content Studio.</p>
              <Link href="/dashboard/content-studio" className="btn-primary mt-4 inline-flex">
                Agendar agora
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {posts
                .slice()
                .sort((a, b) => {
                  const da = postDate(a)?.getTime() || 0;
                  const db = postDate(b)?.getTime() || 0;
                  return da - db;
                })
                .map((post, idx) => {
                  const when = postDate(post);
                  return (
                    <li
                      key={String(post.id || idx)}
                      className="rounded-xl border border-ink-950/10 bg-white px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-ink-950">{postLabel(post)}</p>
                          <p className="mt-1 text-xs text-ink-950/50">
                            {when
                              ? when.toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Sem data'}
                            {post.integration?.name ? ` · ${post.integration.name}` : ''}
                          </p>
                        </div>
                        <span className="rounded-md bg-stone-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-950/60">
                          {String(post.state || post.status || 'scheduled')}
                        </span>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-950/60">Métricas da conta selecionada (API Postiz)</p>
            <div className="flex gap-2">
              {igAccounts.length > 0 && (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="input-dark max-w-xs !py-2"
                >
                  {igAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={loadAnalytics}
                className="inline-flex items-center gap-2 rounded-md border border-ink-950/10 px-3 py-2 text-sm hover:bg-stone-100"
              >
                <FiRefreshCw size={14} /> Atualizar
              </button>
            </div>
          </div>

          {loadingAnalytics ? (
            <div className="flex items-center gap-2 text-ink-950/50">
              <FiLoader className="animate-spin" /> Carregando analytics...
            </div>
          ) : analyticsError ? (
            <div className="rounded-xl border border-ink-950/10 bg-white p-6">
              <p className="font-semibold text-ink-950">Analytics indisponível</p>
              <p className="mt-2 text-sm text-ink-950/60">{analyticsError}</p>
              <p className="mt-3 text-xs text-ink-950/45">
                Algumas instâncias self-hosted do Postiz não expõem <code>/analytics/:id</code>. Nesse
                caso use o painel em insta.trustcorp.com.br.
              </p>
            </div>
          ) : metricRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-950/15 bg-white p-8 text-center text-sm text-ink-950/55">
              Sem métricas retornadas para esta conta.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {metricRows.map((row) => (
                <div key={row.key} className="rounded-xl border border-ink-950/10 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-950/45">{row.key}</p>
                  <p className="mt-2 font-display text-2xl font-bold text-ink-950">{row.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
