import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';
import {
  COPILOT_SKILLS,
  ROUTER_SYSTEM_PROMPT,
  buildFinalSystemPrompt,
  buildRoutingCatalog,
  fallbackRoute,
  getSkillById,
  parseRouteDecision,
  resolveRoute,
  routeByKeyword,
  RouteDecision,
} from '@/lib/copilotRouter';
import { ARSENAL_AGENTS } from '@/services/arsenalService';
import {
  DEFAULT_MODEL,
  OPENAI_COMPATIBLE_BASE,
  WEB_SEARCH_MODEL,
  WebSource,
  buildSamplingParams,
  buildWebSearchOptions,
  extractSources,
  normalizeModel,
  parseProviderError,
  providerExtras,
  supportsVision,
  supportsWebSearch,
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
 * VISÃO: quando uma foto é anexada, ela só é enviada ao modelo se o provedor
 * suportar imagem (ver supportsVision). DeepSeek V4 é text-only, então nesse
 * caso enviamos apenas os METADADOS da foto (dimensões, proporção) e instruímos
 * o modelo a não inventar detalhes visuais. Assim o recurso degrada de forma
 * controlada em vez de estourar erro de schema.
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

/** Foto anexada pelo usuário no composer do Copilot. */
interface ImageInput {
  /** data URL completa: data:image/jpeg;base64,XXXX */
  dataUrl: string;
  name?: string;
  width?: number;
  height?: number;
}

interface RequestBody {
  message: string;
  history?: ChatMessage[];
  /** Força uma rota específica (ex: 'skill:reels' quando o usuário clica num atalho). */
  forceRoute?: string;
  /**
   * Rota usada na resposta anterior (ex: 'skill:post'). Serve para manter o
   * mesmo especialista quando a mensagem é só um ajuste do resultado.
   */
  lastRoute?: string;
  /** Foto anexada — usada para montar o post. */
  image?: ImageInput;
  /** BYOK opcional */
  apiKey?: string;
  provider?: Provider;
  model?: string;
  baseUrl?: string;
  /** Contexto opcional do usuário para personalizar as respostas */
  nicho?: string;
  /** Cidade do usuário — usada para buscar tendências locais na web. */
  cidade?: string;
}

interface AIConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  /** true quando a chave é do próprio cliente (BYOK) */
  byok: boolean;
  /** Nome legado que foi migrado, quando aplicável (ex: 'deepseek-chat'). */
  migratedFrom?: string;
  /** Thinking mode herdado do nome legado (ex: 'deepseek-reasoner'). */
  thinking?: boolean;
}

/**
 * Aplica a migração de modelos descontinuados antes de a config ser usada.
 * Protege contra nome legado vindo de env var antiga na Vercel ou de config
 * BYOK salva no navegador do usuário — lugares que um deploy não alcança.
 */
function finalize(cfg: AIConfig): AIConfig {
  const n = normalizeModel(cfg.model);
  if (!n.migrated) return cfg;
  return {
    ...cfg,
    model: n.model,
    migratedFrom: n.original,
    thinking: n.thinking,
  };
}

function resolveConfig(body: RequestBody): AIConfig | null {
  // 1. BYOK
  if (body.apiKey) {
    const provider = (body.provider || 'openai') as Provider;
    return finalize({
      provider,
      apiKey: body.apiKey,
      model: body.model || DEFAULT_MODEL[provider] || 'gpt-4o-mini',
      baseUrl: body.baseUrl,
      byok: true,
    });
  }

  // 2. Chave dedicada do Copilot
  if (process.env.COPILOT_AI_API_KEY) {
    const provider = (process.env.COPILOT_AI_PROVIDER || 'deepseek') as Provider;
    return finalize({
      provider,
      apiKey: process.env.COPILOT_AI_API_KEY,
      model: process.env.COPILOT_AI_MODEL || DEFAULT_MODEL[provider] || DEFAULT_MODEL.deepseek,
      baseUrl: process.env.COPILOT_AI_BASE_URL,
      byok: false,
    });
  }

  // 3. Reaproveita a chave do Content Studio
  if (process.env.CONTENT_STUDIO_AI_API_KEY) {
    const provider = (process.env.CONTENT_STUDIO_AI_PROVIDER || 'deepseek') as Provider;
    return finalize({
      provider,
      apiKey: process.env.CONTENT_STUDIO_AI_API_KEY,
      model:
        process.env.CONTENT_STUDIO_AI_MODEL || DEFAULT_MODEL[provider] || DEFAULT_MODEL.deepseek,
      baseUrl: process.env.CONTENT_STUDIO_AI_BASE_URL,
      byok: false,
    });
  }

  return null;
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Resultado de uma chamada ao modelo. `sources` só vem em buscas na web. */
interface LLMResult {
  content: string;
  sources: WebSource[];
}

/** Separa uma data URL em tipo MIME e payload base64. */
function parseDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mediaType: match[1], base64: match[2] };
}

async function callOpenAICompatible(
  base: string,
  cfg: AIConfig,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  thinking: boolean,
  image?: ImageInput,
  webSearch?: { model: string; options: Record<string, unknown> }
): Promise<LLMResult> {
  // Formato OpenAI: a última mensagem do usuário passa a ser um array de partes.
  let payloadMessages: unknown[] = messages;
  if (image) {
    const parsed = parseDataUrl(image.dataUrl);
    if (parsed) {
      payloadMessages = messages.map((m, i) =>
        i === messages.length - 1 && m.role === 'user'
          ? {
              role: 'user',
              content: [
                { type: 'text', text: m.content },
                { type: 'image_url', image_url: { url: image.dataUrl } },
              ],
            }
          : m
      );
    }
  }

  // Busca na web usa um MODELO dedicado (o tool `web_search` é exclusivo da
  // Responses API). Esse modelo sempre pesquisa antes de responder.
  const model = webSearch?.model || cfg.model;

  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: payloadMessages,
      // GPT-5.x / série o* usam `max_completion_tokens` e rejeitam `temperature`.
      ...buildSamplingParams(cfg.provider, model, { maxTokens, temperature }),
      // DeepSeek V4: thinking mode vem ligado de fábrica, o que faz `temperature`
      // ser ignorado e consome o max_tokens antes de gerar a resposta.
      ...providerExtras(cfg.provider, { thinking }),
      ...(webSearch ? { web_search_options: webSearch.options } : {}),
    }),
  });
  if (!res.ok) throw new Error(`(${res.status}) ${parseProviderError(await res.text())}`);
  const data = await res.json();
  const message = data.choices?.[0]?.message;
  return {
    content: message?.content ?? '',
    sources: webSearch ? extractSources(message) : [],
  };
}

async function callAnthropic(
  cfg: AIConfig,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  image?: ImageInput
): Promise<LLMResult> {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system');

  // Formato Anthropic: bloco { type: 'image', source: { type: 'base64', ... } }
  let payloadMessages: unknown[] = rest;
  if (image) {
    const parsed = parseDataUrl(image.dataUrl);
    if (parsed) {
      payloadMessages = rest.map((m, i) =>
        i === rest.length - 1 && m.role === 'user'
          ? {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: parsed.mediaType, data: parsed.base64 },
                },
                { type: 'text', text: m.content },
              ],
            }
          : m
      );
    }
  }

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
      messages: payloadMessages,
      temperature,
    }),
  });
  if (!res.ok) throw new Error(`(${res.status}) ${parseProviderError(await res.text())}`);
  const data = await res.json();
  return { content: data.content?.[0]?.text ?? '', sources: [] };
}

async function callGoogle(
  cfg: AIConfig,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  image?: ImageInput
): Promise<LLMResult> {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system');
  const parsedImage = image ? parseDataUrl(image.dataUrl) : null;

  const contents = rest.map((m, i) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    // Formato Google: parts com inline_data
    if (parsedImage && i === rest.length - 1 && m.role === 'user') {
      return {
        role,
        parts: [
          { text: m.content },
          { inline_data: { mime_type: parsedImage.mediaType, data: parsedImage.base64 } },
        ],
      };
    }
    return { role, parts: [{ text: m.content }] };
  });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!res.ok) throw new Error(`(${res.status}) ${parseProviderError(await res.text())}`);
  const data = await res.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
    sources: [],
  };
}

async function callLLM(
  cfg: AIConfig,
  messages: LLMMessage[],
  opts: {
    maxTokens?: number;
    temperature?: number;
    thinking?: boolean;
    image?: ImageInput;
    webSearch?: { model: string; options: Record<string, unknown> };
  } = {}
): Promise<LLMResult> {
  const maxTokens = opts.maxTokens ?? 1600;
  const temperature = opts.temperature ?? 0.7;
  // Só liga thinking se quem chamou permitir E a config pedir (nome legado
  // 'deepseek-reasoner'). O roteador passa thinking:false para garantir
  // classificação determinística dentro de um orçamento pequeno de tokens.
  const thinking = (opts.thinking ?? true) && Boolean(cfg.thinking);
  const image = opts.image;

  if (cfg.provider === 'anthropic')
    return callAnthropic(cfg, messages, maxTokens, temperature, image);
  if (cfg.provider === 'google') return callGoogle(cfg, messages, maxTokens, temperature, image);

  const base = cfg.provider === 'custom' ? cfg.baseUrl : OPENAI_COMPATIBLE_BASE[cfg.provider];
  if (!base) {
    throw new Error(
      `Provider "${cfg.provider}" não suportado ou baseUrl ausente para provider custom.`
    );
  }
  return callOpenAICompatible(
    base,
    cfg,
    messages,
    maxTokens,
    temperature,
    thinking,
    image,
    opts.webSearch
  );
}

/** Resolve uma rota forçada vinda dos atalhos da interface. */
function resolveForcedRoute(forceRoute: string): RouteDecision | null {
  return resolveRoute(forceRoute, 'keyword');
}

/** Camada 2 — classificador LLM. Silencioso: qualquer falha cai no fallback. */
async function routeByLLM(cfg: AIConfig, message: string): Promise<RouteDecision | null> {
  try {
    const { content } = await callLLM(
      cfg,
      [
        { role: 'system', content: `${ROUTER_SYSTEM_PROMPT}\n\n${buildRoutingCatalog()}` },
        { role: 'user', content: message },
      ],
      { maxTokens: 150, temperature: 0, thinking: false }
    );
    return parseRouteDecision(content);
  } catch {
    return null;
  }
}

/** Descreve a foto em texto — usado quando o provedor não tem visão. */
function describeImageMetadata(image: ImageInput): string {
  const bits: string[] = [];
  if (image.name) bits.push(`arquivo "${image.name}"`);
  if (image.width && image.height) {
    bits.push(`${image.width}x${image.height}px`);
    const ratio = image.width / image.height;
    let orientation = 'quadrada (1:1)';
    if (ratio > 1.2) orientation = 'horizontal (paisagem)';
    else if (ratio < 0.7) orientation = 'vertical alta (9:16 — ideal para Reels/Story)';
    else if (ratio < 0.95) orientation = 'vertical (4:5 — ideal para feed)';
    bits.push(orientation);
  }
  return bits.join(', ');
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
  const image = body.image?.dataUrl ? body.image : undefined;

  if (!message && !image) {
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
  // Só manda a imagem ao modelo se o provedor souber ler imagem.
  const canSeeImage = Boolean(image) && supportsVision(cfg.provider, cfg.model);

  try {
    // ── Roteamento ────────────────────────────────────────────────
    let decision: RouteDecision | null = null;

    if (body.forceRoute) decision = resolveForcedRoute(body.forceRoute);
    if (!decision) decision = routeByKeyword(message, Boolean(image), body.lastRoute);
    if (!decision && message) decision = await routeByLLM(cfg, message);
    if (!decision) decision = fallbackRoute();

    // ── Execução ──────────────────────────────────────────────────
    let systemPrompt = buildFinalSystemPrompt(decision);
    if (body.nicho) {
      systemPrompt += `\n\nNICHO DO USUÁRIO: ${body.nicho}. Adapte todos os exemplos a este nicho.`;
    }

    if (image) {
      if (canSeeImage) {
        systemPrompt +=
          '\n\nO usuário anexou uma FOTO e você a está recebendo. Baseie a legenda no que ' +
          'realmente aparece nela — objeto, cenário, cores, texto visível e clima da cena. ' +
          'Seja concreto: mencione elementos que você vê, não generalidades.';
      } else {
        systemPrompt +=
          '\n\nO usuário anexou uma FOTO, mas seu modelo não consegue vê-la. ' +
          `Metadados disponíveis: ${describeImageMetadata(image)}. ` +
          'Escreva a legenda a partir do texto do usuário e do nicho. ' +
          'NÃO invente nem descreva detalhes visuais da foto. ' +
          'Use a proporção da imagem apenas para sugerir o formato de publicação. ' +
          'Se o texto do usuário não disser o que a foto mostra, peça em UMA linha curta ' +
          'no fim que ele descreva a cena para você refinar a legenda.';
      }
    }

    const history = (body.history || [])
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .slice(-8) // mantém as últimas 4 trocas para não estourar contexto/custo
      .map<LLMMessage>((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const userText = message || (image ? 'Monta um post completo com esta foto.' : '');

    // ── Busca na web ──────────────────────────────────────────────
    // A skill "trends" precisa de dados reais e recentes. Se o provedor não
    // oferece busca no formato Chat Completions, avisamos em vez de deixar o
    // modelo inventar tendências plausíveis (o pior resultado possível aqui).
    const skill = decision.kind === 'skill' ? getSkillById(decision.id) : undefined;
    const wantsWebSearch = Boolean(skill?.needsWebSearch);
    const canWebSearch = wantsWebSearch && supportsWebSearch(cfg.provider);

    if (wantsWebSearch && !canWebSearch) {
      systemPrompt +=
        `\n\nATENÇÃO: você NÃO tem acesso à internet nesta configuração (provedor ${cfg.provider}). ` +
        'Diga isso ao usuário na primeira linha, de forma curta, e explique que para pesquisar ' +
        'tendências reais ele precisa usar uma chave OpenAI em Configurações. ' +
        'Depois disso, entregue o melhor conteúdo possível usando os FORMATOS COMPROVADOS do ' +
        'contexto de referência, deixando claro que são formatos atemporais e não tendências ' +
        'do momento. NUNCA invente tendência, áudio em alta ou número de views.';
    }

    const webSearch = canWebSearch
      ? {
          model: WEB_SEARCH_MODEL[cfg.provider],
          options: buildWebSearchOptions({
            country: 'BR',
            city: body.cidade?.trim() || undefined,
          }),
        }
      : undefined;

    const { content: reply, sources } = await callLLM(
      cfg,
      [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userText }],
      {
        image: canSeeImage ? image : undefined,
        webSearch,
        // Busca traz muito contexto; dá espaço para a síntese não ser truncada.
        ...(canWebSearch ? { maxTokens: 2600 } : {}),
      }
    );

    return NextResponse.json({
      success: true,
      reply,
      /** Links citados pelo modelo de busca — o usuário pode conferir a fonte. */
      sources,
      /** true = a resposta veio de busca real na web */
      webSearchUsed: canWebSearch,
      /** true = a skill pedia busca mas o provedor não oferece */
      webSearchUnavailable: wantsWebSearch && !canWebSearch,
      route: {
        kind: decision.kind,
        id: decision.id,
        name: decision.name,
        emoji: decision.emoji,
        via: decision.via,
      },
      provider: cfg.provider,
      model: canWebSearch ? WEB_SEARCH_MODEL[cfg.provider] : cfg.model,
      modelMigratedFrom: cfg.migratedFrom,
      byok: cfg.byok,
      /** true = a foto foi realmente analisada; false com imagem = provedor sem visão */
      visionUsed: canSeeImage,
      hadImage: Boolean(image),
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
    modelMigratedFrom: cfg?.migratedFrom ?? null,
    /** false → o provedor atual não lê imagens (ex: DeepSeek V4) */
    vision: cfg ? supportsVision(cfg.provider, cfg.model) : false,
    /** false → o provedor atual não pesquisa na web pelo Chat Completions */
    webSearch: cfg ? supportsWebSearch(cfg.provider) : false,
    skills: COPILOT_SKILLS.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji })),
    agentCount: ARSENAL_AGENTS.length,
  });
}
