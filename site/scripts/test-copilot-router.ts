/**
 * Teste da camada 1 do roteador do Copilot (match por palavra-chave).
 * Roda sem chamar IA — valida só a decisão de roteamento.
 */
import { routeByKeyword, buildRoutingCatalog, COPILOT_SKILLS } from '../src/lib/copilotRouter';
import { REELS_FORMATS, buildReelsContext } from '../src/lib/reelsPlaybook';
import { ARSENAL_AGENTS } from '../src/services/arsenalService';

interface Case {
  input: string;
  expectKind: 'skill' | 'agent' | null;
  expectId?: string;
}

const cases: Case[] = [
  // Skills de conteúdo
  { input: 'me escreve uma legenda pro post de hoje', expectKind: 'skill', expectId: 'caption' },
  { input: 'quero ideias de Reels que viralizam', expectKind: 'skill', expectId: 'reels' },
  { input: 'preciso de um roteiro de vídeo curto', expectKind: 'skill', expectId: 'reels' },
  { input: 'quais hashtags eu uso?', expectKind: 'skill', expectId: 'hashtags' },
  { input: 'melhora esse meu texto aqui', expectKind: 'skill', expectId: 'improve' },
  { input: 'monta meu calendário da semana', expectKind: 'skill', expectId: 'plan' },
  { input: 'o que postar amanha', expectKind: 'skill', expectId: 'reels' },

  // Agentes especialistas
  { input: 'como estruturar minha oferta e o preço', expectKind: 'agent', expectId: '100m-models' },
  { input: 'nao estou vendendo, qual meu gargalo', expectKind: 'agent', expectId: 'doug-exe-6' },
  { input: 'quem é meu cliente ideal / persona', expectKind: 'agent', expectId: 'dissecacao' },
  { input: 'preciso de copy pra mandar no whatsapp', expectKind: 'agent', expectId: 'ugly-copy' },
  { input: 'quero criar urgência e escassez', expectKind: 'agent', expectId: 'doug-tensao' },
  { input: 'escreve minha página de vendas', expectKind: 'agent', expectId: 'a-caixa' },
  { input: 'me ajuda com bullets de benefícios', expectKind: 'agent', expectId: 'ddemarco-bullets' },
  { input: 'roteiro pra um anúncio em vídeo', expectKind: 'agent', expectId: 'storyads' },

  // Acentuação ausente (usuário digitando rápido)
  { input: 'ideia de video pro tiktok', expectKind: 'skill', expectId: 'reels' },
  { input: 'quero organizar ideias, ta baguncado', expectKind: 'agent', expectId: 'z4-sys' },

  // Sem match → deve cair pro classificador LLM (null aqui)
  { input: 'bom dia, tudo bem?', expectKind: null },
];

let pass = 0;
let fail = 0;
const failures: string[] = [];

for (const c of cases) {
  const r = routeByKeyword(c.input);
  const gotKind = r ? r.kind : null;
  const gotId = r?.id;

  const kindOk = gotKind === c.expectKind;
  const idOk = c.expectId ? gotId === c.expectId : true;

  if (kindOk && idOk) {
    pass++;
    console.log(`  ✅ "${c.input}" → ${r ? `${r.kind}:${r.id}` : 'LLM'}`);
  } else {
    fail++;
    const msg = `  ❌ "${c.input}" → esperado ${c.expectKind}:${c.expectId ?? '*'}, obtido ${gotKind}:${gotId ?? '-'}`;
    failures.push(msg);
    console.log(msg);
  }
}

console.log('\n─── Integridade do catálogo ───');
console.log(`Skills registradas: ${COPILOT_SKILLS.length}`);
console.log(`Agentes no Arsenal: ${ARSENAL_AGENTS.length}`);
console.log(`Formatos de Reels: ${REELS_FORMATS.length}`);

// Nenhum agente citado no roteador pode ter id inexistente
const catalog = buildRoutingCatalog();
const missing = COPILOT_SKILLS.filter((s) => !catalog.includes(`skill:${s.id}`));
console.log(`Skills presentes no catálogo do classificador: ${missing.length === 0 ? 'OK' : 'FALTAM ' + missing.map((m) => m.id).join(',')}`);

// Playbook precisa gerar contexto não-vazio e sem placeholders soltos
const ctx = buildReelsContext();
console.log(`Contexto de Reels gerado: ${ctx.length} chars`);
console.log(`Contém biblioteca de ganchos: ${ctx.includes('BIBLIOTECA DE GANCHOS') ? 'OK' : 'FALHOU'}`);

// Todo formato precisa de estrutura e gancho preenchidos
const brokenFormats = REELS_FORMATS.filter((f) => !f.hook || f.structure.length < 3);
console.log(`Formatos completos: ${brokenFormats.length === 0 ? 'OK' : 'INCOMPLETOS: ' + brokenFormats.map((f) => f.id).join(',')}`);

console.log(`\n═══ RESULTADO: ${pass} passou / ${fail} falhou ═══`);
if (fail > 0) {
  console.log('\nFalhas:');
  failures.forEach((f) => console.log(f));
  process.exit(1);
}
