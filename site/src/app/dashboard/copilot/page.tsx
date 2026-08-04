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
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { authFetch } from '@/lib/auth/clientFetch';
import { saveContentDraft } from '@/lib/contentDraft';

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
}

interface CopilotStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
  modelMigratedFrom: string | null;
  agentCount: number;
}

const STORAGE_KEY = 'sf_copilot_thread';
const NICHO_KEY = 'sf_copilot_nicho';

const QUICK_ACTIONS: { label: string; emoji: string; route: string; prompt: string }[] = [
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
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<CopilotStatus | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Restaura conversa e nicho
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw) as Message[]);
      const savedNicho = localStorage.getItem(NICHO_KEY);
      if (savedNicho) setNicho(savedNicho);
    } catch {
      /* conversa corrompida — começa limpa */
    }
  }, []);

  // Persiste conversa
  useEffect(() => {
    if (messages.length) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
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

  const send = useCallback(
    async (text: string, forceRoute?: string) => {
      const content = text.trim();
      if (!content || loading) return;

      const userMsg: Message = { id: uid(), role: 'user', content };
      const history = messages
        .filter((m) => !m.error)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

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
            nicho: nicho.trim() || undefined,
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
      }
    },
    [loading, messages, nicho]
  );

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    if (action.route === 'skill:improve') {
      // Precisa do texto do usuário — só preenche o campo
      setInput(action.prompt);
      textareaRef.current?.focus();
      return;
    }
    void send(action.prompt, action.route);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado');
  };

  const sendToStudio = (text: string) => {
    saveContentDraft({ caption: text, source: 'copilot' });
    toast.success('Enviado para o Content Studio');
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

  return (
    <DashboardShell
      title="Copilot"
      subtitle="Pergunte qualquer coisa — o Copilot escolhe o especialista certo automaticamente"
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
      {status && !status.configured && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <FiAlertCircle className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Copilot sem chave de IA.</p>
            <p className="mt-1">
              Defina <code className="rounded bg-amber-100 px-1">COPILOT_AI_API_KEY</code> (ou reaproveite{' '}
              <code className="rounded bg-amber-100 px-1">CONTENT_STUDIO_AI_API_KEY</code>) nas variáveis de
              ambiente da Vercel. Aceita chave da OpenAI, Anthropic, DeepSeek, Google, Groq, Mistral ou
              OpenRouter.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* ── Coluna do chat ── */}
        <div className="flex min-h-[600px] flex-col rounded-xl border border-ink-950/10 bg-white">
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
                  Peça legendas, ideias de Reels, hashtags ou um plano semanal. Se a pergunta for de
                  estratégia, oferta ou copy de vendas, eu encaminho para um dos{' '}
                  {status?.agentCount ?? 18} agentes especialistas automaticamente.
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
                      <span className="text-[11px] text-ink-950/40">
                        {m.route.kind === 'agent' ? 'agente' : 'skill'}
                        {m.route.via === 'llm' && ' · roteado por IA'}
                        {m.duration ? ` · ${(m.duration / 1000).toFixed(1)}s` : ''}
                      </span>
                    </div>
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
                        onClick={() => sendToStudio(m.content)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-signal-600 hover:text-signal-700"
                      >
                        <FiArrowRight size={12} /> Usar no Content Studio
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

          {/* Composer */}
          <div className="border-t border-ink-950/10 p-4">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={2}
                placeholder="Ex: me dá 3 ideias de Reels pra loja de suplementos..."
                className="flex-1 resize-none rounded-lg border border-ink-950/15 px-3 py-2.5 text-sm outline-none focus:border-signal-500 focus:ring-1 focus:ring-signal-500/30"
              />
              <button
                onClick={() => void send(input)}
                disabled={loading || !input.trim()}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-signal-500 text-white transition-colors hover:bg-signal-600 disabled:opacity-40"
                aria-label="Enviar"
              >
                {loading ? <FiLoader className="animate-spin" /> : <FiSend />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-950/40">
              Enter envia · Shift+Enter quebra linha
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
          </div>

          {/* Status */}
          <div className="rounded-xl border border-ink-950/10 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-950/45">Motor de IA</p>
            {status ? (
              <div className="mt-2 flex items-start gap-2">
                {status.configured ? (
                  <FiCheckCircle className="mt-0.5 shrink-0 text-flow-600" size={15} />
                ) : (
                  <FiAlertCircle className="mt-0.5 shrink-0 text-amber-500" size={15} />
                )}
                <div className="text-sm">
                  {status.configured ? (
                    <>
                      <p className="font-semibold text-ink-950">{status.provider}</p>
                      <p className="text-xs text-ink-950/50">{status.model}</p>
                      {status.modelMigratedFrom && (
                        <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] leading-snug text-amber-800">
                          <span className="font-semibold">{status.modelMigratedFrom}</span> foi
                          descontinuado — migrado automaticamente. Atualize a variável na Vercel para{' '}
                          <span className="font-semibold">{status.model}</span>.
                        </p>
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
                <span className="font-semibold text-ink-950">Skills de conteúdo</span> — legenda, Reels,
                hashtags, plano semanal.
              </li>
              <li>
                <span className="font-semibold text-ink-950">
                  {status?.agentCount ?? 18} agentes especialistas
                </span>{' '}
                — oferta, preço, posicionamento, público e copy de vendas.
              </li>
              <li>
                A escolha é automática: por palavra-chave primeiro e, se não bastar, um classificador de IA
                decide.
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
