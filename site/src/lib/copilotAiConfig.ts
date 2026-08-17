/**
 * Resolução de chaves do Copilot.
 *
 * Motor principal: Claude (Anthropic). Fallback: DeepSeek (chave do Content Studio).
 * A ordem importa: se o Content Studio vier primeiro, o Copilot nunca usa o Claude
 * — que era o bug ("DeepSeek não lê foto" mesmo com ANTHROPIC_API_KEY no ar).
 */

import { DEFAULT_MODEL, normalizeModel } from './aiProviders';

export type CopilotProvider =
  | 'openai'
  | 'deepseek'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'mistral'
  | 'openrouter'
  | 'custom';

export interface CopilotResolved {
  provider: CopilotProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  migratedFrom?: string;
  thinking?: boolean;
}

export type CopilotEnv = Record<string, string | undefined>;

function finalize(cfg: CopilotResolved): CopilotResolved {
  const n = normalizeModel(cfg.model);
  if (!n.migrated) return cfg;
  return {
    ...cfg,
    model: n.model,
    migratedFrom: n.original,
    thinking: n.thinking,
  };
}

function sameTarget(a: CopilotResolved | null, b: CopilotResolved): boolean {
  return Boolean(a && a.provider === b.provider && a.apiKey === b.apiKey);
}

/** Chave dedicada COPILOT_AI_* — se existir, ela manda (BYOK no body é outro caminho). */
function fromDedicatedCopilotKey(env: CopilotEnv): CopilotResolved | null {
  if (!env.COPILOT_AI_API_KEY) return null;
  const provider = (env.COPILOT_AI_PROVIDER || 'anthropic') as CopilotProvider;
  return finalize({
    provider,
    apiKey: env.COPILOT_AI_API_KEY,
    model: env.COPILOT_AI_MODEL || DEFAULT_MODEL[provider] || DEFAULT_MODEL.anthropic,
    baseUrl: env.COPILOT_AI_BASE_URL,
  });
}

function fromAnthropic(env: CopilotEnv): CopilotResolved | null {
  const apiKey = env.ANTHROPIC_API_KEY || env.COPILOT_ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return finalize({
    provider: 'anthropic',
    apiKey,
    model: env.COPILOT_AI_MODEL || DEFAULT_MODEL.anthropic,
  });
}

function fromContentStudio(env: CopilotEnv): CopilotResolved | null {
  if (!env.CONTENT_STUDIO_AI_API_KEY) return null;
  const provider = (env.CONTENT_STUDIO_AI_PROVIDER || 'deepseek') as CopilotProvider;
  return finalize({
    provider,
    apiKey: env.CONTENT_STUDIO_AI_API_KEY,
    model:
      env.CONTENT_STUDIO_AI_MODEL || DEFAULT_MODEL[provider] || DEFAULT_MODEL.deepseek,
    baseUrl: env.CONTENT_STUDIO_AI_BASE_URL,
  });
}

/**
 * Motor principal do Copilot (sem BYOK).
 *
 * 1. COPILOT_AI_API_KEY (provider padrão: anthropic)
 * 2. ANTHROPIC_API_KEY / COPILOT_ANTHROPIC_API_KEY → Claude
 * 3. CONTENT_STUDIO_AI_API_KEY → em geral DeepSeek (último recurso)
 */
export function resolveCopilotPrimaryFromEnv(env: CopilotEnv): CopilotResolved | null {
  return fromDedicatedCopilotKey(env) || fromAnthropic(env) || fromContentStudio(env);
}

/**
 * Fallback quando o principal estoura 429/5xx, ou quando o principal não lê foto.
 *
 * 1. COPILOT_AI_FALLBACK_API_KEY (provider padrão: deepseek)
 * 2. CONTENT_STUDIO_AI_API_KEY (DeepSeek) — se o principal já for Claude
 */
export function resolveCopilotFallbackFromEnv(
  env: CopilotEnv,
  primary?: CopilotResolved | null
): CopilotResolved | null {
  if (env.COPILOT_AI_FALLBACK_API_KEY) {
    const provider = (env.COPILOT_AI_FALLBACK_PROVIDER || 'deepseek') as CopilotProvider;
    const candidate = finalize({
      provider,
      apiKey: env.COPILOT_AI_FALLBACK_API_KEY,
      model:
        env.COPILOT_AI_FALLBACK_MODEL ||
        DEFAULT_MODEL[provider] ||
        DEFAULT_MODEL.deepseek,
    });
    if (!sameTarget(primary ?? null, candidate)) return candidate;
  }

  const studio = fromContentStudio(env);
  if (studio && !sameTarget(primary ?? null, studio)) return studio;

  return null;
}
