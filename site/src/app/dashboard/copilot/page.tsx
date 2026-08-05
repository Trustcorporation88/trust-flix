'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  FiSend,
  FiLoader,
  FiCopy,
  FiTrash2,
  FiAlertCircle,
  FiCheckCircle,
  FiArrowRight,
  FiZap,
  FiImage,
  FiX,
  FiEye,
  FiEyeOff,
  FiKey,
  FiServer,
  FiGlobe,
  FiWifiOff,
  FiExternalLink,
  FiPlayCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { authFetch } from '@/lib/auth/clientFetch';
import { saveContentDraft, DraftMedia } from '@/lib/contentDraft';
import { prepareImageForVision, aspectLabel, PreparedImage } from '@/lib/imagePrep';
import { stripMarkdown, extractCaption, extractTikTokTitle } from '@/lib/textClean';
import { aiExecutor, AIExecutorConfig } from '@/services/aiExecutor';
import { supportsVision, supportsWebSearch } from '@/lib/aiProviders';

interface RouteInfo {
  kind: 'skill' | 'agent';
  id: string;
  name: string;
  emoji: string;
  via: 'keyword' | 'llm' | 'fallback';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  route?: RouteInfo;
  model?: string;
  duration?: number;
  error?: boolean;
  /** Miniatura da foto que acompanhou a mensagem do usuário */
  imagePreview?: string;
  /** Mídia no Postiz, para levar ao Content Studio junto da legenda */
  media?: DraftMedia[];
  /** false quando havia foto mas o provedor não sabe ler imagem */
  visionUsed?: boolean;
  /** Links citados quando a resposta veio de busca na web */
  sources?: { url: string; title: string }[];
  /** Vídeos reais para abrir e copiar (Reels/TikTok/Shorts) */
  videoSources?: { url: string; title: string }[];
  /** Artigos de apoio, separados dos vídeos */
  articleSources?: { url: string; title: string }[];
  /** Etapas do pipeline multi-agente (Reels + Post pronto) */
  pipelineSteps?: { id: string; label: string; ok: boolean }[];
  /** Agentes do Arsenal usados na resposta */
  agentsUsed?: string[];
  /** true = provedor principal falhou e o fallback (Anthropic) atendeu */
  fallbackUsed?: boolean;
  fallback?: { provider: string; model: string; reason?: string };
  /** Instagram autorizado usado como base */
  profile?: {
    handle: string;
    accountName: string;
    postsAnalyzed: number;
    reelsAnalyzed?: number;
    storiesAnalyzed?: number;
    feedAnalyzed?: number;
    mediaCount?: number;
    graphUsed?: boolean;
    notice?: string | null;
  };
  /** true = resposta baseada em busca real na web */
  webSearchUsed?: boolean;
  /** true = a skill pedia busca mas o provedor não oferece */
  webSearchUnavailable?: boolean;
}

interface CopilotStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
  modelMigratedFrom: string | null;
  vision: boolean;
  webSearch: boolean;
  /** true se o servidor tem ANTHROPIC_API_KEY / COPILOT_AI_FALLBACK_API_KEY */
  fallbackConfigured: boolean;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  agentCount: number;
}

interface Attachment {
  file: File;
  previewUrl: string;
  prepared: PreparedImage;
  /** Referência no Postiz — preenchida após o upload concluir */
  media?: DraftMedia;
  uploading: boolean;
  uploadFailed?: boolean;
}

const STORAGE_KEY = 'sf_copilot_thread';
const NICHO_KEY = 'sf_copilot_nicho';
const CIDADE_KEY = 'sf_copilot_cidade';
const MAX_FILE_MB = 8;

const QUICK_ACTIONS: { label: string; emoji: string; route: string; prompt: string }[] = [
  {
    label: 'Reels + Post pronto',
    emoji: '🚀',
    route: 'skill:reels-pipeline',
    prompt:
      'Quero um Reels + post pronto: busca referências e usa StoryAds, Dissecação, doug.tensão e Ugly Copy.',
  },
  {
    label: 'Ideias do meu IG',
    emoji: '📸',
    route: 'skill:profile-ideas',
    prompt:
      'Analisa meu Instagram @cyntiarinaldidoces (conta autorizada) e me dá ideias de Reels e posts no tom do perfil.',
  },
  {
    label: 'Reels em alta',
    emoji: '🔥',
    route: 'skill:trends',
    prompt: 'Pesquisa o que está em alta em Reels no meu nicho agora e me dá o molde pra copiar.',
  },
  {
    label: 'Montar post',
    emoji: '🖼️',
    route: 'skill:post',
    prompt: 'Monta um post completo com esta foto.',
  },
  {
    label: 'Ideias de Reels',
    emoji: '🎬',
    route: 'skill:reels',
    prompt: 'Me dá ideias de Reels que funcionam pro meu nicho, com roteiro pronto.',
  },
  {
    label: 'Legenda de post',
    emoji: '✍️',
    route: 'skill:caption',
    prompt: 'Escreve 3 legendas pro meu próximo post.',
  },
  {
    label: 'Plano da semana',
    emoji: '📅',
    route: 'skill:plan',
    prompt: 'Monta meu plano de conteúdo dos próximos 7 dias.',
  },
  {
    label: 'Hashtags',
    emoji: '#️⃣',
    route: 'skill:hashtags',
    prompt: 'Monta um conjunto de hashtags pro meu nicho.',
  },
  {
    label: 'Melhorar texto',
    emoji: '🔧',
    route: 'skill:improve',
    prompt: 'Melhora este texto:\n\n',
  },
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [nicho, setNicho] = useState('');
  const [cidade, setCidade] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<CopilotStatus | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  /** Chave própria do usuário, salva em Configurações. Tem prioridade sobre a do servidor. */
  const [byok, setByok] = useState<AIExecutorConfig | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restaura conversa e nicho
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw) as Message[]);
      const savedNicho = localStorage.getItem(NICHO_KEY);
      if (savedNicho) setNicho(savedNicho);
      const savedCidade = localStorage.getItem(CIDADE_KEY);
      if (savedCidade) setCidade(savedCidade);
    } catch {
      /* conversa corrompida — começa limpa */
    }
    // Chave própria configurada em Configurações (mesma do Arsenal de Agentes).
    setByok(aiExecutor.getCurrentProvider());
  }, []);

  // Persiste conversa (sem as miniaturas, que estourariam a cota)
  useEffect(() => {
    if (messages.length) {
      try {
        const slim = messages.slice(-30).map(({ imagePreview, ...rest }) => {
          void imagePreview;
          return rest;
        });
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
      } catch {
        /* quota estourada — ignora */
      }
    }
  }, [messages]);

  // Diagnóstico de configuração
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/copilot/chat');
        const data = await res.json();
        if (data?.success) {
          setStatus({
            configured: Boolean(data.configured),
            provider: data.provider,
            model: data.model,
            modelMigratedFrom: data.modelMigratedFrom ?? null,
            vision: Boolean(data.vision),
            webSearch: Boolean(data.webSearch),
            fallbackConfigured: Boolean(data.fallbackConfigured),
            fallbackProvider: data.fallbackProvider ?? null,
            fallbackModel: data.fallbackModel ?? null,
            agentCount: data.agentCount ?? 0,
          });
        }
      } catch {
        /* status é opcional */
      }
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Libera a URL da miniatura ao trocar/remover anexo
  useEffect(() => {
    return () => {
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    };
  }, [attachment?.previewUrl]);

  /** Anexa a foto: prepara versão reduzida para a IA e sobe a original ao Postiz. */
  const attachFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por enquanto só imagens. Para vídeo, use o Content Studio.');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`Imagem muito grande (máx ${MAX_FILE_MB}MB).`);
      return;
    }

    let prepared: PreparedImage;
    try {
      prepared = await prepareImageForVision(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao ler a imagem.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAttachment({ file, previewUrl, prepared, uploading: true });

    // Sobe a ORIGINAL para o Postiz — assim o post já sai pronto para agendar.
    try {
      const form = new FormData();
      form.append('file', file, file.name);
      const res = await authFetch('/api/content-studio/upload-media', {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || 'Falha no upload');
      setAttachment((prev) => (prev ? { ...prev, media: json.data, uploading: false } : prev));
    } catch (err) {
      // A legenda ainda funciona — só o agendamento direto fica indisponível.
      setAttachment((prev) =>
        prev ? { ...prev, uploading: false, uploadFailed: true } : prev
      );
      toast.error(
        err instanceof Error
          ? `Foto anexada, mas o envio ao Postiz falhou: ${err.message}`
          : 'Foto anexada, mas o envio ao Postiz falhou.'
      );
    }
  }, []);

  const removeAttachment = () => {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const send = useCallback(
    async (text: string, forceRoute?: string) => {
      const content = text.trim();
      if ((!content && !attachment) || loading) return;

      const userMsg: Message = {
        id: uid(),
        role: 'user',
        content: content || '(foto anexada)',
        imagePreview: attachment?.previewUrl,
      };
      const history = messages
        .filter((m) => !m.error)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const sentMedia = attachment?.media ? [attachment.media] : undefined;
      // Rota da última resposta: mantém o mesmo especialista quando a mensagem
      // é um ajuste (senão uma palavra como "direct" muda de agente no meio).
      const lastRoute = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant' && m.route)?.route;
      const lastRouteId = lastRoute ? `${lastRoute.kind}:${lastRoute.id}` : undefined;
      const sentImage = attachment
        ? {
            dataUrl: attachment.prepared.dataUrl,
            name: attachment.prepared.name,
            width: attachment.prepared.width,
            height: attachment.prepared.height,
          }
        : undefined;

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const res = await authFetch('/api/copilot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            history,
            forceRoute,
            lastRoute: lastRouteId,
            image: sentImage,
            nicho: nicho.trim() || undefined,
            cidade: cidade.trim() || undefined,
            // Conta Instagram autorizada no Postiz (site pessoal).
            instagramHandle: 'cyntiarinaldidoces',
            // Se o usuário configurou a própria chave em Configurações, ela tem
            // prioridade — inclusive habilita visão sem mexer na Vercel.
            ...(byok
              ? {
                  apiKey: byok.apiKey,
                  provider: byok.provider,
                  model: byok.model,
                  baseUrl: byok.baseUrl,
                }
              : {}),
          }),
        });
        const data = await res.json();

        if (!data?.success) {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: 'assistant',
              content: data?.error || 'Não consegui responder agora.',
              error: true,
            },
          ]);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: data.reply,
            route: data.route,
            model: data.model,
            duration: data.duration,
            media: sentMedia,
            visionUsed: data.hadImage ? Boolean(data.visionUsed) : undefined,
            sources: Array.isArray(data.sources) && data.sources.length ? data.sources : undefined,
            videoSources:
              Array.isArray(data.videoSources) && data.videoSources.length
                ? data.videoSources
                : undefined,
            articleSources:
              Array.isArray(data.articleSources) && data.articleSources.length
                ? data.articleSources
                : undefined,
            pipelineSteps: Array.isArray(data.pipeline?.steps) ? data.pipeline.steps : undefined,
            agentsUsed: Array.isArray(data.pipeline?.agentsUsed)
              ? data.pipeline.agentsUsed
              : undefined,
            fallbackUsed: data.fallbackUsed || undefined,
            fallback: data.fallback || undefined,
            profile: data.profile || undefined,
            webSearchUsed: data.webSearchUsed || undefined,
            webSearchUnavailable: data.webSearchUnavailable || undefined,
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: err instanceof Error ? err.message : 'Falha de rede.',
            error: true,
          },
        ]);
      } finally {
        setLoading(false);
        // O anexo é consumido pela mensagem; a miniatura segue no histórico.
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [loading, messages, nicho, cidade, attachment, byok]
  );

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    if (action.route === 'skill:improve') {
      setInput(action.prompt);
      textareaRef.current?.focus();
      return;
    }
    if (action.route === 'skill:post' && !attachment) {
      toast.error('Anexe uma foto primeiro no botão de imagem.');
      fileInputRef.current?.click();
      return;
    }
    void send(action.prompt, action.route);
  };

  const copy = (text: string) => {
    // Remove markdown: o destino é Instagram/TikTok, que não renderizam.
    navigator.clipboard.writeText(stripMarkdown(text));
    toast.success('Copiado');
  };

  const sendToStudio = (m: Message) => {
    saveContentDraft({
      caption: extractCaption(m.content),
      tiktokTitle: extractTikTokTitle(m.content),
      media: m.media,
      source: 'copilot',
    });
    toast.success(
      m.media?.length
        ? 'Legenda + foto enviadas ao Content Studio'
        : 'Legenda enviada ao Content Studio'
    );
  };

  const clearThread = () => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
    toast.success('Conversa limpa');
  };

  const saveNicho = (value: string) => {
    setNicho(value);
    try {
      localStorage.setItem(NICHO_KEY, value);
    } catch {
      /* ignora */
    }
  };

  const saveCidade = (value: string) => {
    setCidade(value);
    try {
      localStorage.setItem(CIDADE_KEY, value);
    } catch {
      /* ignora */
    }
  };

  /**
   * Config que o Copilot vai realmente usar. A chave do usuário (Configurações)
   * vence a do servidor, então o painel precisa refletir isso — e a checagem de
   * visão é feita aqui no cliente, já que o servidor não conhece a chave BYOK.
   */
  const effective = byok
    ? {
        configured: true,
        provider: byok.provider as string,
        model: byok.model,
        vision: supportsVision(byok.provider, byok.model),
        webSearch: supportsWebSearch(byok.provider),
        // Fallback é sempre server-side (env). BYOK não carrega a chave Anthropic no browser.
        fallbackConfigured: Boolean(status?.fallbackConfigured),
        fallbackProvider: status?.fallbackProvider ?? null,
        fallbackModel: status?.fallbackModel ?? null,
        modelMigratedFrom: null as string | null,
        source: 'byok' as const,
      }
    : status
      ? {
          configured: status.configured,
          provider: status.provider ?? '',
          model: status.model ?? '',
          vision: status.vision,
          webSearch: status.webSearch,
          fallbackConfigured: status.fallbackConfigured,
          fallbackProvider: status.fallbackProvider,
          fallbackModel: status.fallbackModel,
          modelMigratedFrom: status.modelMigratedFrom,
          source: 'server' as const,
        }
      : null;

  return (
    <DashboardShell
      title="Copilot"
      subtitle="Anexe uma foto e peça o post — o Copilot escreve, você aprova"
      actions={
        messages.length > 0 ? (
          <button
            onClick={clearThread}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-950/15 px-3 py-2 text-sm font-semibold text-ink-950/70 hover:bg-ink-950/5"
          >
            <FiTrash2 size={15} /> Limpar
          </button>
        ) : undefined
      }
    >
      {/* Aviso de configuração */}
      {effective && !effective.configured && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <FiAlertCircle className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Copilot sem chave de IA.</p>
            <p className="mt-1">
              Você tem duas opções: salvar sua própria chave em{' '}
              <Link href="/dashboard/settings" className="font-semibold underline">
                Configurações
              </Link>{' '}
              (vale só neste navegador, efeito imediato), ou definir{' '}
              <code className="rounded bg-amber-100 px-1">COPILOT_AI_API_KEY</code> nas variáveis de
              ambiente da Vercel (vale para todos).
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* ── Coluna do chat ── */}
        <div
          className={clsx(
            'flex min-h-[600px] flex-col rounded-xl border bg-white transition-colors',
            dragOver ? 'border-signal-500 ring-2 ring-signal-500/20' : 'border-ink-950/10'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void attachFile(file);
          }}
        >
          {/* Thread */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5" style={{ maxHeight: '62vh' }}>
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-500/10 text-2xl">
                  🤖
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-ink-950">
                  Como posso ajudar no seu conteúdo?
                </h3>
                <p className="mt-2 max-w-md text-sm text-ink-950/55">
                  Anexe uma foto e peça <span className="font-semibold">&quot;monta um post&quot;</span> —
                  eu escrevo legenda, título de TikTok, hashtags e sugiro o formato. Se a pergunta for de
                  estratégia ou copy de vendas, encaminho para um dos {status?.agentCount ?? 18} agentes
                  especialistas automaticamente.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.route}
                      onClick={() => handleQuickAction(a)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink-950/12 bg-stone-50 px-3.5 py-2 text-sm font-medium text-ink-950/75 transition-colors hover:border-signal-500/40 hover:bg-signal-500/5"
                    >
                      <span>{a.emoji}</span> {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div className={clsx('max-w-[85%]', m.role === 'user' && 'order-2')}>
                  {/* Badge de roteamento */}
                  {m.role === 'assistant' && m.route && (
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-signal-500/10 px-2 py-0.5 text-xs font-semibold text-signal-700">
                        {m.route.emoji} {m.route.name}
                      </span>
                      {m.visionUsed === true && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-flow-600/10 px-2 py-0.5 text-xs font-semibold text-flow-700">
                          <FiEye size={11} /> foto analisada
                        </span>
                      )}
                      {m.visionUsed === false && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <FiEyeOff size={11} /> foto não lida
                        </span>
                      )}
                      {m.webSearchUsed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-flow-600/10 px-2 py-0.5 text-xs font-semibold text-flow-700">
                          <FiGlobe size={11} /> pesquisado na web
                        </span>
                      )}
                      {m.webSearchUnavailable && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <FiWifiOff size={11} /> sem acesso à web
                        </span>
                      )}
                      {m.fallbackUsed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
                          <FiServer size={11} /> fallback {m.fallback?.provider || 'anthropic'}
                        </span>
                      )}
                      {m.profile?.handle && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-800">
                          @{m.profile.handle}
                          {typeof m.profile.reelsAnalyzed === 'number' ||
                          typeof m.profile.storiesAnalyzed === 'number'
                            ? ` · ${m.profile.reelsAnalyzed ?? 0} reels · ${m.profile.storiesAnalyzed ?? 0} stories · ${m.profile.feedAnalyzed ?? 0} feed`
                            : typeof m.profile.postsAnalyzed === 'number'
                              ? ` · ${m.profile.postsAnalyzed} posts`
                              : ''}
                          {typeof m.profile.mediaCount === 'number' && m.profile.mediaCount > 0
                            ? ` · ${m.profile.mediaCount} mídias`
                            : ''}
                          {m.profile.graphUsed ? ' · graph' : ''}
                        </span>
                      )}
                      {m.profile?.notice && (
                        <span
                          className="inline-flex max-w-full items-start gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                          title={m.profile.notice}
                        >
                          perfil: {m.profile.notice.slice(0, 90)}
                          {m.profile.notice.length > 90 ? '…' : ''}
                        </span>
                      )}
                      <span className="text-[11px] text-ink-950/40">
                        {m.route.kind === 'agent' ? 'agente' : 'skill'}
                        {m.route.via === 'llm' && ' · roteado por IA'}
                        {m.duration ? ` · ${(m.duration / 1000).toFixed(1)}s` : ''}
                      </span>
                    </div>
                  )}

                  {/* Miniatura da foto enviada */}
                  {m.imagePreview && (
                    // blob: URL local — next/image não otimiza, e não precisa
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imagePreview}
                      alt="foto anexada"
                      className="mb-1.5 max-h-48 w-auto max-w-full rounded-lg border border-ink-950/10 object-contain"
                    />
                  )}

                  <div
                    className={clsx(
                      'rounded-xl px-4 py-3 text-sm leading-relaxed',
                      m.role === 'user'
                        ? 'bg-ink-950 text-white'
                        : m.error
                          ? 'border border-red-200 bg-red-50 text-red-800'
                          : 'border border-ink-950/10 bg-stone-50 text-ink-950'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>

                  {/* Pipeline multi-agente */}
                  {m.agentsUsed?.length || m.pipelineSteps?.length ? (
                    <div className="mt-2 rounded-lg border border-ink-950/10 bg-white p-3">
                      {m.agentsUsed?.length ? (
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-950/45">
                          Agentes: {m.agentsUsed.join(' → ')}
                        </p>
                      ) : null}
                      {m.pipelineSteps?.length ? (
                        <ul className="mt-2 space-y-1">
                          {m.pipelineSteps.map((st) => (
                            <li
                              key={st.id}
                              className="flex items-center gap-2 text-xs text-ink-950/70"
                            >
                              <span
                                className={
                                  st.ok
                                    ? 'inline-block h-1.5 w-1.5 rounded-full bg-emerald-500'
                                    : 'inline-block h-1.5 w-1.5 rounded-full bg-amber-500'
                                }
                              />
                              {st.label}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Vídeos para copiar — o entregável da skill "Reels em alta" */}
                  {m.videoSources?.length ? (
                    <div className="mt-2 rounded-lg border border-signal-600/25 bg-signal-50/60 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-signal-700">
                        <FiPlayCircle size={12} /> Reels para abrir e copiar ({m.videoSources.length})
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {m.videoSources.map((s) => (
                          <li key={s.url}>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-1.5 text-xs font-medium text-signal-700 hover:underline"
                            >
                              <FiExternalLink size={11} className="mt-0.5 shrink-0" />
                              <span className="break-words">{s.title}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Fontes citadas — permite conferir se a tendência é real */}
                  {(m.articleSources ?? m.sources)?.length ? (
                    <div className="mt-2 rounded-lg border border-ink-950/10 bg-white p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-950/45">
                        <FiGlobe size={12} /> Fontes ({(m.articleSources ?? m.sources ?? []).length})
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {(m.articleSources ?? m.sources ?? []).map((s) => (
                          <li key={s.url}>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-1.5 text-xs text-signal-600 hover:underline"
                            >
                              <FiExternalLink size={11} className="mt-0.5 shrink-0" />
                              <span className="break-words">{s.title}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Ações da resposta */}
                  {m.role === 'assistant' && !m.error && (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <button
                        onClick={() => copy(m.content)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-ink-950/50 hover:text-ink-950"
                      >
                        <FiCopy size={12} /> Copiar
                      </button>
                      <Link
                        href="/dashboard/content-studio"
                        onClick={() => sendToStudio(m)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-signal-600 hover:text-signal-700"
                      >
                        <FiArrowRight size={12} />
                        {m.media?.length ? 'Agendar com a foto' : 'Usar no Content Studio'}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl border border-ink-950/10 bg-stone-50 px-4 py-3 text-sm text-ink-950/60">
                  <FiLoader className="animate-spin" size={14} />
                  Escolhendo o especialista e escrevendo...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Atalhos (quando já há conversa) */}
          {messages.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-ink-950/8 px-5 py-3">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.route}
                  onClick={() => handleQuickAction(a)}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-full border border-ink-950/12 px-3 py-1.5 text-xs font-medium text-ink-950/70 transition-colors hover:border-signal-500/40 hover:bg-signal-500/5 disabled:opacity-50"
                >
                  <span>{a.emoji}</span> {a.label}
                </button>
              ))}
            </div>
          )}

          {/* Miniatura do anexo pendente */}
          {attachment && (
            <div className="flex items-center gap-3 border-t border-ink-950/8 px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment.previewUrl}
                alt="prévia"
                className="h-16 w-16 rounded-lg border border-ink-950/10 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-950">{attachment.file.name}</p>
                <p className="text-xs text-ink-950/50">
                  {aspectLabel(attachment.prepared.width, attachment.prepared.height)}
                  {' · '}
                  {attachment.uploading ? (
                    <span className="text-ink-950/60">enviando ao Postiz...</span>
                  ) : attachment.uploadFailed ? (
                    <span className="text-amber-700">só legenda (upload falhou)</span>
                  ) : (
                    <span className="text-flow-700">pronta para agendar</span>
                  )}
                </p>
                {effective && !effective.vision && (
                  <p className="mt-0.5 text-[11px] leading-snug text-amber-700">
                    {effective.provider} não lê imagens — descreva a foto em 1 linha para uma legenda
                    melhor.
                  </p>
                )}
              </div>
              <button
                onClick={removeAttachment}
                className="shrink-0 rounded-lg p-2 text-ink-950/40 hover:bg-ink-950/5 hover:text-ink-950"
                aria-label="Remover foto"
              >
                <FiX size={16} />
              </button>
            </div>
          )}

          {/* Composer */}
          <div className="border-t border-ink-950/10 p-4">
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void attachFile(file);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ink-950/15 text-ink-950/60 transition-colors hover:border-signal-500/40 hover:bg-signal-500/5 hover:text-signal-600 disabled:opacity-40"
                aria-label="Anexar foto"
                title="Anexar foto"
              >
                <FiImage size={18} />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => {
                  const file = Array.from(e.clipboardData.files)[0];
                  if (file) {
                    e.preventDefault();
                    void attachFile(file);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={2}
                placeholder={
                  attachment
                    ? 'Ex: monta um post com essa foto pro meu nicho...'
                    : 'Ex: me dá 3 ideias de Reels pra loja de suplementos...'
                }
                className="flex-1 resize-none rounded-lg border border-ink-950/15 px-3 py-2.5 text-sm outline-none focus:border-signal-500 focus:ring-1 focus:ring-signal-500/30"
              />
              <button
                onClick={() => void send(input)}
                disabled={loading || (!input.trim() && !attachment)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-signal-500 text-white transition-colors hover:bg-signal-600 disabled:opacity-40"
                aria-label="Enviar"
              >
                {loading ? <FiLoader className="animate-spin" /> : <FiSend />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-950/40">
              Enter envia · Shift+Enter quebra linha · arraste ou cole uma imagem
            </p>
          </div>
        </div>

        {/* ── Coluna lateral ── */}
        <div className="space-y-4">
          {/* Nicho */}
          <div className="rounded-xl border border-ink-950/10 bg-white p-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-950/45">
              Seu nicho
            </label>
            <input
              value={nicho}
              onChange={(e) => saveNicho(e.target.value)}
              placeholder="ex: loja de suplementos"
              className="mt-2 w-full rounded-lg border border-ink-950/15 px-3 py-2 text-sm outline-none focus:border-signal-500"
            />
            <p className="mt-2 text-xs text-ink-950/50">
              Preenchendo aqui, todas as respostas vêm adaptadas ao seu nicho.
            </p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-950/45">
              Sua cidade
            </label>
            <input
              value={cidade}
              onChange={(e) => saveCidade(e.target.value)}
              placeholder="ex: Bauru"
              className="mt-2 w-full rounded-lg border border-ink-950/15 px-3 py-2 text-sm outline-none focus:border-signal-500"
            />
            <p className="mt-2 text-xs text-ink-950/50">
              Usada na pesquisa de tendências: traz o que acontece na sua região em vez de
              tendência global.
            </p>
          </div>

          {/* Status */}
          <div className="rounded-xl border border-ink-950/10 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-950/45">
              Motor de IA
            </p>
            {effective ? (
              <div className="mt-2 flex items-start gap-2">
                {effective.configured ? (
                  <FiCheckCircle className="mt-0.5 shrink-0 text-flow-600" size={15} />
                ) : (
                  <FiAlertCircle className="mt-0.5 shrink-0 text-amber-500" size={15} />
                )}
                <div className="min-w-0 text-sm">
                  {effective.configured ? (
                    <>
                      <p className="font-semibold text-ink-950">{effective.provider}</p>
                      <p className="text-xs text-ink-950/50">{effective.model}</p>
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-ink-950/[0.05] px-2 py-0.5 text-[11px] font-medium text-ink-950/60">
                        {effective.source === 'byok' ? (
                          <>
                            <FiKey size={10} /> sua chave
                          </>
                        ) : (
                          <>
                            <FiServer size={10} /> chave do servidor
                          </>
                        )}
                      </p>
                      <p className="mt-1.5 inline-flex items-center gap-1 text-xs">
                        {effective.vision ? (
                          <>
                            <FiEye size={12} className="text-flow-600" />
                            <span className="text-flow-700">analisa fotos</span>
                          </>
                        ) : (
                          <>
                            <FiEyeOff size={12} className="text-amber-600" />
                            <span className="text-amber-700">não analisa fotos</span>
                          </>
                        )}
                      </p>
                      <p className="inline-flex items-center gap-1 text-xs">
                        {effective.webSearch ? (
                          <>
                            <FiGlobe size={12} className="text-flow-600" />
                            <span className="text-flow-700">pesquisa na web</span>
                          </>
                        ) : (
                          <>
                            <FiWifiOff size={12} className="text-amber-600" />
                            <span className="text-amber-700">sem pesquisa na web</span>
                          </>
                        )}
                      </p>
                      <p className="mt-1.5 inline-flex items-center gap-1 text-xs">
                        {effective.fallbackConfigured ? (
                          <>
                            <FiServer size={12} className="text-violet-600" />
                            <span className="text-violet-700">
                              fallback {effective.fallbackProvider || 'anthropic'}
                              {effective.fallbackModel ? ` · ${effective.fallbackModel}` : ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <FiServer size={12} className="text-ink-950/35" />
                            <span className="text-ink-950/45">sem fallback Anthropic</span>
                          </>
                        )}
                      </p>
                      {effective.modelMigratedFrom && (
                        <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] leading-snug text-amber-800">
                          <span className="font-semibold">{effective.modelMigratedFrom}</span> foi
                          descontinuado — migrado automaticamente. Atualize a variável na Vercel para{' '}
                          <span className="font-semibold">{effective.model}</span>.
                        </p>
                      )}
                      {effective.source === 'server' && (
                        <Link
                          href="/dashboard/settings"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-signal-600 hover:text-signal-700"
                        >
                          Usar minha própria chave <FiArrowRight size={11} />
                        </Link>
                      )}
                    </>
                  ) : (
                    <p className="text-ink-950/60">Chave não configurada</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-950/40">verificando...</p>
            )}
          </div>

          {/* Visão: como habilitar */}
          {effective?.configured && !effective.vision && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <FiEyeOff className="text-amber-600" size={15} />
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Ler fotos
                </p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-amber-900">
                O <span className="font-semibold">{effective.provider}</span> é text-only: a foto é
                anexada ao post, mas ele não vê o conteúdo dela.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-amber-900">
                Para o Copilot descrever a foto sozinho, salve em{' '}
                <Link href="/dashboard/settings" className="font-semibold underline">
                  Configurações
                </Link>{' '}
                uma chave de provedor com visão:
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs text-amber-900">
                <li>
                  • <span className="font-semibold">google</span> · gemini-1.5-flash
                </li>
                <li>
                  • <span className="font-semibold">openai</span> · gpt-4o-mini
                </li>
                <li>
                  • <span className="font-semibold">anthropic</span> · claude-3-5-sonnet
                </li>
              </ul>
              <p className="mt-2 text-[11px] leading-snug text-amber-800">
                Vale só neste navegador e tem efeito imediato — não precisa mexer na Vercel.
              </p>
            </div>
          )}

          {/* Como funciona */}
          <div className="rounded-xl border border-ink-950/10 bg-white p-4">
            <div className="flex items-center gap-2">
              <FiZap className="text-signal-500" size={15} />
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-950/45">
                Roteamento
              </p>
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink-950/60">
              <li>
                <span className="font-semibold text-ink-950">🚀 Reels + Post pronto</span> — pipeline
                StoryAds → Dissecação → doug.tensão/Ugly Copy com busca de referências.
              </li>
              <li>
                <span className="font-semibold text-ink-950">📸 Ideias do meu IG</span> — lê
                Reels, Stories, Feed e mídias do Instagram autorizado (@cyntiarinaldidoces).
              </li>
              <li>
                <span className="font-semibold text-ink-950">🔥 Reels em alta</span> — pesquisa na
                web o que está performando agora, com links das fontes.
              </li>
              <li>
                <span className="font-semibold text-ink-950">Com foto anexada</span> — monta o post
                completo: legenda, título TikTok, hashtags e formato.
              </li>
              <li>
                <span className="font-semibold text-ink-950">Skills de conteúdo</span> — legenda,
                Reels, hashtags, plano semanal.
              </li>
              <li>
                <span className="font-semibold text-ink-950">
                  {status?.agentCount ?? 18} agentes especialistas
                </span>{' '}
                — oferta, preço, posicionamento, público e copy de vendas.
              </li>
            </ul>
            <Link
              href="/dashboard/agents"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-signal-600 hover:text-signal-700"
            >
              Ver todos os agentes <FiArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
