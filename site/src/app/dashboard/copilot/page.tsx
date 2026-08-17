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
import { prepareImageForVision, PreparedImage } from '@/lib/imagePrep';
import { MAX_COPILOT_IMAGES } from '@/lib/copilotImages';
import { stripMarkdown, extractCaption, extractTikTokTitle } from '@/lib/textClean';
import { PostPreview } from '@/components/dashboard/PostPreview';
import { aiExecutor, AIExecutorConfig } from '@/services/aiExecutor';
import { supportsVision, supportsWebSearch } from '@/lib/aiProviders';

interface RouteInfo {
  kind: 'skill' | 'agent';
  id: string;
  name: string;
  emoji: string;
  via: 'keyword' | 'llm' | 'fallback';
}

interface PendingAction {
  intent: 'schedule' | 'publish_now';
  integrationId: string;
  integrationName: string;
  integrationType: string;
  content: string;
  postType: 'post' | 'story';
  scheduledFor?: string;
  media: { id: string; path: string }[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  route?: RouteInfo;
  model?: string;
  duration?: number;
  error?: boolean;
  /** Miniaturas das fotos que acompanharam a mensagem do usuário */
  imagePreviews?: string[];
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
  /** Acao de agendamento aguardando confirmacao (echo de ida e volta). */
  pendingAction?: PendingAction | null;
}

interface CopilotStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
  modelMigratedFrom: string | null;
  vision: boolean;
  /** true = o principal é text-only; fotos vão para o fallback */
  visionViaFallback: boolean;
  webSearch: boolean;
  /** true se o servidor tem fallback (em geral DeepSeek) */
  fallbackConfigured: boolean;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  agentCount: number;
}

interface Attachment {
  id: string;
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
    label: 'Post Instagram',
    emoji: '🖼️',
    route: 'skill:post',
    prompt:
      'Monta um post de Instagram (feed/carrossel) com estas fotos. Só a legenda do Instagram — sem TikTok, sem Reels, sem vídeo.',
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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
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
        const slim = messages.slice(-30).map(({ imagePreviews, ...rest }) => {
          void imagePreviews;
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
            visionViaFallback: Boolean(data.visionViaFallback),
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

  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    };
  }, []);

  /** Anexa uma ou mais fotos: versão reduzida para a IA + original no Postiz. */
  const attachFiles = useCallback(async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const images = incoming.filter((f) => f.type.startsWith('image/'));
    if (!images.length) {
      toast.error('Por enquanto só imagens. Para vídeo, use o Content Studio.');
      return;
    }
    if (images.length < incoming.length) {
      toast.error('Arquivos que não são imagem foram ignorados.');
    }

    for (const file of images) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${file.name}: muito grande (máx ${MAX_FILE_MB}MB).`);
        continue;
      }

      let prepared: PreparedImage;
      try {
        prepared = await prepareImageForVision(file);
      } catch (err) {
        toast.error(
          err instanceof Error ? `${file.name}: ${err.message}` : `Falha ao ler ${file.name}.`
        );
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const item: Attachment = {
        id: uid(),
        file,
        previewUrl,
        prepared,
        uploading: true,
      };

      let skipped = false;
      setAttachments((prev) => {
        if (prev.length >= MAX_COPILOT_IMAGES) {
          skipped = true;
          return prev;
        }
        return [...prev, item];
      });
      if (skipped) {
        URL.revokeObjectURL(previewUrl);
        toast.error(`Máximo de ${MAX_COPILOT_IMAGES} fotos (limite do carrossel no Instagram).`);
        break;
      }

      try {
        const form = new FormData();
        form.append('file', file, file.name);
        const res = await authFetch('/api/content-studio/upload-media', {
          method: 'POST',
          body: form,
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json?.error || 'Falha no upload');
        setAttachments((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, media: json.data, uploading: false } : a))
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, uploading: false, uploadFailed: true } : a))
        );
        toast.error(
          err instanceof Error
            ? `${file.name} anexada, mas o envio ao Postiz falhou: ${err.message}`
            : `${file.name} anexada, mas o envio ao Postiz falhou.`
        );
      }
    }
  }, []);

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAttachments = (revoke: boolean) => {
    if (revoke) {
      attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    }
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const send = useCallback(
    async (text: string, forceRoute?: string) => {
      const content = text.trim();
      if ((!content && !attachments.length) || loading) return;
      if (attachments.some((a) => a.uploading)) {
        toast.error('Espere o envio das fotos terminar.');
        return;
      }

      const userMsg: Message = {
        id: uid(),
        role: 'user',
        content:
          content ||
          (attachments.length > 1
            ? `(${attachments.length} fotos anexadas)`
            : '(foto anexada)'),
        imagePreviews: attachments.map((a) => a.previewUrl),
      };
      const history = messages
        .filter((m) => !m.error)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const sentMedia = attachments
        .map((a) => a.media)
        .filter((m): m is DraftMedia => Boolean(m));
      // Rota da última resposta: mantém o mesmo especialista quando a mensagem
      // é um ajuste (senão uma palavra como "direct" muda de agente no meio).
      const lastRoute = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant' && m.route)?.route;
      const lastRouteId = lastRoute ? `${lastRoute.kind}:${lastRoute.id}` : undefined;
      // Acao pendente da ultima resposta: reenviada para o turno de confirmacao.
      const pendingActionToSend = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant' && m.pendingAction)?.pendingAction;
      const sentImages = attachments.map((a) => ({
        dataUrl: a.prepared.dataUrl,
        name: a.prepared.name,
        width: a.prepared.width,
        height: a.prepared.height,
      }));

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
            images: sentImages,
            image: sentImages[0],
            media: sentMedia.length ? sentMedia : undefined,
            pendingAction: pendingActionToSend,
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
            media: sentMedia.length ? sentMedia : undefined,
            imagePreviews: userMsg.imagePreviews,
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
            pendingAction: data.pendingAction ?? undefined,
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
        // Anexos entram no histórico; não revoga as blob URLs das miniaturas.
        clearAttachments(false);
      }
    },
    [loading, messages, nicho, cidade, attachments, byok]
  );

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    if (action.route === 'skill:improve') {
      setInput(action.prompt);
      textareaRef.current?.focus();
      return;
    }
    if (action.route === 'skill:post' && !attachments.length) {
      toast.error('Anexe as fotos primeiro no botão de imagem.');
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
        ? `Legenda + ${m.media.length} foto${m.media.length > 1 ? 's' : ''} enviadas ao Content Studio`
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
    ? (() => {
        const byokVision = supportsVision(byok.provider, byok.model);
        const fbVision =
          Boolean(status?.fallbackConfigured) &&
          supportsVision(status?.fallbackProvider || '', status?.fallbackModel || '');
        return {
          configured: true,
          provider: byok.provider as string,
          model: byok.model,
          vision: byokVision || fbVision,
          visionViaFallback: !byokVision && fbVision,
          webSearch: supportsWebSearch(byok.provider),
          fallbackConfigured: Boolean(status?.fallbackConfigured),
          fallbackProvider: status?.fallbackProvider ?? null,
          fallbackModel: status?.fallbackModel ?? null,
          modelMigratedFrom: null as string | null,
          source: 'byok' as const,
        };
      })()
    : status
      ? {
          configured: status.configured,
          provider: status.provider ?? '',
          model: status.model ?? '',
          vision: status.vision,
          visionViaFallback: status.visionViaFallback,
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
      subtitle="Anexe as fotos e peça o post — o Copilot escreve, você aprova"
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
            const files = e.dataTransfer.files;
            if (files?.length) void attachFiles(files);
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
                  Anexe as fotos e peça <span className="font-semibold">&quot;monta um post&quot;</span> —
                  eu escrevo só a legenda do Instagram (feed ou carrossel). Reels, TikTok e vídeo ficam nos atalhos deles. Se a pergunta for de
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
                          <FiServer size={11} /> fallback {m.fallback?.provider || 'deepseek'}
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

                  {/* Miniaturas das fotos enviadas */}
                  {m.imagePreviews?.length ? (
                    <div
                      className={clsx(
                        'mb-1.5 grid gap-1.5',
                        m.imagePreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-3'
                      )}
                    >
                      {m.imagePreviews.map((src, i) => (
                        // blob: URL local — next/image não otimiza, e não precisa
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${m.id}-img-${i}`}
                          src={src}
                          alt={`foto ${i + 1}`}
                          className="max-h-48 w-full rounded-lg border border-ink-950/10 object-cover"
                        />
                      ))}
                    </div>
                  ) : null}

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

                  {/* Prévia do post (fotos + legenda) — visível antes de publicar */}
                  {m.role === 'assistant' &&
                  !m.error &&
                  (m.imagePreviews?.length ||
                    m.media?.length ||
                    m.pendingAction?.media?.length) ? (
                    <PostPreview
                      className="mt-2 max-w-sm"
                      handle="cyntiarinaldidoces"
                      images={
                        m.imagePreviews?.length
                          ? m.imagePreviews
                          : m.pendingAction?.media?.length
                            ? m.pendingAction.media.map((x) => x.path)
                            : m.media?.map((x) => x.path) || []
                      }
                      caption={
                        m.pendingAction?.content
                          ? m.pendingAction.content
                          : extractCaption(m.content)
                      }
                    />
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
                        {m.media?.length
                          ? `Agendar com ${m.media.length} foto${m.media.length > 1 ? 's' : ''}`
                          : 'Usar no Content Studio'}
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

          {/* Miniaturas dos anexos pendentes */}
          {attachments.length > 0 && (
            <div className="border-t border-ink-950/8 px-4 py-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {attachments.map((a) => (
                  <div key={a.id} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.previewUrl}
                      alt={a.file.name}
                      className="h-16 w-16 rounded-lg border border-ink-950/10 object-cover"
                    />
                    <button
                      onClick={() => removeAttachment(a.id)}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-ink-950 p-0.5 text-white shadow"
                      aria-label={`Remover ${a.file.name}`}
                    >
                      <FiX size={12} />
                    </button>
                    {a.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
                        <FiLoader className="animate-spin text-ink-950/70" size={14} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-950/50">
                {attachments.length} foto{attachments.length > 1 ? 's' : ''}
                {attachments.length > 1 ? ' · carrossel' : ''}
                {' · '}
                {attachments.some((a) => a.uploading) ? (
                  <span className="text-ink-950/60">enviando ao Postiz...</span>
                ) : attachments.some((a) => a.uploadFailed) ? (
                  <span className="text-amber-700">alguma falhou o upload (só legenda)</span>
                ) : (
                  <span className="text-flow-700">pronta{attachments.length > 1 ? 's' : ''} para agendar</span>
                )}
                {attachments.length < MAX_COPILOT_IMAGES ? ` · até ${MAX_COPILOT_IMAGES}` : ''}
              </p>
              {effective && !effective.vision && (
                <p className="mt-0.5 text-[11px] leading-snug text-amber-700">
                  {effective.provider} não lê imagens — descreva as fotos em 1 linha para uma
                  legenda melhor.
                </p>
              )}
              {effective && effective.visionViaFallback && (
                <p className="mt-0.5 text-[11px] leading-snug text-violet-700">
                  Fotos serão lidas pelo {effective.fallbackProvider || 'Claude'} (fallback).
                </p>
              )}
            </div>
          )}

          {/* Composer */}
          <div className="border-t border-ink-950/10 p-4">
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files?.length) void attachFiles(files);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || attachments.length >= MAX_COPILOT_IMAGES}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ink-950/15 text-ink-950/60 transition-colors hover:border-signal-500/40 hover:bg-signal-500/5 hover:text-signal-600 disabled:opacity-40"
                aria-label="Anexar fotos"
                title="Anexar fotos (até 10)"
              >
                <FiImage size={18} />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => {
                  const files = Array.from(e.clipboardData.files);
                  if (files.length) {
                    e.preventDefault();
                    void attachFiles(files);
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
                  attachments.length
                    ? attachments.length > 1
                      ? 'Ex: monta um post com essas fotos...'
                      : 'Ex: monta um post com essa foto pro meu nicho...'
                    : 'Ex: me dá 3 ideias de Reels pra loja de suplementos...'
                }
                className="flex-1 resize-none rounded-lg border border-ink-950/15 px-3 py-2.5 text-sm outline-none focus:border-signal-500 focus:ring-1 focus:ring-signal-500/30"
              />
              <button
                onClick={() => void send(input)}
                disabled={
                  loading ||
                  (!input.trim() && !attachments.length) ||
                  attachments.some((a) => a.uploading)
                }
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-signal-500 text-white transition-colors hover:bg-signal-600 disabled:opacity-40"
                aria-label="Enviar"
              >
                {loading ? <FiLoader className="animate-spin" /> : <FiSend />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-950/40">
              Enter envia · Shift+Enter quebra linha · arraste ou cole várias fotos
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
                            <span className="text-flow-700">
                              {effective.visionViaFallback
                                ? `analisa fotos via ${effective.fallbackProvider || 'deepseek'}`
                                : 'analisa fotos'}
                            </span>
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
                              fallback {effective.fallbackProvider || 'deepseek'}
                              {effective.fallbackModel ? ` · ${effective.fallbackModel}` : ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <FiServer size={12} className="text-ink-950/35" />
                            <span className="text-ink-950/45">sem fallback DeepSeek</span>
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
                  • <span className="font-semibold">anthropic</span> · claude-sonnet-5
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
                <span className="font-semibold text-ink-950">Com foto anexada</span> — monta só o
                post de Instagram (legenda + hashtags). Reels e TikTok são atalhos separados.
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
