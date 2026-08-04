import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';
import {
  COPILOT_SKILLS,
  ROUTER_SYSTEM_PROMPT,
  buildFinalSystemPrompt,
  buildRoutingCatalog,
  fallbackRoute,
  getSkillById,
  getAgentSystemPrompt,
  parseRouteDecision,
  routeByKeyword,
  RouteDecision,
} from '@/lib/copilotRouter';
import { ARSENAL_AGENTS } from '@/services/arsenalService';
import {
  DEFAULT_MODEL,
  OPENAI_COMPATIBLE_BASE,
  parseProviderError,
  providerExtras,
} from '@/lib/aiProviders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 🤖 Copilot do SocialFlow — chat que roteia automaticamente para a skill ou
 * agente mais adequado e responde a pergunta do usuário.
 *
 * Chave de IA (ordem de precedência):
 *  1. BYOK — { apiKey, provider, model } no corpo da requisição (chave do próprio cliente).
 *  2. COPILOT_AI_API_KEY / COPILOT_AI_PROVIDER / COPILOT_AI_MODEL (chave dedicada do Copilot).
 *  3. CONTENT_STUDIO_AI_API_KEY / _PROVIDER / _MODEL (reaproveita a chave compartilhada).
 *
 * Assim funciona tanto no modo "SocialFlow paga a chamada" quanto no modo BYOK.
 */

type Provider =
  | 'openai'
  | 'deepseek'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'mistral'
  | 'openrouter'
  | 'custom';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  message: string;
  history?: ChatMessage[];
  /** Força uma rota específica (ex: 'skill:reels' quando o usuário clica num atalho). */
  forceRoute?: string;
  /** BYOK opcional */
  apiKey?: string;
  provider?: Provider;
  model?: string;
  baseUrl?: string;
  /** Contexto opcional do usuário para personalizar as respostas */
  nicho?: string;
}

interface AIConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  /** true quando a chave é do próprio cliente (BYOK) */
  byok: boolean;
}

function resolveConfig(body: RequestBody): AIConfig | null {
  // 1. BYOK
  if (body.apiKey) {
    const provider = (body.provider || 'openai') as Provider;
    return {
      provider,
      apiKey: body.apiKey,
      model: body.model || DEFAULT_MODEL[provider] || 'gpt-4o-mini',
      baseUrl: body.baseUrl,
      byok: true,
    };
  }

  // 2. Chave dedicada do Copilot
  if (process.env.COPILOT_AI_API_KEY) {
    const provider = (process.env.COPILOT_AI_PROVIDER || 'deepseek') as Provider;
    return {
      provider,
      apiKey: process.env.COPILOT_AI_API_KEY,
      model: process.env.COPILOT_AI_MODEL || DEFAULT_MODEL[provider] || DEFAULT_MODEL.deepseek,
      baseUrl: process.env.COPILOT_AI_BASE_URL,
      byok: false,
    };
  }

  // 3. Reaproveita a chave do Content Studio
  if (process.env.CONTENT_STUDIO_AI_API_KEY) {
    const provider = (process.env.CONTENT_STUDIO_AI_PROVIDER || 'deepseek') as Provider;
    return {
      provider,
      apiKey: process.env.CONTENT_STUDIO_AI_API_KEY,
      model: process.env.CONTENT_STUDIO_AI_MODEL || DEFAULT_MODEL[provider] || DEFAULT_MODEL.deepseek,
      baseUrl: process.env.CONTENT_STUDIO_AI_BASE_URL,
      byok: false,
    };
  }

  return null;
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callOpenAICompatible(
  base: string,
  cfg: AIConfig,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number
): Promise<string> {
  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      // DeepSeek V4: desliga thinking mode (senão temperature é ignorado e a
      // cadeia de raciocínio consome o max_tokens antes da resposta).
      ...providerExtras(cfg.provider),
    }),
  });
  if (!res.ok) throw new Error(`(${res.status}) ${parseProviderError(await res.text())}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(
  cfg: AIConfig,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number
): Promise<string> {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      system,
      messages: rest,
      temperature,
    }),
  });
  if (!res.ok) throw new Error(`(${res.status}) ${parseProviderError(await res.text())}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callGoogle(
  cfg: AIConfig,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number
): Promise<string> {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!res.ok) throw new Error(`(${res.status}) ${parseProviderError(await res.text())}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callLLM(
  cfg: AIConfig,
  messages: LLMMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const maxTokens = opts.maxTokens ?? 1600;
  const temperature = opts.temperature ?? 0.7;

  if (cfg.provider === 'anthropic') return callAnthropic(cfg, messages, maxTokens, temperature);
  if (cfg.provider === 'google') return callGoogle(cfg, messages, maxTokens, temperature);

  const base = cfg.provider === 'custom' ? cfg.baseUrl : OPENAI_COMPATIBLE_BASE[cfg.provider];
  if (!base) {
    throw new Error(
      `Provider "${cfg.provider}" não suportado ou baseUrl ausente para provider custom.`
    );
  }
  return callOpenAICompatible(base, cfg, messages, maxTokens, temperature);
}

/** Resolve uma rota forçada vinda dos atalhos da interface. */
function resolveForcedRoute(forceRoute: string): RouteDecision | null {
  const [kind, id] = forceRoute.split(':');
  if (kind === 'skill') {
    const skill = getSkillById(id);
    if (!skill) return null;
    return {
      kind: 'skill',
      id: skill.id,
      name: skill.name,
      emoji: skill.emoji,
      via: 'keyword',
      systemPrompt: skill.systemPrompt,
    };
  }
  if (kind === 'agent') {
    const agent = ARSENAL_AGENTS.find((a) => a.id === id);
    if (!agent) return null;
    return {
      kind: 'agent',
      id: agent.id,
      name: agent.name,
      emoji: agent.emoji || '🤖',
      via: 'keyword',
      systemPrompt: getAgentSystemPrompt(agent),
    };
  }
  return null;
}

/** Camada 2 — classificador LLM. Silencioso: qualquer falha cai no fallback. */
async function routeByLLM(cfg: AIConfig, message: string): Promise<RouteDecision | null> {
  try {
    const raw = await callLLM(
      cfg,
      [
        { role: 'system', content: `${ROUTER_SYSTEM_PROMPT}\n\n${buildRoutingCatalog()}` },
        { role: 'user', content: message },
      ],
      { maxTokens: 150, temperature: 0 }
    );
    return parseRouteDecision(raw);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido.' }, { status: 400 });
  }

  const message = (body.message || '').trim();
  if (!message) {
    return NextResponse.json({ success: false, error: 'Mensagem vazia.' }, { status: 400 });
  }

  const cfg = resolveConfig(body);
  if (!cfg) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        error:
          'Copilot sem chave de IA. Configure COPILOT_AI_API_KEY (ou CONTENT_STUDIO_AI_API_KEY) na Vercel, ' +
          'ou informe sua própria chave em Configurações.',
      },
      { status: 400 }
    );
  }

  const startedAt = Date.now();

  try {
    // ── Roteamento ────────────────────────────────────────────────
    let decision: RouteDecision | null = null;

    if (body.forceRoute) decision = resolveForcedRoute(body.forceRoute);
    if (!decision) decision = routeByKeyword(message);
    if (!decision) decision = await routeByLLM(cfg, message);
    if (!decision) decision = fallbackRoute();

    // ── Execução ──────────────────────────────────────────────────
    let systemPrompt = buildFinalSystemPrompt(decision);
    if (body.nicho) {
      systemPrompt += `\n\nNICHO DO USUÁRIO: ${body.nicho}. Adapte todos os exemplos a este nicho.`;
    }

    const history = (body.history || [])
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .slice(-8) // mantém as últimas 4 trocas para não estourar contexto/custo
      .map<LLMMessage>((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const reply = await callLLM(cfg, [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ]);

    return NextResponse.json({
      success: true,
      reply,
      route: {
        kind: decision.kind,
        id: decision.id,
        name: decision.name,
        emoji: decision.emoji,
        via: decision.via,
      },
      provider: cfg.provider,
      model: cfg.model,
      byok: cfg.byok,
      duration: Date.now() - startedAt,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}

/** GET → diagnóstico: informa se o Copilot tem chave configurada no servidor. */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const cfg = resolveConfig({ message: '' });
  return NextResponse.json({
    success: true,
    configured: Boolean(cfg),
    provider: cfg?.provider ?? null,
    model: cfg?.model ?? null,
    skills: COPILOT_SKILLS.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji })),
    agentCount: ARSENAL_AGENTS.length,
  });
}
