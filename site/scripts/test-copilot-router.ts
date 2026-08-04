/**
 * Teste da camada 1 do roteador do Copilot (match por palavra-chave).
 * Roda sem chamar IA — valida só a decisão de roteamento.
 */
import { routeByKeyword, buildRoutingCatalog, COPILOT_SKILLS } from '../src/lib/copilotRouter';
import { REELS_FORMATS, buildReelsContext } from '../src/lib/reelsPlaybook';
import { ARSENAL_AGENTS } from '../src/services/arsenalService';
import { stripMarkdown, extractCaption, extractTikTokTitle } from '../src/lib/textClean';
import { isVideoUrl, splitSources } from '../src/lib/aiProviders';

/** Helper de asserção booleana usado nas seções novas. */
function checkTrue2(label: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    const msg = `  ❌ ${label}`;
    failures.push(msg);
    console.log(msg);
  }
}

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

console.log('\n─── Roteamento com foto anexada ───');
const withImage: { input: string; expectId: string; note: string }[] = [
  { input: 'monta um post', expectId: 'post', note: 'pedido explícito' },
  { input: 'usa essa foto pra fazer um post', expectId: 'post', note: 'referência à foto' },
  { input: 'e aí', expectId: 'post', note: 'texto vago + foto → assume montar post' },
  { input: '', expectId: 'post', note: 'só a foto, sem texto' },
];
for (const c of withImage) {
  const r = routeByKeyword(c.input, true);
  const ok = r?.id === c.expectId;
  if (ok) {
    pass++;
    console.log(`  ✅ "${c.input || '(vazio)'}" + foto → skill:${r?.id} (${c.note})`);
  } else {
    fail++;
    const msg = `  ❌ "${c.input}" + foto → esperado skill:${c.expectId}, obtido ${r?.kind}:${r?.id}`;
    failures.push(msg);
    console.log(msg);
  }
}

// Sem foto, texto vago NÃO deve virar montagem de post — deve ir pro classificador.
const vagueNoImage = routeByKeyword('e aí', false);
if (vagueNoImage === null) {
  pass++;
  console.log('  ✅ "e aí" SEM foto → cai no classificador (não assume post)');
} else {
  fail++;
  const msg = `  ❌ "e aí" SEM foto deveria ir ao classificador, mas roteou para ${vagueNoImage.kind}:${vagueNoImage.id}`;
  failures.push(msg);
  console.log(msg);
}

// Palavra-chave específica vence a heurística da foto.
const reelsWithImage = routeByKeyword('me dá ideias de reels', true);
if (reelsWithImage?.id === 'reels') {
  pass++;
  console.log('  ✅ "ideias de reels" + foto → skill:reels (palavra-chave vence a heurística)');
} else {
  fail++;
  const msg = `  ❌ "ideias de reels" + foto deveria ir para skill:reels, obtido ${reelsWithImage?.id}`;
  failures.push(msg);
  console.log(msg);
}

console.log('\n─── Continuidade em pedidos de ajuste ───');
// Caso real reportado: o usuario pediu "refaz com CTA só de direct e inclui
// hashtag da minha cidade" enquanto montava um post. A palavra "direct" batia na
// regra do agente UGLY COPY e sequestrava o roteamento, perdendo titulo de
// TikTok e formato sugerido.
const refinamentos: { input: string; note: string }[] = [
  { input: 'refaz com CTA só de direct e inclui hashtag da minha cidade', note: 'caso reportado' },
  { input: 'ajusta pra ficar mais curto', note: 'ajuste simples' },
  { input: 'troca o CTA por whatsapp', note: 'palavra whatsapp nao sequestra' },
  { input: 'tira os emojis, só que mantém o gancho', note: 'remocao' },
  { input: 'faz outra versão dessa legenda', note: 'nova versao' },
];
for (const c of refinamentos) {
  const r = routeByKeyword(c.input, false, 'skill:post');
  const ok = r?.kind === 'skill' && r.id === 'post';
  if (ok) {
    pass++;
    console.log(`  ✅ "${c.input}" → mantém skill:post (${c.note})`);
  } else {
    fail++;
    const msg = `  ❌ "${c.input}" deveria manter skill:post, foi para ${r?.kind}:${r?.id}`;
    failures.push(msg);
    console.log(msg);
  }
}

// Sem contexto anterior, "direct" DEVE ir para o agente de mensagem direta.
const semContexto = routeByKeyword('preciso de copy pra mandar no direct', false);
if (semContexto?.kind === 'agent' && semContexto.id === 'ugly-copy') {
  pass++;
  console.log('  ✅ "copy pra mandar no direct" SEM contexto → agent:ugly-copy (correto)');
} else {
  fail++;
  const msg = `  ❌ sem contexto, "direct" deveria ir a agent:ugly-copy, foi para ${semContexto?.kind}:${semContexto?.id}`;
  failures.push(msg);
  console.log(msg);
}

// Pedido NOVO (nao ajuste) deve poder trocar de especialista mesmo com lastRoute.
const trocaDeAssunto = routeByKeyword('como estruturar meu preço e oferta', false, 'skill:post');
if (trocaDeAssunto?.kind === 'agent' && trocaDeAssunto.id === '100m-models') {
  pass++;
  console.log('  ✅ assunto novo troca de especialista mesmo com lastRoute');
} else {
  fail++;
  const msg = `  ❌ assunto novo deveria ir a agent:100m-models, foi para ${trocaDeAssunto?.kind}:${trocaDeAssunto?.id}`;
  failures.push(msg);
  console.log(msg);
}

console.log('\n─── Limpeza de markdown (Instagram nao renderiza) ───');
const casosMd: { input: string; esperado: string; note: string }[] = [
  {
    input: 'Quer garantir a sua? **Chama no direct e faça sua encomenda.**',
    esperado: 'Quer garantir a sua? Chama no direct e faça sua encomenda.',
    note: 'caso reportado',
  },
  { input: 'Texto com *itálico* aqui', esperado: 'Texto com itálico aqui', note: 'itálico' },
  { input: '## Título', esperado: 'Título', note: 'heading' },
  { input: '- item um\n- item dois', esperado: '• item um\n• item dois', note: 'bullets' },
  { input: 'use `codigo` assim', esperado: 'use codigo assim', note: 'código' },
  {
    input: 'veja [aqui](https://x.com)',
    esperado: 'veja aqui (https://x.com)',
    note: 'link',
  },
  { input: 'preço 10 * 2 reais', esperado: 'preço 10 * 2 reais', note: 'asterisco solto preservado' },
];
for (const c of casosMd) {
  const got = stripMarkdown(c.input);
  if (got === c.esperado) {
    pass++;
    console.log(`  ✅ ${c.note}`);
  } else {
    fail++;
    const msg = `  ❌ ${c.note}: esperado ${JSON.stringify(c.esperado)}, obtido ${JSON.stringify(got)}`;
    failures.push(msg);
    console.log(msg);
  }
}

console.log('\n─── Extração das seções do post ───');
const respostaPost = `**Legenda:**

Uma caixa dessas não se divide. Se disputa. 🤎

Brigadeiros gourmet para presentear.

**Título TikTok:**

A caixa de brigadeiros que todo mundo queria ganhar

**Hashtags:**

#BrigadeiroGourmet #Brigaderia #DocesBauru

**Formato sugerido:**

Post único — a caixa aberta cria impacto imediato.`;

const cap = extractCaption(respostaPost);
checkTrue2('legenda extraida sem os rotulos', !cap.includes('Legenda:') && !cap.includes('Formato'));
checkTrue2('legenda mantem o gancho', cap.includes('não se divide'));
checkTrue2('hashtags anexadas a legenda', cap.includes('#BrigadeiroGourmet'));
checkTrue2('titulo de TikTok fora da legenda', !cap.includes('todo mundo queria ganhar'));
const tt = extractTikTokTitle(respostaPost);
checkTrue2('titulo de TikTok extraido', tt === 'A caixa de brigadeiros que todo mundo queria ganhar');
checkTrue2('titulo respeita 90 caracteres', (tt?.length ?? 0) <= 90);
checkTrue2('sem asteriscos residuais na legenda', !cap.includes('**'));

console.log('\n─── Roteamento para pesquisa de tendências ───');
const casosTrends: { input: string; expectId: string; note: string }[] = [
  { input: 'o que está em alta em reels agora', expectId: 'trends', note: 'em alta' },
  { input: 'quais as tendências de reels', expectId: 'trends', note: 'tendências' },
  { input: 'o que está viralizando no meu nicho', expectId: 'trends', note: 'viralizando' },
  { input: 'me dá referências de reels que deram certo', expectId: 'trends', note: 'referências' },
  { input: 'qual áudio em alta pra usar', expectId: 'trends', note: 'áudio em alta' },
  { input: 'pesquisa na web o que funciona agora', expectId: 'trends', note: 'pesquisa explícita' },
  // "reels viral" (gerar ideia) NAO deve ir para pesquisa
  { input: 'me dá ideias de reels viral', expectId: 'reels', note: 'gerar ideia, nao pesquisar' },
  { input: 'quero um roteiro de reels', expectId: 'reels', note: 'roteiro' },
];
for (const c of casosTrends) {
  const r = routeByKeyword(c.input);
  const ok = r?.kind === 'skill' && r.id === c.expectId;
  if (ok) {
    pass++;
    console.log(`  ✅ "${c.input}" → skill:${r?.id} (${c.note})`);
  } else {
    fail++;
    const msg = `  ❌ "${c.input}" → esperado skill:${c.expectId}, obtido ${r?.kind}:${r?.id}`;
    failures.push(msg);
    console.log(msg);
  }
}

// A skill de tendências precisa declarar que exige busca na web.
const trendsSkill = COPILOT_SKILLS.find((s) => s.id === 'trends');
checkTrue2('skill trends existe', Boolean(trendsSkill));
checkTrue2('skill trends exige busca na web', trendsSkill?.needsWebSearch === true);
checkTrue2(
  'skill trends tem playbook como fallback (quando nao ha busca)',
  trendsSkill?.needsReelsContext === true
);
checkTrue2(
  'prompt proibe inventar tendencia',
  Boolean(trendsSkill?.systemPrompt.includes('NUNCA invente'))
);
// O bug original: a skill respondia so com explicacao. Estes checks impedem
// que alguem reintroduza um prompt que nao exija o link do video.
checkTrue2(
  'prompt exige link direto de video em cada item',
  Boolean(trendsSkill?.systemPrompt.includes('instagram.com/reel/')) &&
    Boolean(trendsSkill?.systemPrompt.includes('tiktok.com/@')) &&
    Boolean(trendsSkill?.systemPrompt.includes('youtube.com/shorts/'))
);
checkTrue2(
  'prompt rejeita link de perfil/hashtag como item',
  Boolean(trendsSkill?.systemPrompt.includes('NÃO conta como item'))
);
checkTrue2(
  'prompt nao proibe URL no corpo da resposta',
  !trendsSkill?.systemPrompt.includes('Não repita URLs')
);

console.log('\n─── Separacao de fontes: video vs artigo ───');
const videoCases = [
  'https://www.instagram.com/reel/C9xYzAbCdEf/',
  'https://www.tiktok.com/@padaria.sp/video/7401234567890123456',
  'https://youtube.com/shorts/aB3dE5gH7iJ',
  'https://vm.tiktok.com/ZMabc123/',
];
const articleCases = [
  'https://blog.hootsuite.com/instagram-trends/',
  'https://www.instagram.com/padaria.sp/',
  'https://www.tiktok.com/tag/paocaseiro',
];
for (const url of videoCases) checkTrue2(`video: ${url}`, isVideoUrl(url));
for (const url of articleCases) checkTrue2(`artigo/perfil: ${url}`, !isVideoUrl(url));

const split = splitSources([
  ...videoCases.map((url) => ({ url, title: url })),
  ...articleCases.map((url) => ({ url, title: url })),
]);
checkTrue2('splitSources separa 4 videos', split.videos.length === 4);
checkTrue2('splitSources separa 3 artigos', split.articles.length === 3);

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
