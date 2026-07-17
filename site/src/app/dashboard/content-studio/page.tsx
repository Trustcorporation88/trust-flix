'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiInstagram,
  FiTrendingUp,
  FiCheck,
  FiLoader,
  FiUpload,
  FiX,
  FiFilm,
  FiCalendar,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
import { SiTiktok } from 'react-icons/si';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import DailyContentGenerator from '@/components/dashboard/DailyContentGenerator';
import { authFetch } from '@/lib/auth/clientFetch';
import { loadContentDraft, clearContentDraft } from '@/lib/contentDraft';
import {
  deleteCustomTemplate,
  listCustomTemplates,
  parseEstruturaFromText,
  saveCustomTemplate,
} from '@/lib/customTemplates';
import type { PostizPost } from '@/services/postizService';

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
  custom?: boolean;
}

interface PostizIntegration {
  id: string;
  name: string;
  identifier: string;
}

interface AccountsResponse {
  configured: boolean;
  data: {
    groups: { id: string; name: string }[];
    integrations: PostizIntegration[];
  };
}

const MAX_UPLOAD_BYTES = 4.4 * 1024 * 1024;

const objetivos = [
  { value: 'all', label: 'Todos os objetivos' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'engajamento', label: 'Engajamento' },
  { value: 'autoridade', label: 'Autoridade' },
  { value: 'oferta', label: 'Oferta' },
];

const formatos = [
  { value: 'all', label: 'Todos os formatos' },
  { value: 'reel', label: 'Reels' },
  { value: 'story', label: 'Stories' },
  { value: 'post', label: 'Posts' },
];

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScheduleLocal(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalInputValue(d);
}

function postDate(post: PostizPost): Date | null {
  const raw = post.publishDate || post.date;
  if (!raw || typeof raw !== 'string') return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function postLabel(post: PostizPost): string {
  const content = typeof post.content === 'string' ? post.content : '';
  if (content.trim()) return content.trim().slice(0, 80);
  return post.integration?.name || 'Publicação';
}

function postStatus(post: PostizPost): string {
  return String(post.state || post.status || 'scheduled');
}

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
  const [postType, setPostType] = useState<'post' | 'story'>('post');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('schedule');
  const [scheduledLocal, setScheduledLocal] = useState(defaultScheduleLocal);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importForm, setImportForm] = useState({
    title: '',
    format: 'reel' as 'reel' | 'story' | 'post',
    objetivo: 'engajamento',
    descricao: '',
    estruturaText: '',
    duracaoSugerida: '',
    tags: '',
    sourceNote: '',
  });

  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [posts, setPosts] = useState<PostizPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsConfigured, setPostsConfigured] = useState(true);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor]
  );

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const params = new URLSearchParams({ nicho, objetivo, formato });
      const res = await authFetch(`/api/content-studio/templates?${params}`);
      const json = await res.json();
      if (json.success) {
        let custom = listCustomTemplates().map((t) => ({
          id: t.id,
          format: t.format,
          title: t.title,
          objetivo: t.objetivo,
          descricao: t.descricao,
          estrutura: t.estrutura,
          duracaoSugerida: t.duracaoSugerida,
          tags: t.tags,
          trendScore: t.trendScore,
          custom: true,
        }));
        if (objetivo !== 'all') custom = custom.filter((t) => t.objetivo === objetivo);
        if (formato !== 'all') custom = custom.filter((t) => t.format === formato);
        const merged = [...custom, ...(json.data || [])];
        setTemplates(merged);
        setTrendsConfigured(json.trendsConfigured);
      } else if (res.status !== 401) {
        toast.error(json.error || 'Erro ao carregar modelos');
      }
    } catch {
      toast.error('Erro ao carregar modelos');
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [nicho, objetivo, formato]);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await authFetch('/api/content-studio/accounts');
      const json = await res.json();
      setAccounts(json);
    } catch {
      // silencioso — tela funciona em modo preview sem Postiz
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    try {
      const start = weekAnchor.toISOString();
      const end = addDays(weekAnchor, 6);
      end.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({
        startDate: start,
        endDate: end.toISOString(),
      });
      const res = await authFetch(`/api/content-studio/posts?${params}`);
      const json = await res.json();
      setPostsConfigured(json.configured !== false);
      if (json.success) {
        setPosts(Array.isArray(json.data) ? json.data : []);
      } else if (res.status !== 401) {
        toast.error(json.error || 'Erro ao carregar agenda');
      }
    } catch {
      toast.error('Erro ao carregar agenda');
    } finally {
      setIsLoadingPosts(false);
    }
  }, [weekAnchor]);

  useEffect(() => {
    loadTemplates();
    loadAccounts();
  }, [loadTemplates, loadAccounts]);

  useEffect(() => {
    const draft = loadContentDraft();
    if (draft?.caption) {
      setCaption(draft.caption);
      toast.success(draft.source ? `Draft de ${draft.source} carregado` : 'Draft de copy carregado');
      clearContentDraft();
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const postsByDay = useMemo(() => {
    const map: Record<string, PostizPost[]> = {};
    for (const day of weekDays) {
      map[day.toDateString()] = [];
    }
    for (const post of posts) {
      const d = postDate(post);
      if (!d) continue;
      const key = d.toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(post);
    }
    return map;
  }, [posts, weekDays]);

  const handleSelectTemplate = async (template: Template) => {
    setSelectedTemplate(template);
    setCaption('');
    setMediaFile(null);
    setPostType(template.format === 'story' ? 'story' : 'post');
    setPublishMode('schedule');
    setScheduledLocal(defaultScheduleLocal());
    setIsGenerating(true);
    try {
      const res = await authFetch('/api/content-studio/caption', {
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
      toast('Gerador de IA indisponível — rascunho manual criado.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMediaChange = (file: File | null) => {
    if (file && file.size > MAX_UPLOAD_BYTES) {
      toast.error(
        'Arquivo maior que ~4.4MB — comprima o vídeo ou publique esse post direto no painel do Postiz.'
      );
      return;
    }
    setMediaFile(file);
  };

  const handleApproveAndSchedule = async () => {
    if (!selectedTemplate) return;
    if (!selectedAccount) {
      toast.error('Selecione uma conta conectada antes de publicar');
      return;
    }
    const account = accounts?.data?.integrations?.find((a) => a.id === selectedAccount);
    if (!account) {
      toast.error('Conta selecionada não encontrada — atualize a página');
      return;
    }

    let scheduledFor: string | undefined;
    if (publishMode === 'schedule') {
      const when = new Date(scheduledLocal);
      if (Number.isNaN(when.getTime())) {
        toast.error('Data/hora inválida');
        return;
      }
      if (when.getTime() < Date.now() - 60_000) {
        toast.error('Escolha uma data/hora no futuro');
        return;
      }
      scheduledFor = when.toISOString();
    }

    setIsScheduling(true);
    try {
      let media: { id: string; path: string }[] | undefined;

      if (mediaFile) {
        setIsUploadingMedia(true);
        const form = new FormData();
        form.append('file', mediaFile, mediaFile.name);
        const uploadRes = await authFetch('/api/content-studio/upload-media', {
          method: 'POST',
          body: form,
        });
        const uploadJson = await uploadRes.json();
        setIsUploadingMedia(false);
        if (!uploadRes.ok || !uploadJson.success) {
          throw new Error(uploadJson?.error || 'Erro ao enviar o arquivo de mídia');
        }
        media = [uploadJson.data];
      }

      const res = await authFetch('/api/content-studio/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: account.id,
          integrationType: account.identifier,
          content: caption,
          media,
          postType,
          scheduledFor,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      toast.success(
        publishMode === 'schedule'
          ? 'Conteúdo agendado com sucesso'
          : postType === 'story'
            ? 'Story publicado'
            : 'Post/Reel publicado'
      );
      setSelectedTemplate(null);
      setCaption('');
      setMediaFile(null);
      loadPosts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao publicar');
    } finally {
      setIsScheduling(false);
      setIsUploadingMedia(false);
    }
  };

  const handleSaveImportedTemplate = () => {
    const estrutura = parseEstruturaFromText(importForm.estruturaText);
    if (!importForm.title.trim()) {
      toast.error('Informe um título para o modelo');
      return;
    }
    if (estrutura.length < 2) {
      toast.error('Cole pelo menos 2 passos da estrutura (um por linha)');
      return;
    }
    saveCustomTemplate({
      title: importForm.title.trim(),
      format: importForm.format,
      objetivo: importForm.objetivo,
      descricao:
        importForm.descricao.trim() ||
        `Modelo capturado do Instagram${importForm.sourceNote ? ` · ${importForm.sourceNote}` : ''}`,
      estrutura,
      duracaoSugerida: importForm.duracaoSugerida.trim() || (importForm.format === 'story' ? '2-4 stories' : 'conforme referência'),
      tags: importForm.tags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean),
      sourceNote: importForm.sourceNote.trim() || undefined,
    });
    toast.success('Modelo salvo neste navegador');
    setShowImportModal(false);
    setImportForm({
      title: '',
      format: 'reel',
      objetivo: 'engajamento',
      descricao: '',
      estruturaText: '',
      duracaoSugerida: '',
      tags: '',
      sourceNote: '',
    });
    loadTemplates();
  };

  const handleDeleteCustom = (id: string) => {
    deleteCustomTemplate(id);
    toast.success('Modelo removido');
    if (selectedTemplate?.id === id) setSelectedTemplate(null);
    loadTemplates();
  };

  const weekLabel = `${weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;

  return (
    <div className="relative min-h-screen bg-ink-950 pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-grid-glow opacity-60" />

      <header className="relative z-10 border-b border-white/10 bg-ink-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="SocialFlow" className="h-8 w-8 rounded-md object-contain" />
              <span className="hidden font-display text-sm font-bold text-white sm:inline">
                Social<span className="text-signal-500">Flow</span>
              </span>
            </Link>
            <span className="text-white/20">/</span>
            <Link href="/dashboard" className="text-sm text-ink-300 transition-colors hover:text-white">
              Painel
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-sm text-white">Content Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-ink-300 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              ← Voltar
            </Link>
            <Link href="/" className="btn-secondary !px-3 !py-1.5 !text-sm">
              Home
            </Link>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-4 py-12">
        <span className="section-badge">Content Studio</span>
        <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
          Crie, aprove e agenda no mesmo fluxo
        </h1>
        <p className="mt-3 max-w-2xl text-ink-300">
          Modelos, legenda com IA e publicação via Postiz — com calendário da semana.
        </p>

        {/* Calendar */}
        <div className="card-surface mt-10 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="section-badge">Agenda</span>
              <h2 className="mt-2 flex items-center gap-2 font-display text-xl font-semibold text-white">
                <FiCalendar className="text-signal-500" /> Semana · {weekLabel}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekAnchor((w) => addDays(w, -7))}
                className="rounded-md border border-white/10 p-2 text-ink-300 hover:bg-white/[0.05] hover:text-white"
                aria-label="Semana anterior"
              >
                <FiChevronLeft />
              </button>
              <button
                type="button"
                onClick={() => setWeekAnchor(startOfWeek(new Date()))}
                className="rounded-md border border-white/10 px-3 py-2 text-sm text-ink-300 hover:bg-white/[0.05] hover:text-white"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setWeekAnchor((w) => addDays(w, 7))}
                className="rounded-md border border-white/10 p-2 text-ink-300 hover:bg-white/[0.05] hover:text-white"
                aria-label="Próxima semana"
              >
                <FiChevronRight />
              </button>
              <button type="button" onClick={loadPosts} className="btn-secondary !py-2 !text-sm">
                Atualizar
              </button>
            </div>
          </div>

          {!postsConfigured && (
            <p className="mt-4 rounded-md border border-signal-500/30 bg-signal-500/10 px-4 py-3 text-sm text-signal-200">
              Postiz ainda não conectado. Configure <code>POSTIZ_API_URL</code> e{' '}
              <code>POSTIZ_API_KEY</code> na Vercel para ver e agendar posts reais.
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-7">
            {weekDays.map((day, i) => {
              const key = day.toDateString();
              const dayPosts = postsByDay[key] || [];
              const isToday = key === new Date().toDateString();
              return (
                <div
                  key={key}
                  className={clsx(
                    'min-h-[120px] rounded-lg border p-3',
                    isToday ? 'border-signal-500/40 bg-signal-500/5' : 'border-white/10 bg-white/[0.02]'
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {WEEKDAYS[i]}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{day.getDate()}</p>
                  <div className="mt-2 space-y-1.5">
                    {isLoadingPosts ? (
                      <div className="h-8 animate-pulse rounded bg-white/[0.04]" />
                    ) : dayPosts.length === 0 ? (
                      <p className="text-[11px] text-ink-500">—</p>
                    ) : (
                      dayPosts.slice(0, 4).map((post, idx) => (
                        <div
                          key={String(post.id || idx)}
                          className="rounded border border-white/10 bg-ink-950/60 px-2 py-1.5"
                          title={postLabel(post)}
                        >
                          <p className="truncate text-[11px] text-ink-200">{postLabel(post)}</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-flow-400">
                            {postStatus(post)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          <DailyContentGenerator />
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="section-badge">Modelos prontos</span>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 rounded-md border border-signal-500/40 bg-signal-500/10 px-4 py-2 text-sm font-semibold text-signal-300 hover:bg-signal-500/20"
          >
            <FiPlus /> Capturar modelo do Instagram
          </button>
        </div>

        <p className="mt-3 max-w-2xl text-sm text-ink-400">
          No Instagram: salve um Reel/carrossel → anote gancho + passos + CTA → cole aqui. O modelo fica
          salvo neste navegador e aparece junto dos modelos oficiais.
        </p>

        {!accounts?.configured && (
          <div className="mt-6 rounded-xl border border-signal-500/30 bg-signal-500/10 px-4 py-3 text-sm text-signal-200">
            Motor de publicação (Postiz) ainda não conectado — você pode montar o conteúdo, mas o
            agendamento real só funciona após configurar <code>POSTIZ_API_URL</code> /{' '}
            <code>POSTIZ_API_KEY</code>.
          </div>
        )}
        {!trendsConfigured && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink-300">
            Sinal de tendência não configurado — ranking com score neutro. Defina{' '}
            <code>TRENDSMCP_API_KEY</code> para ranqueamento real.
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            placeholder="Seu nicho (ex: moda, fitness, estética)..."
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadTemplates()}
            className="input-dark flex-1 !border-white/10 !bg-white/[0.04] !text-white placeholder:!text-ink-400"
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
                'rounded-md border px-4 py-1.5 text-sm transition-colors',
                objetivo === o.value
                  ? 'border-signal-500 bg-signal-500/10 text-signal-400'
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
                'rounded-md border px-4 py-1.5 text-sm transition-colors',
                formato === f.value
                  ? 'border-signal-500 bg-signal-500/10 text-signal-400'
                  : 'border-white/10 bg-white/[0.03] text-ink-300 hover:bg-white/[0.06]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoadingTemplates
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
              ))
            : templates.map((template) => (
                <div key={template.id} className="relative">
                  {template.custom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(template.id)}
                      className="absolute right-3 top-3 z-10 rounded-md border border-white/10 bg-ink-950/80 p-1.5 text-ink-400 hover:text-signal-400"
                      title="Remover modelo personalizado"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleSelectTemplate(template)}
                    className={clsx(
                      'group flex h-full w-full flex-col rounded-xl border p-6 text-left transition-all hover:-translate-y-0.5',
                      selectedTemplate?.id === template.id
                        ? 'border-signal-500 bg-signal-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-signal-500/40'
                    )}
                  >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-300">
                      {template.format}
                      {template.custom ? ' · meu' : ''}
                    </span>
                    {template.trendScore > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-signal-400">
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
                </div>
              ))}
        </div>

        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-ink-900 p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-white">Capturar modelo do Instagram</h3>
                <button type="button" onClick={() => setShowImportModal(false)} className="text-ink-400 hover:text-white">
                  <FiX size={20} />
                </button>
              </div>
              <p className="mb-4 text-sm text-ink-300">
                Cole a estrutura que você anotou (um passo por linha). Exemplo:
                <br />
                <span className="text-ink-400">Hook nos 3s · dor · solução · CTA salvar</span>
              </p>
              <div className="space-y-3">
                <input
                  className="input-dark !border-white/10 !bg-white/[0.04] !text-white"
                  placeholder="Título do modelo (ex: Carrossel mitos fitness)"
                  value={importForm.title}
                  onChange={(e) => setImportForm({ ...importForm, title: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="input-dark !border-white/10 !bg-white/[0.04] !text-white"
                    value={importForm.format}
                    onChange={(e) =>
                      setImportForm({ ...importForm, format: e.target.value as 'reel' | 'story' | 'post' })
                    }
                  >
                    <option value="reel">Reel</option>
                    <option value="story">Story</option>
                    <option value="post">Post / Carrossel</option>
                  </select>
                  <select
                    className="input-dark !border-white/10 !bg-white/[0.04] !text-white"
                    value={importForm.objetivo}
                    onChange={(e) => setImportForm({ ...importForm, objetivo: e.target.value })}
                  >
                    <option value="vendas">Vendas</option>
                    <option value="engajamento">Engajamento</option>
                    <option value="autoridade">Autoridade</option>
                    <option value="oferta">Oferta</option>
                  </select>
                </div>
                <textarea
                  className="input-dark min-h-[120px] resize-y !border-white/10 !bg-white/[0.04] !text-white"
                  placeholder={'Estrutura (um passo por linha):\nGancho\nProblema\nSolução\nCTA'}
                  value={importForm.estruturaText}
                  onChange={(e) => setImportForm({ ...importForm, estruturaText: e.target.value })}
                />
                <input
                  className="input-dark !border-white/10 !bg-white/[0.04] !text-white"
                  placeholder="Descrição (opcional)"
                  value={importForm.descricao}
                  onChange={(e) => setImportForm({ ...importForm, descricao: e.target.value })}
                />
                <input
                  className="input-dark !border-white/10 !bg-white/[0.04] !text-white"
                  placeholder="Duração (ex: 30-60s ou 7 slides)"
                  value={importForm.duracaoSugerida}
                  onChange={(e) => setImportForm({ ...importForm, duracaoSugerida: e.target.value })}
                />
                <input
                  className="input-dark !border-white/10 !bg-white/[0.04] !text-white"
                  placeholder="Tags separadas por vírgula"
                  value={importForm.tags}
                  onChange={(e) => setImportForm({ ...importForm, tags: e.target.value })}
                />
                <input
                  className="input-dark !border-white/10 !bg-white/[0.04] !text-white"
                  placeholder="@conta de referência (opcional)"
                  value={importForm.sourceNote}
                  onChange={(e) => setImportForm({ ...importForm, sourceNote: e.target.value })}
                />
              </div>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={handleSaveImportedTemplate} className="btn-primary flex-1">
                  Salvar modelo
                </button>
                <button type="button" onClick={() => setShowImportModal(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTemplate && (
          <div className="card-surface mt-10 border-white/10 bg-ink-900/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-white">{selectedTemplate.title}</h2>
              {isGenerating && <FiLoader className="animate-spin text-signal-400" />}
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
                        'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
                        selectedAccount === acc.id
                          ? 'border-signal-500 bg-signal-500/10 text-signal-400'
                          : 'border-white/10 bg-white/[0.03] text-ink-300 hover:bg-white/[0.06]'
                      )}
                    >
                      {acc.identifier === 'tiktok' ? <SiTiktok /> : <FiInstagram />}
                      {acc.name}
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-ink-400">Nenhuma conta conectada no Postiz</span>
                )}
              </div>
            </div>

            <label className="mt-6 block text-sm text-ink-300">Legenda</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              placeholder="A IA gera uma sugestão aqui — edite antes de aprovar."
              className="input-dark resize-none !border-white/10 !bg-white/[0.04] !text-white"
            />

            <div className="mt-6">
              <label className="text-sm text-ink-300">Formato</label>
              <div className="mt-2 flex gap-2">
                {(['post', 'story'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPostType(type)}
                    className={clsx(
                      'rounded-md border px-4 py-1.5 text-sm transition-colors',
                      postType === type
                        ? 'border-signal-500 bg-signal-500/10 text-signal-400'
                        : 'border-white/10 bg-white/[0.03] text-ink-300 hover:bg-white/[0.06]'
                    )}
                  >
                    {type === 'post' ? 'Feed / Reel' : 'Story'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="text-sm text-ink-300">Quando publicar</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setPublishMode('now')}
                  className={clsx(
                    'rounded-md border px-4 py-1.5 text-sm transition-colors',
                    publishMode === 'now'
                      ? 'border-signal-500 bg-signal-500/10 text-signal-400'
                      : 'border-white/10 bg-white/[0.03] text-ink-300'
                  )}
                >
                  Agora
                </button>
                <button
                  onClick={() => setPublishMode('schedule')}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-md border px-4 py-1.5 text-sm transition-colors',
                    publishMode === 'schedule'
                      ? 'border-signal-500 bg-signal-500/10 text-signal-400'
                      : 'border-white/10 bg-white/[0.03] text-ink-300'
                  )}
                >
                  <FiClock /> Agendar
                </button>
              </div>
              {publishMode === 'schedule' && (
                <input
                  type="datetime-local"
                  value={scheduledLocal}
                  onChange={(e) => setScheduledLocal(e.target.value)}
                  className="input-dark mt-3 max-w-xs !border-white/10 !bg-white/[0.04] !text-white"
                />
              )}
            </div>

            <div className="mt-6">
              <label className="text-sm text-ink-300">Vídeo ou imagem</label>
              {mediaFile ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-ink-200">
                    <FiFilm /> {mediaFile.name} ({(mediaFile.size / (1024 * 1024)).toFixed(1)}MB)
                  </span>
                  <button onClick={() => setMediaFile(null)} className="text-ink-400 hover:text-white">
                    <FiX />
                  </button>
                </div>
              ) : (
                <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-6 text-sm text-ink-300 transition-colors hover:border-signal-500/50 hover:text-white">
                  <FiUpload />
                  Escolher vídeo (MP4) ou imagem
                  <input
                    type="file"
                    accept="video/*,image/*"
                    className="hidden"
                    onChange={(e) => handleMediaChange(e.target.files?.[0] || null)}
                  />
                </label>
              )}
              <p className="mt-1 text-xs text-ink-400">
                Limite ~4.4MB neste envio (Vercel). Arquivo maior: comprima ou publique no painel Postiz.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleApproveAndSchedule}
                disabled={isScheduling || !caption}
                className="btn-primary disabled:opacity-50"
              >
                {isScheduling ? <FiLoader className="animate-spin" /> : <FiCheck />}
                {isUploadingMedia
                  ? 'Enviando mídia...'
                  : publishMode === 'schedule'
                    ? 'Aprovar e agendar'
                    : 'Aprovar e publicar'}
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
