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
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-v4-flash',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-1.5-flash',
  groq: 'llama-3.1-70b-versatile',
  mistral: 'mistral-large-latest',
  openrouter: 'openai/gpt-4o-mini',
};

/** Modelos oferecidos na interface de Configurações (BYOK). */
export const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o'],
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
