'use client';

import { useEffect, useState } from 'react';
import { FiInstagram, FiTrendingUp, FiCheck, FiLoader } from 'react-icons/fi';
import { SiTiktok } from 'react-icons/si';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import DailyContentGenerator from '@/components/dashboard/DailyContentGenerator';

interface Template {
  id: string;
  format: 'reel' | 'story' | 'post';
  title: string;
  objetivo: string;
  descricao: string;
  estrutura: string[];
  duracaoSugerida: string;
  tags: string[];
  trendScore: number;
}

interface AccountsResponse {
  configured: boolean;
  data: {
    groups: { id: string; name: string }[];
    integrations: { id: string; name: string; platform: string }[];
  };
}

const objetivos = [
  { value: 'all', label: 'Todos os objetivos' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'engajamento', label: 'Engajamento' },
  { value: 'autoridade', label: 'Autoridade' },
  { value: 'oferta', label: 'Oferta' },
];

const formatos = [
  { value: 'all', label: 'Todos os formatos', icon: null },
  { value: 'reel', label: 'Reels' },
  { value: 'story', label: 'Stories' },
  { value: 'post', label: 'Posts' },
];

export default function ContentStudioPage() {
  const [nicho, setNicho] = useState('');
  const [objetivo, setObjetivo] = useState('all');
  const [formato, setFormato] = useState('all');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [trendsConfigured, setTrendsConfigured] = useState(false);

  const [accounts, setAccounts] = useState<AccountsResponse | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [caption, setCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivo, formato]);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const params = new URLSearchParams({ nicho, objetivo, formato });
      const res = await fetch(`/api/content-studio/templates?${params}`);
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data);
        setTrendsConfigured(json.trendsConfigured);
      }
    } catch {
      toast.error('Erro ao carregar modelos');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/content-studio/accounts');
      const json = await res.json();
      setAccounts(json);
    } catch {
      // silencioso — tela funciona em modo preview sem Postiz configurado
    }
  };

  const handleSelectTemplate = async (template: Template) => {
    setSelectedTemplate(template);
    setCaption('');
    setIsGenerating(true);
    try {
      // Usa a chave de IA compartilhada da TrustFlix (server-side), não o BYOK do Arsenal —
      // o cliente final do Content Studio não precisa ter/inserir a própria API key.
      const res = await fetch('/api/content-studio/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: template.format,
          title: template.title,
          objetivo: template.objetivo,
          nicho: nicho || 'geral',
          estrutura: template.estrutura,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || 'Erro ao gerar legenda');
      setCaption(json.caption || '');
    } catch {
      setCaption(
        `[Rascunho] ${template.title} — adicione sua legenda aqui.\n\nEstrutura: ${template.estrutura.join(' → ')}`
      );
      toast('Gerador de IA indisponível no momento — rascunho manual criado.', { icon: '✍️' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAndSchedule = async () => {
    if (!selectedTemplate) return;
    if (!selectedAccount) {
      toast.error('Selecione uma conta conectada antes de agendar');
      return;
    }
    setIsScheduling(true);
    try {
      const res = await fetch('/api/content-studio/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationIds: [selectedAccount],
          content: caption,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success('Post agendado com sucesso!');
      setSelectedTemplate(null);
      setCaption('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao agendar');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-ink-950 pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-grid-glow opacity-60" />

      <div className="relative mx-auto max-w-7xl px-4 py-12">
        <span className="section-badge">Content Studio</span>
        <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
          Modelos vencedores para o seu conteúdo
        </h1>
        <p className="mt-3 max-w-2xl text-ink-300">
          Escolha o formato e objetivo, veja os modelos ranqueados por tendência, deixe a IA escrever a
          legenda e aprove antes de publicar.
        </p>

        <div className="mt-8">
          <DailyContentGenerator />
        </div>

        <div className="mt-12 flex items-center gap-3">
          <span className="section-badge">Ou navegue pelos modelos prontos</span>
        </div>

        {!accounts?.configured && (
          <div className="mt-6 rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-gold-300">
            ⚠️ Motor de publicação (Postiz) ainda não conectado — você pode montar o conteúdo, mas o
            agendamento real só funciona após configurar <code>POSTIZ_API_URL</code> /{' '}
            <code>POSTIZ_API_KEY</code> (veja <code>postiz-deploy/README.md</code>).
          </div>
        )}
        {!trendsConfigured && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink-300">
            ℹ️ Sinal de tendência (trendsmcp) não configurado — ranking está usando score neutro. Defina{' '}
            <code>TRENDSMCP_API_KEY</code> para ranqueamento real.
          </div>
        )}

        {/* Filters */}
        <div className="mt-8 flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            placeholder="Seu nicho (ex: moda, fitness, estética)..."
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadTemplates()}
            className="input-dark flex-1"
          />
          <button onClick={loadTemplates} className="btn-secondary">
            <FiTrendingUp /> Atualizar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {objetivos.map((o) => (
            <button
              key={o.value}
              onClick={() => setObjetivo(o.value)}
              className={clsx(
                'rounded-full border px-4 py-1.5 text-sm transition-colors',
                objetivo === o.value
                  ? 'border-accent-400 bg-accent-400/10 text-accent-400'
                  : 'border-white/10 bg-white/[0.03] text-ink-300 hover:bg-white/[0.06]'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {formatos.map((f) => (
            <button
              key={f.value}
              onClick={() => setFormato(f.value)}
              className={clsx(
                'rounded-full border px-4 py-1.5 text-sm transition-colors',
                formato === f.value
                  ? 'border-accent-400 bg-accent-400/10 text-accent-400'
                  : 'border-white/10 bg-white/[0.03] text-ink-300 hover:bg-white/[0.06]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Templates grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoadingTemplates
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
              ))
            : templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={clsx(
                    'group flex flex-col rounded-2xl border p-6 text-left transition-all hover:-translate-y-1',
                    selectedTemplate?.id === template.id
                      ? 'border-accent-400 bg-accent-400/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-accent-400/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-300">
                      {template.format}
                    </span>
                    {template.trendScore > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-accent-400">
                        <FiTrendingUp /> {template.trendScore}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-white">{template.title}</h3>
                  <p className="mt-2 text-sm text-ink-300">{template.descricao}</p>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <span key={tag} className="text-xs text-ink-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span className="mt-4 text-xs text-ink-400">{template.duracaoSugerida}</span>
                </button>
              ))}
        </div>

        {/* Caption editor + accounts + schedule */}
        {selectedTemplate && (
          <div className="card-surface mt-10 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-white">{selectedTemplate.title}</h2>
              {isGenerating && <FiLoader className="animate-spin text-accent-400" />}
            </div>

            <div className="mt-4">
              <label className="text-sm text-ink-300">Contas para publicar</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {accounts?.data?.integrations?.length ? (
                  accounts.data.integrations.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => setSelectedAccount(acc.id)}
                      className={clsx(
                        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                        selectedAccount === acc.id
                          ? 'border-accent-400 bg-accent-400/10 text-accent-400'
                          : 'border-white/10 bg-white/[0.03] text-ink-300 hover:bg-white/[0.06]'
                      )}
                    >
                      {acc.platform === 'tiktok' ? <SiTiktok /> : <FiInstagram />}
                      {acc.name}
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-ink-400">Nenhuma conta conectada</span>
                )}
              </div>
            </div>

            <label className="mt-6 block text-sm text-ink-300">Legenda gerada pela IA</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              placeholder="A IA vai gerar uma sugestão aqui — edite como quiser antes de aprovar."
              className="input-dark resize-none"
            />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleApproveAndSchedule}
                disabled={isScheduling || !caption}
                className="btn-primary disabled:opacity-50"
              >
                {isScheduling ? <FiLoader className="animate-spin" /> : <FiCheck />}
                Aprovar e Agendar
              </button>
              <button onClick={() => setSelectedTemplate(null)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
