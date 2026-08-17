import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';
import {
  COPILOT_SKILLS,
  ROUTER_SYSTEM_PROMPT,
  buildFinalSystemPrompt,
  buildRoutingCatalog,
  fallbackRoute,
  getSkillById,
  isActionSkill,
  parseRouteDecision,
  resolveRoute,
  routeByKeyword,
  skillNeedsPipeline,
  skillNeedsProfileContext,
  RouteDecision,
} from '@/lib/copilotRouter';
import { ACTION_SKILL_ID, runCopilotAction, type PendingAction } from '@/lib/copilotActions';
import { ARSENAL_AGENTS } from '@/services/arsenalService';
import { trendsService } from '@/services/trendsService';
import {
  DEFAULT_IG_HANDLE,
  loadInstagramProfileContext,
} from '@/lib/instagramProfileContext';
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
  pickVisionTarget,
  anthropicMessageParams,
  extractAnthropicText,
} from '@/lib/aiProviders';
import {
  resolveCopilotFallbackFromEnv,
  resolveCopilotPrimaryFromEnv,
} from '@/lib/copilotAiConfig';
import {
  collectVisionImages,
  defaultPostPrompt,
  describeImagesMetadata,
  visionCanSeeHint,
  visionCannotSeeHint,
  type CopilotImageInput,
} from '@/lib/copilotImages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 🤖 Copilot do SocialFlow — chat que roteia automaticamente para a skill ou
 * agente mais adequado e responde a pergunta do usuário.
 *
 * Chave de IA (ordem de precedência):
 *  1. BYOK — { apiKey, provider, model } no corpo da requisição (chave do próprio cliente).
 *  2. Claude (ANTHROPIC_API_KEY / COPILOT_AI_API_KEY) — motor principal.
 *  3. DeepSeek (CONTENT_STUDIO_AI_API_KEY) — fallback e último recurso.
 *
 * VISÃO: Claude lê foto(s). Se o principal for text-only (DeepSeek), as fotos vão
 * para um fallback com visão (ver pickVisionTarget). Sem nenhum modelo de visão,
 * enviamos só metadados e pedimos para não inventar o que está nas fotos.
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
type ImageInput = CopilotImageInput;

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
  /** Foto única (legado). Preferir `images`. */
  image?: ImageInput;
  /** Fotos anexadas — carrossel de até 10. */
  images?: ImageInput[];
  /**
   * Referência(s) de mídia já enviadas ao Postiz (id/path) — usadas pela skill
   * de ação para agendar/publicar o post com a foto anexada.
   */
  media?: { id: string; path: string }[];
  /**
   * Ação pendente devolvida na resposta anterior e reenviada pelo cliente.
   * Carrega conta + mídia + legenda + data para sobreviver ao turno de
   * confirmação (o chat é stateless entre turnos).
   */
  pendingAction?: PendingAction | null;
  /** BYOK opcional */
  apiKey?: string;
  provider?: Provider;
  model?: string;
  baseUrl?: string;
  /** Contexto opcional do usuário para personalizar as respostas */
  nicho?: string;
  /** Cidade do usuário — usada para buscar tendências locais na web. */
  cidade?: string;
  /** Handle do Instagram autorizado (default cyntiarinaldidoces). */
  instagramHandle?: string;
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

  const fromEnv = resolveCopilotPrimaryFromEnv(process.env);
  if (!fromEnv) return null;
  return finalize({
    provider: fromEnv.provider as Provider,
    apiKey: fromEnv.apiKey,
    model: fromEnv.model,
    baseUrl: fromEnv.baseUrl,
    byok: false,
    migratedFrom: fromEnv.migratedFrom,
    thinking: fromEnv.thinking,
  });
}

/**
 * Fallback DeepSeek quando o Claude estoura rate limit / fica indisponível.
 * Também usado por pickVisionTarget se o principal for text-only.
 */
function resolveFallbackConfig(primary?: AIConfig | null): AIConfig | null {
  const fromEnv = resolveCopilotFallbackFromEnv(process.env, primary);
  if (!fromEnv) return null;
  return finalize({
    provider: fromEnv.provider as Provider,
    apiKey: fromEnv.apiKey,
    model: fromEnv.model,
    baseUrl: fromEnv.baseUrl,
    byok: false,
    migratedFrom: fromEnv.migratedFrom,
    thinking: fromEnv.thinking,
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
  /** Preenchido quando a chamada principal falhou e o fallback atendeu. */
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

function parsedVision(images?: ImageInput[]) {
  return (images || [])
    .map((img) => {
      const parsed = parseDataUrl(img.dataUrl);
      return parsed ? { img, parsed } : null;
    })
    .filter((x): x is { img: ImageInput; parsed: { mediaType: string; base64: string } } =>
      Boolean(x)
    );
}

async function callOpenAICompatible(
  base: string,
  cfg: AIConfig,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  thinking: boolean,
  images?: ImageInput[],
  webSearch?: { model: string; options: Record<string, unknown> }
): Promise<LLMResult> {
  // Formato OpenAI: a última mensagem do usuário passa a ser um array de partes.
  let payloadMessages: unknown[] = messages;
  const vision = parsedVision(images);
  if (vision.length) {
    payloadMessages = messages.map((m, i) =>
      i === messages.length - 1 && m.role === 'user'
        ? {
            role: 'user',
            content: [
              ...vision.map(({ img }) => ({
                type: 'image_url',
                image_url: { url: img.dataUrl },
              })),
              { type: 'text', text: m.content },
            ],
          }
        : m
    );
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
  images?: ImageInput[]
): Promise<LLMResult> {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system');

  // Formato Anthropic: bloco { type: 'image', source: { type: 'base64', ... } }
  let payloadMessages: unknown[] = rest;
  const vision = parsedVision(images);
  if (vision.length) {
    payloadMessages = rest.map((m, i) =>
      i === rest.length - 1 && m.role === 'user'
        ? {
            role: 'user',
            content: [
              ...vision.map(({ parsed }) => ({
                type: 'image',
                source: { type: 'base64', media_type: parsed.mediaType, data: parsed.base64 },
              })),
              { type: 'text', text: m.content },
            ],
          }
        : m
    );
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
      system,
      messages: payloadMessages,
      ...anthropicMessageParams(cfg.model, { maxTokens, temperature }),
    }),
  });
  if (!res.ok) throw new Error(`(${res.status}) ${parseProviderError(await res.text())}`);
  const data = await res.json();
  return { content: extractAnthropicText(data), sources: [] };
}

async function callGoogle(
  cfg: AIConfig,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  images?: ImageInput[]
): Promise<LLMResult> {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system');
  const vision = parsedVision(images);

  const contents = rest.map((m, i) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    // Formato Google: parts com inline_data
    if (vision.length && i === rest.length - 1 && m.role === 'user') {
      return {
        role,
        parts: [
          ...vision.map(({ parsed }) => ({
            inline_data: { mime_type: parsed.mediaType, data: parsed.base64 },
          })),
          { text: m.content },
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
    images?: ImageInput[];
    webSearch?: { model: string; options: Record<string, unknown> };
  }
): Promise<LLMResult> {
  const maxTokens = opts.maxTokens ?? 1600;
  const temperature = opts.temperature ?? 0.7;
  // Só liga thinking se quem chamou permitir E a config pedir (nome legado
  // 'deepseek-reasoner'). O roteador passa thinking:false para garantir
  // classificação determinística dentro de um orçamento pequeno de tokens.
  const thinking = (opts.thinking ?? true) && Boolean(cfg.thinking);
  const images = opts.images;

  if (cfg.provider === 'anthropic')
    return callAnthropic(cfg, messages, maxTokens, temperature, images);
  if (cfg.provider === 'google') return callGoogle(cfg, messages, maxTokens, temperature, images);

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
    images,
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
    images?: ImageInput[];
    webSearch?: { model: string; options: Record<string, unknown> };
    /** Desliga fallback DeepSeek nesta chamada (ex.: classificador). */
    disableFallback?: boolean;
  } = {}
): Promise<LLMResult> {
  try {
    return await callLLMPrimary(cfg, messages, opts);
  } catch (err) {
    // Busca web é exclusiva da OpenAI neste stack — fallback DeepSeek não
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
      images: opts.images,
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
  const images = collectVisionImages(body);
  const hasImage = images.length > 0;

  if (!message && !hasImage) {
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
  // Se o principal for text-only e o fallback ler foto, a imagem vai para o
  // fallback. Com Claude no principal, a foto já é lida aqui.
  const fallbackCfg = resolveFallbackConfig(cfg);
  const visionPick = pickVisionTarget(cfg, fallbackCfg, hasImage);
  const visionCfg = visionPick.viaFallback && fallbackCfg ? fallbackCfg : cfg;
  const canSeeImage = visionPick.canSee;

  try {
    // ── Roteamento ────────────────────────────────────────────────
    let decision: RouteDecision | null = null;

    if (body.forceRoute) decision = resolveForcedRoute(body.forceRoute);
    if (!decision) decision = routeByKeyword(message, hasImage, body.lastRoute);
    if (!decision && message) decision = await routeByLLM(cfg, message);
    if (!decision) decision = fallbackRoute();

    // Turno de confirmacao/ajuste: com acao pendente, forca o modo acao
    // independentemente do texto ("confirmar", "muda pra 20h", "cancela").
    if (body.pendingAction) {
      decision = resolveRoute(`skill:${ACTION_SKILL_ID}`, 'keyword') || decision;
    }

    // ── Modo AÇÃO (agendar/publicar via Postiz) ─────────────────────────────
    // Diferente das demais skills, esta EXECUTA entregas em vez de gerar texto.
    // Publicar é irreversível → runCopilotAction só age após confirmação (o
    // resumo + pendingAction voltam ao cliente e são reenviados no confirmar).
    if (isActionSkill(decision)) {
      const actionHistory = (body.history || [])
        .filter((m) => m && typeof m.content === 'string' && m.content.trim())
        .slice(-8)
        .map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.content,
        }));

      const result = await runCopilotAction({
        message,
        history: actionHistory,
        media: body.media,
        pendingAction: body.pendingAction || null,
        defaultHandle: body.instagramHandle?.trim() || DEFAULT_IG_HANDLE,
        nowISO: new Date(startedAt).toISOString(),
        llm: async (system, user) => {
          const r = await callLLM(
            cfg,
            [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            { maxTokens: 700, temperature: 0, thinking: false }
          );
          return r.content;
        },
      });

      return NextResponse.json({
        success: true,
        reply: result.reply,
        pendingAction: result.pendingAction,
        action: { intent: result.intent, executed: result.executed },
        route: {
          kind: decision.kind,
          id: decision.id,
          name: decision.name,
          emoji: decision.emoji,
          via: decision.via,
        },
        provider: cfg.provider,
        model: cfg.model,
        modelMigratedFrom: cfg.migratedFrom,
        byok: cfg.byok,
        hadImage: hasImage,
        duration: Date.now() - startedAt,
      });
    }

    // Instagram autorizado (Postiz) — default @cyntiarinaldidoces no site pessoal.
    const wantsProfile =
      skillNeedsProfileContext(decision) || skillNeedsPipeline(decision);
    const profileCtx = wantsProfile
      ? await loadInstagramProfileContext({
          handle: body.instagramHandle?.trim() || DEFAULT_IG_HANDLE,
        })
      : null;

    // ── Pipeline multi-agente (Reels + Post pronto) ─────────────────────────
    if (skillNeedsPipeline(decision)) {
      const canWebSearch = supportsWebSearch(cfg.provider);
      const baseMsg =
        message ||
        (hasImage
          ? images.length > 1
            ? `Monta um Reels completo com estas ${images.length} fotos.`
            : 'Monta um Reels completo com esta foto.'
          : 'Reels + post pronto pro meu nicho');
      const profilePrefix = profileCtx?.promptBlock
        ? `[CONTEXTO DO INSTAGRAM AUTORIZADO]\n${profileCtx.promptBlock}\n\n`
        : profileCtx?.notice
          ? `[AVISO PERFIL] ${profileCtx.notice}\n\n`
          : '';
      const pipe = await runReelsPipeline(cfg, {
        userMessage: `${profilePrefix}${baseMsg}`,
        nicho: body.nicho?.trim() || profileCtx?.handle || undefined,
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
        profile: profileCtx
          ? {
              handle: profileCtx.handle,
              accountName: profileCtx.accountName,
              postsAnalyzed: profileCtx.postsAnalyzed,
              reelsAnalyzed: profileCtx.reelsAnalyzed,
              storiesAnalyzed: profileCtx.storiesAnalyzed,
              feedAnalyzed: profileCtx.feedAnalyzed,
              mediaCount: profileCtx.mediaCount,
              graphUsed: Boolean(profileCtx.graphUsed),
              notice: profileCtx.notice || null,
            }
          : null,
        visionUsed: false,
        hadImage: hasImage,
        duration: Date.now() - startedAt,
      });
    }

    let systemPrompt = buildFinalSystemPrompt(decision);
    if (body.nicho) {
      systemPrompt += `\n\nNICHO DO USUÁRIO: ${body.nicho}. Adapte todos os exemplos a este nicho.`;
    }

    if (profileCtx?.promptBlock) {
      systemPrompt += `\n\n--- INSTAGRAM AUTORIZADO (@${profileCtx.handle}) ---\n${profileCtx.promptBlock}`;
    } else if (profileCtx?.notice && skillNeedsProfileContext(decision)) {
      systemPrompt += `\n\nAVISO SOBRE O PERFIL: ${profileCtx.notice}`;
    }

    if (hasImage) {
      if (canSeeImage) {
        systemPrompt += `\n\n${visionCanSeeHint(images.length)}`;
      } else {
        systemPrompt += `\n\n${visionCannotSeeHint(
          images.length,
          describeImagesMetadata(images),
          cfg.provider
        )}`;
      }
    }

    if (decision.kind === 'skill' && decision.id === 'post') {
      systemPrompt +=
        '\n\nLEMBRETE FINAL: entregue SOMENTE o post de feed do Instagram (legenda + hashtags). ' +
        'Zero TikTok, zero Reels, zero vídeo, zero Story, zero título de vídeo.';
    }

    const userText = message || (hasImage ? defaultPostPrompt(images.length) : '');

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
      // Foto: se o principal não lê imagem, usa o fallback com visão.
      canSeeImage && visionPick.viaFallback ? visionCfg : cfg,
      [{ role: 'system', content: finalSystemPrompt }, ...history, { role: 'user', content: userText }],
      {
        images: canSeeImage ? images : undefined,
        webSearch: visionPick.viaFallback ? undefined : webSearch,
        // Saída curta = menos tokens de saída = menos TPM.
        ...(canWebSearch && !visionPick.viaFallback ? { maxTokens: 1200 } : {}),
      }
    );
    const visionFallbackMeta = visionPick.viaFallback
      ? {
          provider: visionCfg.provider,
          model: visionCfg.model,
          reason: `${cfg.provider} não lê imagens — foto enviada ao ${visionCfg.provider}`,
        }
      : null;
    const usedFallback = llmResult.usedFallback || visionFallbackMeta;
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
      provider: usedFallback?.provider || cfg.provider,
      model: usedFallback?.model
        || (canWebSearch && !visionPick.viaFallback ? WEB_SEARCH_MODEL[cfg.provider] : cfg.model),
      modelMigratedFrom: cfg.migratedFrom,
      byok: cfg.byok,
      fallbackUsed: Boolean(usedFallback),
      fallback: usedFallback || null,
      profile: profileCtx
        ? {
            handle: profileCtx.handle,
            accountName: profileCtx.accountName,
            postsAnalyzed: profileCtx.postsAnalyzed,
            reelsAnalyzed: profileCtx.reelsAnalyzed,
            storiesAnalyzed: profileCtx.storiesAnalyzed,
            feedAnalyzed: profileCtx.feedAnalyzed,
            mediaCount: profileCtx.mediaCount,
            graphUsed: Boolean(profileCtx.graphUsed),
            notice: profileCtx.notice || null,
          }
        : null,
      /** true = a foto foi realmente analisada; false com imagem = provedor sem visão */
      visionUsed: canSeeImage,
      hadImage: hasImage,
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
  const visionPrimary = cfg ? supportsVision(cfg.provider, cfg.model) : false;
  const visionFallback = fallback ? supportsVision(fallback.provider, fallback.model) : false;
  return NextResponse.json({
    success: true,
    configured: Boolean(cfg),
    provider: cfg?.provider ?? null,
    model: cfg?.model ?? null,
    modelMigratedFrom: cfg?.migratedFrom ?? null,
    /** true se o principal OU o fallback lê imagens */
    vision: visionPrimary || visionFallback,
    /** true = o principal é text-only; fotos vão para o fallback */
    visionViaFallback: !visionPrimary && visionFallback,
    /** false → o provedor atual não pesquisa na web pelo Chat Completions */
    webSearch: cfg ? supportsWebSearch(cfg.provider) : false,
    /** true se há chave de fallback (em geral DeepSeek do Content Studio) */
    fallbackConfigured: Boolean(fallback),
    fallbackProvider: fallback?.provider ?? null,
    fallbackModel: fallback?.model ?? null,
    skills: COPILOT_SKILLS.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji })),
    agentCount: ARSENAL_AGENTS.length,
  });
}
