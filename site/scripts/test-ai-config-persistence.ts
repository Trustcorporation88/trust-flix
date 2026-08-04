/**
 * Reproduz o ciclo real de persistência da config de IA (BYOK):
 *   salvar em Configurações → recarregar a página → ler de volta.
 *
 * "Recarregar a página" é simulado limpando o cache de módulos do Node e
 * reimportando o aiExecutor, o que cria uma instância nova do singleton —
 * exatamente o que acontece num F5 do navegador.
 */

// ── Mock mínimo de localStorage/window ────────────────────────────
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return Array.from(this.data.keys())[i] ?? null;
  }
  clear() {
    this.data.clear();
  }
  /** Espia o conteúdo cru, como o DevTools faria. */
  dump() {
    return Object.fromEntries(this.data);
  }
}

const storage = new MemoryStorage();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = { localStorage: storage };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = storage;

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

/** Simula um F5: descarta o módulo e reimporta, criando novo singleton. */
async function reloadPage() {
  const path = require.resolve('../src/services/aiExecutor');
  delete require.cache[path];
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../src/services/aiExecutor') as typeof import('../src/services/aiExecutor');
}

async function main() {
  console.log('─── 1. Salvar a chave em Configurações ───');
  let mod = await reloadPage();
  mod.aiExecutor.configure({
    provider: 'deepseek',
    apiKey: 'sk-minha-chave-secreta',
    model: 'deepseek-v4-flash',
    baseUrl: 'https://api.deepseek.com',
  });

  const keys = Object.keys(storage.dump());
  console.log(`     chaves no localStorage: ${JSON.stringify(keys)}`);
  checkTrue('gravou algo no localStorage', keys.length > 0);

  const saved = mod.aiExecutor.getCurrentProvider();
  check('config disponível na mesma sessão', saved?.apiKey, 'sk-minha-chave-secreta');

  console.log('\n─── 2. Recarregar a página (F5) ───');
  mod = await reloadPage();
  const afterReload = mod.aiExecutor.getCurrentProvider();
  console.log(`     getCurrentProvider() → ${JSON.stringify(afterReload)}`);
  checkTrue('config sobreviveu ao reload', afterReload !== null);
  check('provider preservado', afterReload?.provider, 'deepseek');
  check('apiKey preservada', afterReload?.apiKey, 'sk-minha-chave-secreta');
  check('model preservado', afterReload?.model, 'deepseek-v4-flash');
  check('baseUrl preservada', afterReload?.baseUrl, 'https://api.deepseek.com');

  console.log('\n─── 3. Config antiga com modelo descontinuado ───');
  storage.clear();
  storage.setItem(
    'jetflix_ai_config',
    JSON.stringify({ provider: 'deepseek', apiKey: 'sk-antiga', model: 'deepseek-chat' })
  );
  mod = await reloadPage();
  const migrated = mod.aiExecutor.getCurrentProvider();
  check('chave antiga ainda é carregada', migrated?.apiKey, 'sk-antiga');
  check('modelo descontinuado foi migrado', migrated?.model, 'deepseek-v4-flash');
  const rewritten = JSON.parse(storage.getItem('jetflix_ai_config') || '{}');
  check('localStorage foi reescrito com o modelo novo', rewritten.model, 'deepseek-v4-flash');

  console.log('\n─── 4. Remover a config (botão Limpar) ───');
  mod = await reloadPage();
  mod.aiExecutor.reset();
  checkTrue('config removida da memória', mod.aiExecutor.getCurrentProvider() === null);
  mod = await reloadPage();
  checkTrue('e não volta após reload', mod.aiExecutor.getCurrentProvider() === null);

  console.log('\n─── 5. localStorage indisponível (modo privado/quota) ───');
  const brokenStorage = {
    getItem: () => {
      throw new Error('SecurityError: localStorage bloqueado');
    },
    setItem: () => {
      throw new Error('SecurityError: localStorage bloqueado');
    },
    removeItem: () => {},
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = { localStorage: brokenStorage };
  mod = await reloadPage();
  let crashed = false;
  try {
    mod.aiExecutor.configure({ provider: 'openai', apiKey: 'sk-x', model: 'gpt-4o-mini' });
    mod.aiExecutor.getCurrentProvider();
  } catch {
    crashed = true;
  }
  checkTrue('não quebra a aplicação quando localStorage falha', !crashed);

  console.log(`\n═══ RESULTADO: ${pass} passou / ${fail} falhou ═══`);
  if (fail > 0) process.exit(1);
}

void main();
