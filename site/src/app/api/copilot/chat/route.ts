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
  skillNeedsPipeline,
  RouteDecision,
} from '@/lib/copilotRouter';
import { ARSENAL_AGENTS } from '@/services/arsenalService';
import { trendsService } from '@/services/trendsService';
import {
  REELS_PIPELINE_AGENTS,
  assemblePipelineReply,
  buildCloserPrompt,
  buildDissecacaoPrompt,
  buildHuntPrompt,
  buildStoryAdsPrompt,
  type PipelineRunInput,
} from '@/lib/reelsPipeline';
import {
  DEFAULT_MODEL,
  OPENAI_COMPATIBLE_BASE,
  WEB_SEARCH_MODEL,
  WebSource,
  buildSamplingParams,
  buildWebSearchOptions,
  extractSources,
  splitSources,
  normalizeModel,
  parseProviderError,
  providerExtras,
  supportsVision,
  supportsWebSearch,
  isRetryableProviderError,
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

/**
 * Fallback Anthropic (ou outro provedor) quando a chave principal estoura
 * rate limit / fica indisponível.
 *
 * Ordem:
 *  1. COPILOT_AI_FALLBACK_API_KEY (+ PROVIDER/MODEL opcionais)
 *  2. ANTHROPIC_API_KEY / COPILOT_ANTHROPIC_API_KEY
 */
function resolveFallbackConfig(primary?: AIConfig | null): AIConfig | null {
  const fallbackKey =
    process.env.COPILOT_AI_FALLBACK_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.COPILOT_ANTHROPIC_API_KEY;
  if (!fallbackKey) return null;

  const provider = (process.env.COPILOT_AI_FALLBACK_PROVIDER || 'anthropic') as Provider;
  const model =
    process.env.COPILOT_AI_FALLBACK_MODEL ||
    DEFAULT_MODEL[provider] ||
    DEFAULT_MODEL.anthropic;

  // Não "fallbacka" para o mesmo provedor+chave — seria loop inútil.
  if (
    primary &&
    primary.provider === provider &&
    primary.apiKey === fallbackKey
  ) {
    return null;
  }

  return finalize({
    provider,
    apiKey: fallbackKey,
    model,
    byok: false,
  });
}


interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Resultado de uma chamada ao modelo. `sources` só vem em buscas na web. */
interface LLMResult {
  content: string;
  sources: WebSource[];
  /** Preenchido quando a chamada principal falhou e o fallback Anthropic atendeu. */
  usedFallback?: { provider: string; model: string; reason: string };
}

/** Separa uma data URL em tipo MIME e payload base64. */
function parseDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mediaType: match[1], base64: match[2] };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extrai "try again in Xs" de erros 429 da OpenAI. */
function parseRetryAfterMs(errorText: string, fallbackMs = 35000): number {
  const m = /try again in\s+([0-9]+(?:\.[0-9]+)?)s/i.exec(errorText);
  if (!m) return fallbackMs;
  return Math.min(90000, Math.ceil(parseFloat(m[1]) * 1000) + 800);
}

/** Mensagem curta e acionável quando a conta bate no TPM. */
function formatRateLimitError(raw: string): string {
  const wait = /try again in\s+([0-9]+(?:\.[0-9]+)?)s/i.exec(raw);
  const secs = wait ? Math.ceil(parseFloat(wait[1])) : 30;
  return (
    `A OpenAI atingiu o limite de tokens por minuto no modelo de busca (gpt-5-search-api). ` +
    `Espere ~${secs}s e tente de novo. ` +
    `Dica: peça 1 nicho por vez e evite várias buscas seguidas.`
  );
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

  const body = JSON.stringify({
    model,
    messages: payloadMessages,
    // GPT-5.x / série o* usam `max_completion_tokens` e rejeitam `temperature`.
    ...buildSamplingParams(cfg.provider, model, { maxTokens, temperature }),
    // DeepSeek V4: thinking mode vem ligado de fábrica, o que faz `temperature`
    // ser ignorado e consome o max_tokens antes de gerar a resposta.
    ...providerExtras(cfg.provider, { thinking }),
    ...(webSearch ? { web_search_options: webSearch.options } : {}),
  });

  // gpt-5-search-api estoura TPM fácil (6000). Retry 1x no 429 em vez de
  // devolver o erro bruto da OpenAI pro usuário.
  const maxAttempts = webSearch ? 2 : 1;
  let lastErr = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body,
    });

    if (res.ok) {
      const data = await res.json();
      const message = data.choices?.[0]?.message;
      return {
        content: message?.content ?? '',
        sources: webSearch ? extractSources(message) : [],
      };
    }

    const raw = await res.text();
    const parsed = parseProviderError(raw);
    lastErr = `(${res.status}) ${parsed}`;

    if (res.status === 429 && attempt < maxAttempts) {
      await sleep(parseRetryAfterMs(parsed));
      continue;
    }

    if (res.status === 429) throw new Error(formatRateLimitError(parsed));
    throw new Error(lastErr);
  }

  throw new Error(lastErr || 'Falha ao chamar o modelo');
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

async function callLLMPrimary(
  cfg: AIConfig,
  messages: LLMMessage[],
  opts: {
    maxTokens?: number;
    temperature?: number;
    thinking?: boolean;
    image?: ImageInput;
    webSearch?: { model: string; options: Record<string, unknown> };
  }
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

async function callLLM(
  cfg: AIConfig,
  messages: LLMMessage[],
  opts: {
    maxTokens?: number;
    temperature?: number;
    thinking?: boolean;
    image?: ImageInput;
    webSearch?: { model: string; options: Record<string, unknown> };
    /** Desliga fallback Anthropic nesta chamada (ex.: classificador). */
    disableFallback?: boolean;
  } = {}
): Promise<LLMResult> {
  try {
    return await callLLMPrimary(cfg, messages, opts);
  } catch (err) {
    // Busca web é exclusiva da OpenAI neste stack — fallback Anthropic não
    // substitui gpt-5-search-api. O caller (hunt/trends) trata a falha.
    if (opts.webSearch || opts.disableFallback || !isRetryableProviderError(err)) {
      throw err;
    }

    const fallback = resolveFallbackConfig(cfg);
    if (!fallback) throw err;

    const reason = err instanceof Error ? err.message : 'erro no provedor principal';
    const result = await callLLMPrimary(fallback, messages, {
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      thinking: false,
      image: opts.image,
      // sem webSearch no fallback
    });
    return {
      ...result,
      usedFallback: {
        provider: fallback.provider,
        model: fallback.model,
        reason: reason.slice(0, 180),
      },
    };
  }
}

/** Resolve uma rota forçada vinda dos atalhos da interface. */
/**
 * Pipeline multi-agente: caça → StoryAds → Dissecação → doug.tensão/Ugly Copy.
 * Cada etapa é uma chamada curta. Falha parcial ainda devolve o que deu.
 */
async function runReelsPipeline(
  cfg: AIConfig,
  input: {
    userMessage: string;
    nicho?: string;
    cidade?: string;
    canWebSearch: boolean;
  }
): Promise<{
  reply: string;
  sources: WebSource[];
  videoSources: WebSource[];
  articleSources: WebSource[];
  webSearchUsed: boolean;
  pipelineSteps: { id: string; label: string; ok: boolean }[];
  agentsUsed: string[];
  usedFallback?: { provider: string; model: string; reason: string };
}> {
  const steps: { id: string; label: string; ok: boolean }[] = [];
  const agentsUsed = REELS_PIPELINE_AGENTS.map((a) => `${a.emoji} ${a.name}`);
  let usedFallback: { provider: string; model: string; reason: string } | undefined;

  let trendingHashtags: string[] = [];
  if (trendsService.isConfigured() && (input.nicho || input.userMessage)) {
    try {
      const q = (input.nicho || input.userMessage).slice(0, 80);
      const tags = await trendsService.getTrendingHashtags(q);
      trendingHashtags = tags.slice(0, 8).map((t) => t.hashtag);
    } catch {
      /* ignore */
    }
  }

  let huntText = '';
  let sources: WebSource[] = [];
  let webSearchUsed = false;
  let huntPreface = '';

  if (input.canWebSearch) {
    try {
      const huntPrompt = buildHuntPrompt({
        userMessage: input.userMessage,
        nicho: input.nicho,
        cidade: input.cidade,
      });
      const hunt = await callLLM(
        cfg,
        [
          { role: 'system', content: huntPrompt },
          {
            role: 'user',
            content:
              input.userMessage ||
              `Referências de Reels para ${input.nicho || 'meu nicho'}`,
          },
        ],
        {
          webSearch: {
            model: WEB_SEARCH_MODEL[cfg.provider],
            options: buildWebSearchOptions(
              { country: 'BR', city: input.cidade?.trim() || undefined },
              'medium'
            ),
          },
          maxTokens: 900,
        }
      );
      huntText = hunt.content || '';
      sources = hunt.sources || [];
      webSearchUsed = true;
      steps.push({ id: 'hunt', label: 'Caçando referências', ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha na busca';
      huntPreface = `Busca na web indisponível agora (${msg}). Seguimos com os agentes e o playbook.`;
      steps.push({ id: 'hunt', label: 'Caçando referências', ok: false });
    }
  } else {
    huntPreface =
      'Sem busca na web neste provedor — StoryAds usa formatos comprovados (não são "em alta" do momento).';
    steps.push({ id: 'hunt', label: 'Caçando referências', ok: false });
  }

  const { videos: videoSources, articles: articleSources } = splitSources(sources);

  const baseInput: PipelineRunInput = {
    userMessage: input.userMessage,
    nicho: input.nicho,
    cidade: input.cidade,
    huntText,
    videoLinks: videoSources,
    trendingHashtags,
    webSearchUsed,
  };

  let storyAds = '';
  try {
    const r = await callLLM(
      cfg,
      [
        { role: 'system', content: buildStoryAdsPrompt(baseInput) },
        { role: 'user', content: 'Monte os formatos agora.' },
      ],
      { maxTokens: 900, temperature: 0.6 }
    );
    storyAds = r.content || '';
    if (r.usedFallback) usedFallback = r.usedFallback;
    steps.push({ id: 'storyads', label: 'STORYADS montando formato', ok: Boolean(storyAds) });
  } catch (err) {
    storyAds = `STORYADS falhou: ${err instanceof Error ? err.message : 'erro'}`;
    steps.push({ id: 'storyads', label: 'STORYADS montando formato', ok: false });
  }

  let dissecacao = '';
  try {
    const r = await callLLM(
      cfg,
      [
        { role: 'system', content: buildDissecacaoPrompt(baseInput, storyAds) },
        { role: 'user', content: 'Disseque o cliente ideal para esses formatos.' },
      ],
      { maxTokens: 700, temperature: 0.5 }
    );
    dissecacao = r.content || '';
    if (r.usedFallback) usedFallback = r.usedFallback;
    steps.push({
      id: 'dissecacao',
      label: 'Dissecação adaptando ao público',
      ok: Boolean(dissecacao),
    });
  } catch (err) {
    dissecacao = `Dissecação falhou: ${err instanceof Error ? err.message : 'erro'}`;
    steps.push({ id: 'dissecacao', label: 'Dissecação adaptando ao público', ok: false });
  }

  let closer = '';
  try {
    const r = await callLLM(
      cfg,
      [
        { role: 'system', content: buildCloserPrompt(baseInput, storyAds, dissecacao) },
        { role: 'user', content: 'Feche o pacote pronto para gravar e publicar.' },
      ],
      { maxTokens: 1100, temperature: 0.7 }
    );
    closer = r.content || '';
    if (r.usedFallback) usedFallback = r.usedFallback;
    steps.push({
      id: 'closer',
      label: 'doug.tensão + Ugly Copy fechando o post',
      ok: Boolean(closer),
    });
  } catch (err) {
    closer = `Fechamento falhou: ${err instanceof Error ? err.message : 'erro'}`;
    steps.push({
      id: 'closer',
      label: 'doug.tensão + Ugly Copy fechando o post',
      ok: false,
    });
  }

  const reply = assemblePipelineReply({
    huntPreface,
    storyAds,
    dissecacao,
    closer,
    videoLinks: videoSources,
    agentsUsed,
  });

  return {
    reply,
    sources,
    videoSources,
    articleSources,
    webSearchUsed,
    pipelineSteps: steps,
    agentsUsed,
    usedFallback,
  };
}

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
      { maxTokens: 150, temperature: 0, thinking: false, disableFallback: true }
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

    // ── Pipeline multi-agente (Reels + Post pronto) ─────────────────────────
    if (skillNeedsPipeline(decision)) {
      const canWebSearch = supportsWebSearch(cfg.provider);
      const pipe = await runReelsPipeline(cfg, {
        userMessage:
          message || (image ? 'Monta um Reels completo com esta foto.' : 'Reels + post pronto pro meu nicho'),
        nicho: body.nicho?.trim() || undefined,
        cidade: body.cidade?.trim() || undefined,
        canWebSearch,
      });

      return NextResponse.json({
        success: true,
        reply: pipe.reply,
        sources: pipe.sources,
        videoSources: pipe.videoSources,
        articleSources: pipe.articleSources,
        webSearchUsed: pipe.webSearchUsed,
        webSearchUnavailable: !canWebSearch,
        pipeline: {
          steps: pipe.pipelineSteps,
          agentsUsed: pipe.agentsUsed,
        },
        route: {
          kind: decision.kind,
          id: decision.id,
          name: decision.name,
          emoji: decision.emoji,
          via: decision.via,
        },
        provider: pipe.usedFallback?.provider || cfg.provider,
        model: pipe.usedFallback?.model
          || (pipe.webSearchUsed ? WEB_SEARCH_MODEL[cfg.provider] : cfg.model),
        modelMigratedFrom: cfg.migratedFrom,
        byok: cfg.byok,
        fallbackUsed: Boolean(pipe.usedFallback),
        fallback: pipe.usedFallback || null,
        visionUsed: false,
        hadImage: Boolean(image),
        duration: Date.now() - startedAt,
      });
    }

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

    const userText = message || (image ? 'Monta um post completo com esta foto.' : '');

    // ── Busca na web ──────────────────────────────────────────────
    // A skill "trends" precisa de dados reais e recentes. Se o provedor não
    // oferece busca no formato Chat Completions, avisamos em vez de deixar o
    // modelo inventar tendências plausíveis (o pior resultado possível aqui).
    const skill = decision.kind === 'skill' ? getSkillById(decision.id) : undefined;
    const wantsWebSearch = Boolean(skill?.needsWebSearch);
    const canWebSearch = wantsWebSearch && supportsWebSearch(cfg.provider);

    // Busca na web já consome milhares de tokens de contexto de pesquisa.
    // Histórico longo + playbook + maxTokens alto estoura o TPM (6000) fácil.
    const history = (body.history || [])
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .slice(canWebSearch ? -2 : -8)
      .map<LLMMessage>((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content:
          canWebSearch && m.content.length > 500
            ? `${m.content.slice(0, 500)}…`
            : m.content,
      }));

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
          // medium: menos tokens de pesquisa, menos chance de estourar TPM 6000.
          options: buildWebSearchOptions(
            {
              country: 'BR',
              city: body.cidade?.trim() || undefined,
            },
            'medium'
          ),
        }
      : undefined;

    // Na busca real o playbook atemporal só atrapalha (gasta TPM e puxa resposta
    // para formatos genéricos). Mantém o prompt da skill + nicho + cidade.
    let finalSystemPrompt = systemPrompt;
    if (canWebSearch) {
      finalSystemPrompt = finalSystemPrompt.replace(
        /\n\n--- CONTEXTO DE REFERÊNCIA ---[\s\S]*$/,
        ''
      );
      finalSystemPrompt +=
        '\n\nResponda curto: no máximo 3 vídeos. Cada item em 5 linhas. Sem preâmbulo.';
    }

    const llmResult = await callLLM(
      cfg,
      [{ role: 'system', content: finalSystemPrompt }, ...history, { role: 'user', content: userText }],
      {
        image: canSeeImage ? image : undefined,
        webSearch,
        // Saída curta = menos tokens de saída = menos TPM.
        ...(canWebSearch ? { maxTokens: 1200 } : {}),
      }
    );
    const reply = llmResult.content;
    const sources = llmResult.sources;

    /**
     * A skill "Reels em alta" precisa entregar vídeo para copiar, então os
     * links de vídeo saem separados dos artigos e a UI mostra eles primeiro.
     */
    const { videos: videoSources, articles: articleSources } = splitSources(sources);

    return NextResponse.json({
      success: true,
      reply,
      /** Links citados pelo modelo de busca — o usuário pode conferir a fonte. */
      sources,
      /** Vídeos reais (Reels/TikTok/Shorts) para abrir, copiar e adaptar. */
      videoSources,
      /** Artigos de apoio — leitura, não entregável. */
      articleSources,
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
      provider: llmResult.usedFallback?.provider || cfg.provider,
      model: llmResult.usedFallback?.model
        || (canWebSearch ? WEB_SEARCH_MODEL[cfg.provider] : cfg.model),
      modelMigratedFrom: cfg.migratedFrom,
      byok: cfg.byok,
      fallbackUsed: Boolean(llmResult.usedFallback),
      fallback: llmResult.usedFallback || null,
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
  const fallback = resolveFallbackConfig(cfg);
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
    /** true se ANTHROPIC_API_KEY / COPILOT_AI_FALLBACK_API_KEY está no servidor */
    fallbackConfigured: Boolean(fallback),
    fallbackProvider: fallback?.provider ?? null,
    fallbackModel: fallback?.model ?? null,
    skills: COPILOT_SKILLS.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji })),
    agentCount: ARSENAL_AGENTS.length,
  });
}
