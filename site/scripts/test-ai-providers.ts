/**
 * Valida a configuração de provedores de IA — em especial as regras do DeepSeek V4,
 * que quebraram silenciosamente quando os modelos legados foram descontinuados.
 */
import {
  DEFAULT_MODEL,
  OPENAI_COMPATIBLE_BASE,
  PROVIDER_MODELS,
  providerExtras,
  extrasForEndpoint,
  normalizeModel,
  resolveBaseUrl,
  supportsVision,
  requestShape,
  buildSamplingParams,
  buildSamplingParamsForEndpoint,
  supportsWebSearch,
  WEB_SEARCH_MODEL,
  buildWebSearchOptions,
  extractSources,
} from '../src/lib/aiProviders';

let pass = 0;
let fail = 0;

function check(label: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}\n       esperado: ${JSON.stringify(expected)}\n       obtido:   ${JSON.stringify(got)}`);
  }
}

function checkTrue(label: string, cond: boolean) {
  check(label, cond, true);
}

console.log('─── Modelos vigentes ───');
check('modelo padrão do DeepSeek é v4-flash', DEFAULT_MODEL.deepseek, 'deepseek-v4-flash');
checkTrue(
  'nenhum modelo padrão usa nome legado descontinuado',
  !Object.values(DEFAULT_MODEL).some((m) => m === 'deepseek-chat' || m === 'deepseek-reasoner')
);
checkTrue(
  'lista de modelos DeepSeek só tem os vigentes',
  PROVIDER_MODELS.deepseek.every((m) => m === 'deepseek-v4-flash' || m === 'deepseek-v4-pro')
);

console.log('\n─── Endpoints ───');
check(
  'base URL do DeepSeek sem sufixo /v1',
  OPENAI_COMPATIBLE_BASE.deepseek,
  'https://api.deepseek.com'
);
check(
  'endpoint final bate com a doc oficial',
  `${OPENAI_COMPATIBLE_BASE.deepseek.replace(/\/$/, '')}/chat/completions`,
  'https://api.deepseek.com/chat/completions'
);
check('OpenAI mantém /v1', OPENAI_COMPATIBLE_BASE.openai, 'https://api.openai.com/v1');
check('provider custom usa baseUrl informado', resolveBaseUrl('custom', 'https://meu.host/v1'), 'https://meu.host/v1');

console.log('\n─── Thinking mode (DeepSeek V4) ───');
check(
  'desligado por padrão',
  providerExtras('deepseek'),
  { thinking: { type: 'disabled' } }
);
check(
  'ligável sob demanda com effort high',
  providerExtras('deepseek', { thinking: true }),
  { thinking: { type: 'enabled' }, reasoning_effort: 'high' }
);
check('não injeta nada para OpenAI', providerExtras('openai'), {});
check('não injeta nada para Anthropic', providerExtras('anthropic'), {});
check(
  'detecção por endpoint funciona',
  extrasForEndpoint('https://api.deepseek.com'),
  { thinking: { type: 'disabled' } }
);
check('endpoint de terceiro não recebe extras', extrasForEndpoint('https://api.openai.com/v1'), {});

console.log('\n─── Contrato do payload ───');
// Simula o corpo que o roteador do Copilot envia (classificação determinística)
const routerBody = {
  model: DEFAULT_MODEL.deepseek,
  messages: [{ role: 'system', content: 'x' }],
  temperature: 0,
  max_tokens: 150,
  ...providerExtras('deepseek'),
};
checkTrue(
  'roteador envia thinking disabled junto de temperature 0',
  (routerBody as Record<string, unknown>).thinking !== undefined && routerBody.temperature === 0
);
checkTrue(
  'com thinking desligado, os 150 tokens ficam para a resposta',
  JSON.stringify(routerBody).includes('"type":"disabled"')
);

console.log('\n─── Migração de modelos descontinuados ───');
check(
  'deepseek-chat migra para v4-flash sem thinking',
  normalizeModel('deepseek-chat'),
  { model: 'deepseek-v4-flash', thinking: false, migrated: true, original: 'deepseek-chat' }
);
check(
  'deepseek-reasoner migra para v4-flash COM thinking (preserva a intenção)',
  normalizeModel('deepseek-reasoner'),
  { model: 'deepseek-v4-flash', thinking: true, migrated: true, original: 'deepseek-reasoner' }
);
check(
  'modelo vigente passa intacto',
  normalizeModel('deepseek-v4-pro'),
  { model: 'deepseek-v4-pro', thinking: false, migrated: false }
);
check(
  'modelo de outro provedor passa intacto',
  normalizeModel('gpt-4o-mini'),
  { model: 'gpt-4o-mini', thinking: false, migrated: false }
);
check(
  'migração é case-insensitive e tolera espaços',
  normalizeModel('  DeepSeek-Chat  ').model,
  'deepseek-v4-flash'
);
checkTrue('modelo vazio não quebra', normalizeModel('').migrated === false);

console.log('\n─── Cenário real: env var antiga na Vercel ───');
// Reproduz exatamente o que o screenshot do usuário mostrou:
// CONTENT_STUDIO_AI_MODEL=deepseek-chat fixado no ambiente.
const envModel = 'deepseek-chat';
const resolved = normalizeModel(envModel || DEFAULT_MODEL.deepseek);
check('env var antiga é curada em runtime', resolved.model, 'deepseek-v4-flash');
checkTrue('e sinaliza que houve migração', resolved.migrated);

console.log('\n─── Suporte a visão (imagem) ───');
checkTrue('DeepSeek v4-flash NAO le imagem', !supportsVision('deepseek', 'deepseek-v4-flash'));
checkTrue('DeepSeek v4-pro NAO le imagem', !supportsVision('deepseek', 'deepseek-v4-pro'));
checkTrue('OpenAI gpt-5.6-terra le imagem', supportsVision('openai', 'gpt-5.6-terra'));
checkTrue('OpenAI gpt-5.6-sol le imagem', supportsVision('openai', 'gpt-5.6-sol'));
checkTrue('OpenAI gpt-5.6-luna le imagem', supportsVision('openai', 'gpt-5.6-luna'));
checkTrue('OpenAI gpt-4o-mini le imagem', supportsVision('openai', 'gpt-4o-mini'));
checkTrue('OpenAI gpt-4o le imagem', supportsVision('openai', 'gpt-4o'));
checkTrue('Anthropic claude-3-5-sonnet le imagem', supportsVision('anthropic', 'claude-3-5-sonnet-20241022'));
checkTrue('Google gemini-1.5-flash le imagem', supportsVision('google', 'gemini-1.5-flash'));
checkTrue('Mistral large NAO le imagem', !supportsVision('mistral', 'mistral-large-latest'));
checkTrue('provider desconhecido NAO le imagem', !supportsVision('qualquer', 'modelo-x'));
checkTrue('deteccao é case-insensitive', supportsVision('openai', 'GPT-5.6-TERRA'));

console.log('\n─── Catálogo OpenAI atualizado (2026) ───');
check('modelo padrão do OpenAI é gpt-5.6-terra', DEFAULT_MODEL.openai, 'gpt-5.6-terra');
checkTrue(
  'familia GPT-5.6 disponivel no seletor',
  ['gpt-5.6-terra', 'gpt-5.6-sol', 'gpt-5.6-luna'].every((m) =>
    PROVIDER_MODELS.openai.includes(m)
  )
);
checkTrue(
  'modelos com desligamento em 2026-10-23 fora do seletor',
  !PROVIDER_MODELS.openai.includes('gpt-3.5-turbo') &&
    !PROVIDER_MODELS.openai.includes('gpt-4-turbo')
);
checkTrue(
  'todo modelo ofertado do OpenAI le imagem',
  PROVIDER_MODELS.openai.every((m) => supportsVision('openai', m))
);
check(
  'gpt-5-chat-latest (desligado 2026-07-23) migra para sol',
  normalizeModel('gpt-5-chat-latest').model,
  'gpt-5.6-sol'
);
checkTrue(
  'gpt-4o-mini NAO e migrado (ainda ativo)',
  normalizeModel('gpt-4o-mini').migrated === false
);

console.log('\n─── Formato da requisição (GPT-5.x é reasoning model) ───');
check(
  'gpt-5.6-sol usa max_completion_tokens',
  requestShape('openai', 'gpt-5.6-sol').tokenParam,
  'max_completion_tokens'
);
checkTrue(
  'gpt-5.6-sol NAO aceita temperature',
  requestShape('openai', 'gpt-5.6-sol').supportsTemperature === false
);
check(
  'gpt-4o-mini segue com max_tokens',
  requestShape('openai', 'gpt-4o-mini').tokenParam,
  'max_tokens'
);
checkTrue(
  'gpt-4o-mini aceita temperature',
  requestShape('openai', 'gpt-4o-mini').supportsTemperature
);
check('o3-mini usa max_completion_tokens', requestShape('openai', 'o3-mini').tokenParam, 'max_completion_tokens');
check(
  'DeepSeek segue com max_tokens',
  requestShape('deepseek', 'deepseek-v4-flash').tokenParam,
  'max_tokens'
);
check(
  'OpenRouter com prefixo de vendor e detectado',
  requestShape('openrouter', 'openai/gpt-5.6-terra').tokenParam,
  'max_completion_tokens'
);

console.log('\n─── Corpo da requisição montado ───');
check(
  'reasoning model: sem temperature, com max_completion_tokens',
  buildSamplingParams('openai', 'gpt-5.6-sol', { maxTokens: 1600, temperature: 0.7 }),
  { max_completion_tokens: 1600 }
);
check(
  'reasoning model: orcamento baixo recebe piso (senao volta vazio)',
  buildSamplingParams('openai', 'gpt-5.6-sol', { maxTokens: 150, temperature: 0 }),
  { max_completion_tokens: 1200 }
);
check(
  'modelo classico: temperature preservada',
  buildSamplingParams('openai', 'gpt-4o-mini', { maxTokens: 1600, temperature: 0.7 }),
  { max_tokens: 1600, temperature: 0.7 }
);
check(
  'roteador com temperature 0 em modelo classico',
  buildSamplingParams('deepseek', 'deepseek-v4-flash', { maxTokens: 150, temperature: 0 }),
  { max_tokens: 150, temperature: 0 }
);
check(
  'roteador em reasoning model omite temperature 0',
  buildSamplingParams('openai', 'gpt-5.6-sol', { maxTokens: 150, temperature: 0 }),
  { max_completion_tokens: 1200 }
);
check(
  'deteccao por endpoint (rotas legadas)',
  buildSamplingParamsForEndpoint('https://api.openai.com/v1', 'gpt-5.6-sol', {
    maxTokens: 500,
    temperature: 0.7,
  }),
  { max_completion_tokens: 1200 }
);
check(
  'endpoint DeepSeek nao e tratado como reasoning',
  buildSamplingParamsForEndpoint('https://api.deepseek.com', 'deepseek-v4-flash', {
    maxTokens: 500,
    temperature: 0.7,
  }),
  { max_tokens: 500, temperature: 0.7 }
);
checkTrue(
  'nenhum modelo ofertado do OpenAI recebe max_tokens indevido',
  PROVIDER_MODELS.openai.every((m) => {
    const p = buildSamplingParams('openai', m, { maxTokens: 100, temperature: 0.5 });
    const shape = requestShape('openai', m);
    return shape.tokenParam in p && !('max_tokens' in p && shape.tokenParam !== 'max_tokens');
  })
);

console.log('\n─── Busca na web (modelo dedicado) ───');
checkTrue('OpenAI suporta busca na web', supportsWebSearch('openai'));
checkTrue('DeepSeek NAO suporta', !supportsWebSearch('deepseek'));
checkTrue('Anthropic NAO suporta', !supportsWebSearch('anthropic'));
checkTrue('Google NAO suporta (nesta via)', !supportsWebSearch('google'));
check('modelo de busca do OpenAI', WEB_SEARCH_MODEL.openai, 'gpt-5-search-api');
checkTrue(
  'modelo de busca usa max_completion_tokens (e familia gpt-5)',
  requestShape('openai', WEB_SEARCH_MODEL.openai).tokenParam === 'max_completion_tokens'
);

console.log('\n─── Opções de busca ───');
check(
  'sem cidade: só o tamanho de contexto',
  buildWebSearchOptions(),
  { search_context_size: 'high' }
);
check(
  'com cidade: inclui user_location aproximada',
  buildWebSearchOptions({ country: 'BR', city: 'Bauru' }),
  {
    search_context_size: 'high',
    user_location: { type: 'approximate', approximate: { country: 'BR', city: 'Bauru' } },
  }
);
check(
  'contexto ajustavel',
  buildWebSearchOptions(undefined, 'low'),
  { search_context_size: 'low' }
);

console.log('\n─── Citações (fontes verificáveis) ───');
const fakeMessage = {
  content: 'texto',
  annotations: [
    { type: 'url_citation', url_citation: { url: 'https://a.com/1', title: 'Tendência A' } },
    { type: 'url_citation', url_citation: { url: 'https://b.com/2', title: 'Tendência B' } },
    // duplicata: nao deve repetir
    { type: 'url_citation', url_citation: { url: 'https://a.com/1', title: 'Tendência A' } },
    // tipo diferente: ignorado
    { type: 'file_citation', file_citation: { file_id: 'x' } },
  ],
};
const srcs = extractSources(fakeMessage);
check('duas fontes unicas extraidas', srcs.length, 2);
check('url preservada', srcs[0].url, 'https://a.com/1');
check('titulo preservado', srcs[1].title, 'Tendência B');
check('mensagem sem annotations retorna vazio', extractSources({ content: 'x' }), []);
check('mensagem nula nao quebra', extractSources(null), []);

console.log(`\n═══ RESULTADO: ${pass} passou / ${fail} falhou ═══`);
if (fail > 0) process.exit(1);
