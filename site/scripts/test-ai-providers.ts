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

console.log(`\n═══ RESULTADO: ${pass} passou / ${fail} falhou ═══`);
if (fail > 0) process.exit(1);
