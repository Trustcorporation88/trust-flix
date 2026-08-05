/**
 * 🔌 Provedores de IA — fonte única de verdade para base URLs, modelos padrão
 * e parâmetros específicos de cada provedor.
 *
 * Existe para evitar que os defaults desalinhem entre as rotas (/api/copilot/chat,
 * /api/agents/execute, /api/content-studio/*). Quando um provedor troca de modelo
 * ou de endpoint, muda-se APENAS aqui.
 */

export type AIProviderId =
  | 'openai'
  | 'deepseek'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'mistral'
  | 'openrouter'
  | 'custom';

/** Endpoints compatíveis com o formato OpenAI (/chat/completions é anexado depois). */
export const OPENAI_COMPATIBLE_BASE: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  // DeepSeek documenta o base_url SEM /v1 → https://api.deepseek.com/chat/completions
  deepseek: 'https://api.deepseek.com',
  groq: 'https://api.groq.com/openai/v1',
  mistral: 'https://api.mistral.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

/**
 * Modelo padrão por provedor.
 *
 * ⚠️ DeepSeek: os nomes legados `deepseek-chat` e `deepseek-reasoner` foram
 * DESCONTINUADOS em 2026-07-24. Os modelos vigentes são `deepseek-v4-flash`
 * (barato e rápido) e `deepseek-v4-pro` (mais caro e mais capaz).
 */
export const DEFAULT_MODEL: Record<string, string> = {
  // Familia GPT-5.6 (atual). gpt-4o/4o-mini ainda funcionam, mas gpt-4-turbo e
  // gpt-3.5-turbo serao desligados em 2026-10-23.
  openai: 'gpt-5.6-terra',
  deepseek: 'deepseek-v4-flash',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-1.5-flash',
  groq: 'llama-3.1-70b-versatile',
  mistral: 'mistral-large-latest',
  openrouter: 'openai/gpt-4o-mini',
};

/** Modelos oferecidos na interface de Configurações (BYOK). */
export const PROVIDER_MODELS: Record<string, string[]> = {
  // sol = melhor raciocinio ($5/$30 por 1M) · terra = equilibrado ($2/$12)
  // luna = otimizado para volume ($0.20/$1.20). Todos leem imagem.
  openai: ['gpt-5.6-terra', 'gpt-5.6-sol', 'gpt-5.6-luna', 'gpt-4o', 'gpt-4o-mini'],
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  google: ['gemini-1.5-flash', 'gemini-1.5-pro'],
  groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant'],
  mistral: ['mistral-large-latest', 'mistral-small-latest'],
  openrouter: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet'],
};

/**
 * Parâmetros extras que alguns provedores exigem no corpo da requisição.
 *
 * DeepSeek V4 liga o "thinking mode" POR PADRÃO (effort high). Isso tem dois
 * efeitos colaterais que quebram nosso uso:
 *   1. `temperature` / `top_p` passam a ser IGNORADOS silenciosamente — o que
 *      destruiria a classificação determinística do roteador (temperature 0).
 *   2. A cadeia de raciocínio consome o orçamento de `max_tokens` antes de
 *      produzir a resposta — com limites baixos, o retorno vem vazio.
 *
 * Por isso desligamos thinking por padrão. Passe `thinking: true` quando o
 * raciocínio longo valer o custo e a latência (ex: agentes de estratégia).
 */
export function providerExtras(
  provider: string,
  opts: { thinking?: boolean } = {}
): Record<string, unknown> {
  if (provider === 'deepseek') {
    return opts.thinking
      ? { thinking: { type: 'enabled' }, reasoning_effort: 'high' }
      : { thinking: { type: 'disabled' } };
  }
  return {};
}

/**
 * Variante de `providerExtras` para call sites que só conhecem o base URL
 * (e não o id do provedor). Evita mudar assinaturas de funções existentes.
 */
export function extrasForEndpoint(
  baseUrl: string,
  opts: { thinking?: boolean } = {}
): Record<string, unknown> {
  if (baseUrl.includes('api.deepseek.com')) return providerExtras('deepseek', opts);
  return {};
}

/**
 * Modelos descontinuados → substituto vigente.
 *
 * Existe porque um nome de modelo pode estar fixado em lugares que o deploy não
 * alcança: variável de ambiente antiga na Vercel, config BYOK salva no
 * localStorage do usuário, ou payload de integração externa. Sem esta migração,
 * o retorno seria um erro cru da API ("Model Not Exist") sem pista da causa.
 *
 * `thinking` preserva a intenção do nome antigo: `deepseek-reasoner` existia
 * justamente para raciocinar, então ele mantém o thinking mode ligado.
 */
export const LEGACY_MODEL_MAP: Record<string, { model: string; thinking: boolean }> = {
  // Descontinuados pela DeepSeek em 2026-07-24.
  'deepseek-chat': { model: 'deepseek-v4-flash', thinking: false },
  'deepseek-reasoner': { model: 'deepseek-v4-flash', thinking: true },
  // Desligados pela OpenAI em 2026-07-23 (substituto oficial: gpt-5.6-sol).
  'gpt-5-chat-latest': { model: 'gpt-5.6-sol', thinking: false },
  'gpt-5.1-chat-latest': { model: 'gpt-5.6-sol', thinking: false },
  'gpt-5-codex': { model: 'gpt-5.6-sol', thinking: false },
  // Desligamento anunciado para 2026-08-10 — migrando desde já.
  'gpt-5.2-chat-latest': { model: 'gpt-5.6-sol', thinking: false },
  'gpt-5.3-chat-latest': { model: 'gpt-5.6-sol', thinking: false },
};

export interface NormalizedModel {
  model: string;
  /** true quando o nome legado implicava raciocínio longo. */
  thinking: boolean;
  /** true quando houve substituição — útil para log/diagnóstico. */
  migrated: boolean;
  /** Nome original, quando migrado. */
  original?: string;
}

/**
 * Traduz um nome de modelo descontinuado para o vigente.
 * Nomes desconhecidos passam intactos (pode ser um modelo novo que ainda não mapeamos).
 */
export function normalizeModel(model: string): NormalizedModel {
  const key = (model || '').trim().toLowerCase();
  const hit = LEGACY_MODEL_MAP[key];
  if (hit) {
    return { model: hit.model, thinking: hit.thinking, migrated: true, original: model };
  }
  return { model, thinking: false, migrated: false };
}

/**
 * Modelos que aceitam imagem como entrada (visão), por provedor.
 *
 * ⚠️ DeepSeek NÃO está aqui de propósito: o V4 (flash e pro) é text-only — o
 * schema de mensagens da API não aceita conteúdo de imagem, e uma chamada com
 * imagem falha na camada de request. Deixar DeepSeek fora faz o Copilot degradar
 * de forma controlada (anexa a foto ao post, mas escreve a legenda a partir do
 * texto do usuário) em vez de estourar um erro cru.
 */
export const VISION_MODEL_PATTERNS: Record<string, RegExp[]> = {
  // Toda a familia GPT-5.x aceita texto + imagem. GPT-4o e 4.1 tambem.
  openai: [/^gpt-5/, /^gpt-4o/, /^gpt-4\.1/, /^gpt-4-turbo/, /^o[1-9]/],
  anthropic: [/^claude-3/, /^claude-4/, /^claude-sonnet/, /^claude-opus/, /^claude-haiku/],
  google: [/^gemini-/],
  // OpenRouter roteia para modelos de terceiros — depende do modelo escolhido.
  openrouter: [/gpt-5/, /gpt-4o/, /claude-3/, /claude-4/, /gemini/, /vision/],
  groq: [/vision/],
};

/** Um provedor+modelo consegue analisar imagens? */
export function supportsVision(provider: string, model: string): boolean {
  const patterns = VISION_MODEL_PATTERNS[provider];
  if (!patterns) return false;
  const m = (model || '').trim().toLowerCase();
  return patterns.some((re) => re.test(m));
}

/** Provedores que têm ao menos um modelo com visão — usado nas mensagens de UI. */
export const VISION_CAPABLE_PROVIDERS = Object.keys(VISION_MODEL_PATTERNS);

/**
 * Modelos que exigem o formato de requisição "reasoning" da OpenAI.
 *
 * A familia GPT-5.x e a serie o* NAO aceitam:
 *   - `max_tokens`  → o nome do campo passa a ser `max_completion_tokens`
 *   - `temperature` / `top_p` → rejeitados com HTTP 400 (nao sao apenas ignorados)
 *
 * Enviar qualquer um deles resulta em
 * "Unsupported parameter: 'max_tokens' is not supported with this model".
 */
const REASONING_MODEL_PATTERNS: RegExp[] = [/^gpt-5/, /^o[1-9]/];

export interface RequestShape {
  /** Nome do campo de limite de tokens aceito pelo modelo. */
  tokenParam: 'max_tokens' | 'max_completion_tokens';
  /** false → enviar `temperature` causa HTTP 400. */
  supportsTemperature: boolean;
}

export function requestShape(provider: string, model: string): RequestShape {
  const m = (model || '').trim().toLowerCase();
  // OpenRouter usa prefixo de vendor (ex: "openai/gpt-5.6-sol").
  const bare = m.includes('/') ? m.split('/').pop() || m : m;
  const isReasoning =
    (provider === 'openai' || provider === 'openrouter' || provider === 'custom') &&
    REASONING_MODEL_PATTERNS.some((re) => re.test(bare));

  return isReasoning
    ? { tokenParam: 'max_completion_tokens', supportsTemperature: false }
    : { tokenParam: 'max_tokens', supportsTemperature: true };
}

/**
 * Orçamento mínimo de tokens para modelos de raciocínio.
 *
 * Em GPT-5.x, `max_completion_tokens` é um ORÇAMENTO TOTAL: os tokens gastos
 * raciocinando saem dele antes de qualquer texto ser emitido. Com um limite
 * baixo (o roteador do Copilot usa 150), o raciocínio consome tudo e a resposta
 * volta VAZIA — sem erro, o que torna a falha difícil de diagnosticar.
 *
 * Elevar o piso é seguro em custo: o campo é um teto, cobra-se o que foi usado.
 */
const REASONING_MIN_TOKENS = 1200;

/**
 * Monta os campos de limite de tokens e amostragem no formato aceito pelo modelo.
 * Centralizado aqui para que nenhuma rota volte a enviar `max_tokens` para um
 * modelo de raciocinio.
 */
export function buildSamplingParams(
  provider: string,
  model: string,
  opts: { maxTokens: number; temperature?: number }
): Record<string, unknown> {
  const shape = requestShape(provider, model);

  if (shape.tokenParam === 'max_completion_tokens') {
    // Reserva espaço para o raciocínio, senão a resposta pode voltar vazia.
    return { max_completion_tokens: Math.max(opts.maxTokens, REASONING_MIN_TOKENS) };
  }

  const params: Record<string, unknown> = { max_tokens: opts.maxTokens };
  if (opts.temperature !== undefined) params.temperature = opts.temperature;
  return params;
}

/** Variante para call sites que só conhecem o base URL (não o id do provedor). */
export function buildSamplingParamsForEndpoint(
  baseUrl: string,
  model: string,
  opts: { maxTokens: number; temperature?: number }
): Record<string, unknown> {
  const provider = baseUrl.includes('api.openai.com')
    ? 'openai'
    : baseUrl.includes('openrouter.ai')
      ? 'openrouter'
      : 'custom';
  return buildSamplingParams(provider, model, opts);
}

/**
 * 🔎 Busca na web dentro do Chat Completions.
 *
 * A API de Chat Completions NÃO aceita o tool `web_search` (isso é exclusivo da
 * Responses API). O caminho suportado é usar um MODELO de busca dedicado, que
 * sempre pesquisa antes de responder.
 *
 * Só a OpenAI oferece isso no formato que já usamos, então em qualquer outro
 * provedor a funcionalidade degrada de forma controlada (avisamos o usuário em
 * vez de inventar tendências).
 */
export const WEB_SEARCH_MODEL: Record<string, string> = {
  openai: 'gpt-5-search-api',
};

export function supportsWebSearch(provider: string): boolean {
  return Boolean(WEB_SEARCH_MODEL[provider]);
}

export interface WebSearchLocation {
  /** ISO 3166-1 alpha-2, ex: 'BR' */
  country?: string;
  city?: string;
  region?: string;
}

/**
 * Monta `web_search_options`. `user_location` faz diferença real para negócio
 * local: sem ela a busca traz tendências globais, com ela traz o que acontece
 * na cidade do usuário.
 */
export function buildWebSearchOptions(
  location?: WebSearchLocation,
  contextSize: 'low' | 'medium' | 'high' = 'high'
): Record<string, unknown> {
  const options: Record<string, unknown> = { search_context_size: contextSize };
  if (location?.city || location?.region || location?.country) {
    options.user_location = {
      type: 'approximate',
      approximate: {
        country: location.country || 'BR',
        ...(location.city ? { city: location.city } : {}),
        ...(location.region ? { region: location.region } : {}),
      },
    };
  }
  return options;
}

/** Fonte citada pelo modelo de busca (annotations do tipo url_citation). */
export interface WebSource {
  url: string;
  title: string;
}

/** Extrai as citações da resposta do Chat Completions, sem duplicar URLs. */
export function extractSources(message: unknown): WebSource[] {
  const annotations = (message as { annotations?: unknown[] })?.annotations;
  if (!Array.isArray(annotations)) return [];

  const seen = new Set<string>();
  const out: WebSource[] = [];
  for (const a of annotations) {
    const item = a as { type?: string; url_citation?: { url?: string; title?: string } };
    if (item?.type !== 'url_citation') continue;
    const url = item.url_citation?.url;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: item.url_citation?.title || url });
  }
  return out;
}

/**
 * Rotas que identificam um VÍDEO específico — algo que o usuário abre, assiste
 * e copia — em oposição a um artigo falando *sobre* tendências.
 */
const VIDEO_URL_PATTERNS: RegExp[] = [
  /instagram\.com\/(reel|reels|p|tv)\//i,
  /tiktok\.com\/@[\w.\-]+\/video\//i,
  /(vm|vt)\.tiktok\.com\//i,
  /youtube\.com\/shorts\//i,
  /youtu\.be\//i,
  /youtube\.com\/watch\?/i,
  /facebook\.com\/(reel|watch)/i,
  /kwai\.com\//i,
];

export function isVideoUrl(url: string): boolean {
  return VIDEO_URL_PATTERNS.some((re) => re.test(url));
}

/**
 * Separa o que dá para ABRIR E COPIAR (vídeos reais) do que é só leitura de
 * apoio (artigos sobre tendências).
 *
 * Por que isso existe: a skill "Reels em alta" entregava tudo junto numa lista
 * genérica de "Fontes", que na prática virava um monte de link de blog. O
 * usuário pediu referência de Reels, não bibliografia — os vídeos precisam
 * aparecer em primeiro lugar e separados.
 */
export function splitSources(sources: WebSource[]): {
  videos: WebSource[];
  articles: WebSource[];
} {
  const videos: WebSource[] = [];
  const articles: WebSource[] = [];
  for (const s of sources) (isVideoUrl(s.url) ? videos : articles).push(s);
  return { videos, articles };
}

/** Resolve o base URL de um provedor OpenAI-compatible. */
export function resolveBaseUrl(provider: string, customBaseUrl?: string): string | undefined {
  if (provider === 'custom') return customBaseUrl;
  return OPENAI_COMPATIBLE_BASE[provider];
}

/** Extrai mensagem de erro legível de uma resposta de API. */
export function parseProviderError(text: string): string {
  try {
    const obj = JSON.parse(text);
    return obj.error?.message || obj.message || text;
  } catch {
    return text.slice(0, 300);
  }
}


/** Erros em que vale tentar outro provedor (429 / 5xx / sobrecarga). */
export function isRetryableProviderError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  if (!msg) return false;
  if (/\(429\)/.test(msg) || /rate limit/i.test(msg) || /tokens per min/i.test(msg)) {
    return true;
  }
  if (/\((500|502|503|529)\)/.test(msg)) return true;
  if (/overloaded|capacity|temporarily unavailable|service unavailable/i.test(msg)) {
    return true;
  }
  return false;
}
