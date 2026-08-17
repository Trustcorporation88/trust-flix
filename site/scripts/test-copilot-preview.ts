/**
 * TESTE visual de cada skill — parsers isolados (sem axios/Postiz).
 */
import {
  previewKindFromRoute,
  extractHashtags,
  extractNumberedItems,
  extractPlanDays,
  extractImprove,
  extractIdeaCards,
  extractVideoLinks,
  buildSkillPreview,
  PREVIEW_LABEL,
} from '../src/lib/copilotPreview';

let pass = 0;
let fail = 0;

function checkTrue(label: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
}

console.log('─── previewKindFromRoute ───');
const kinds: Array<[string, string, string]> = [
  ['skill', 'post', 'feed'],
  ['skill', 'caption', 'captions'],
  ['skill', 'reels', 'reels'],
  ['skill', 'reels-pipeline', 'reels'],
  ['skill', 'hashtags', 'hashtags'],
  ['skill', 'plan', 'plan'],
  ['skill', 'trends', 'trends'],
  ['skill', 'improve', 'improve'],
  ['skill', 'profile-ideas', 'ideas'],
  ['skill', 'agendar', 'schedule'],
  ['agent', 'storyads', 'text'],
];
for (const [kind, id, expected] of kinds) {
  checkTrue(`${kind}:${id} → ${expected}`, previewKindFromRoute(kind, id) === expected);
}
checkTrue('toda kind tem rótulo TESTE', Object.keys(PREVIEW_LABEL).length === 10);

console.log('\n─── extractHashtags ───');
const tags = extractHashtags('Amplas\n#doce #brigadeiro\nNicho\n#BrigadeiroGourmet #doce');
checkTrue('acha hashtags', tags.includes('#brigadeiro') && tags.includes('#BrigadeiroGourmet'));
checkTrue('deduplica case-insensitive', tags.filter((t) => t.toLowerCase() === '#doce').length === 1);

console.log('\n─── extractNumberedItems ───');
const caps = extractNumberedItems(
  `3 legendas:\n\n1. Caixa aberta.\nChama no direct.\n#a\n\n2. Não divide.\n#b\n\n3. Encomenda hoje.\n#c`
);
checkTrue('3 legendas', caps.length === 3);
checkTrue('primeira sem o número', caps[0].startsWith('Caixa aberta'));

console.log('\n─── extractPlanDays ───');
const days = extractPlanDays(
  `Segunda — Reels\nTema: vitrine\n\nTerça — carrossel\nTema: caixa\n\nQuarta — story\nTema: bastidor`
);
checkTrue('3 dias', days.length === 3);
checkTrue('segunda no título', /segunda/i.test(days[0].day));

console.log('\n─── extractImprove ───');
const improved = extractImprove(
  `Diagnóstico:\n- gancho fraco\n- CTA escondido\n\nVersão reescrita:\nEssa caixa some hoje.\nChama no direct.\n\nO que mudei e por quê:\n- gancho na 1ª linha`
);
checkTrue('diagnóstico', improved.diagnosis.includes('gancho fraco'));
checkTrue('reescrita', improved.rewrite.includes('Essa caixa some hoje'));
checkTrue('mudanças', improved.changes.includes('gancho na 1ª linha'));

console.log('\n─── extractIdeaCards ───');
const ideas = extractIdeaCards(
  `[Vitrine de sábado] · FORMATO: Reel\nGancho: olha isso\n\n[Caixa fechada] · FORMATO: Feed\nGancho: não divide`
);
checkTrue('2 ideias pelo colchete', ideas.length === 2);
checkTrue('título da primeira', ideas[0].title.includes('Vitrine'));

console.log('\n─── extractVideoLinks ───');
const vids = extractVideoLinks(
  `Link: https://www.instagram.com/reel/ABC123/\nArtigo: https://blog.example.com/x\nTikTok: https://www.tiktok.com/@u/video/1`
);
checkTrue('só links de vídeo', vids.length === 2);
checkTrue('ignora blog', !vids.some((v) => v.url.includes('blog.example')));

console.log('\n─── buildSkillPreview ───');
const post = buildSkillPreview({
  routeKind: 'skill',
  skillId: 'post',
  content: 'Uma caixa dessas não se divide.\n\n#BrigadeiroGourmet',
});
checkTrue('post é feed', post.kind === 'feed');
checkTrue('post tem legenda', post.feedCaption.includes('não se divide'));
checkTrue('rótulo do post', post.label === 'Post Instagram');

const hash = buildSkillPreview({
  routeKind: 'skill',
  skillId: 'hashtags',
  content: 'Amplas: #doce\nNicho: #brigadeiroGourmet',
});
checkTrue('hashtags kind', hash.kind === 'hashtags' && hash.hashtags.length >= 2);

const plan = buildSkillPreview({
  routeKind: 'skill',
  skillId: 'plan',
  content: 'Segunda — Reels\nTerça — carrossel\nQuarta — story\nQuinta — Reels\nSexta — feed\nSábado — story\nDomingo — Reels',
});
checkTrue('plano tem 7 dias', plan.days.length === 7);

const allSkills = [
  'post',
  'caption',
  'reels',
  'reels-pipeline',
  'hashtags',
  'plan',
  'trends',
  'improve',
  'profile-ideas',
  'agendar',
];
checkTrue(
  'toda skill nativa tem TESTE (kind ≠ vazio)',
  allSkills.every((id) => Boolean(previewKindFromRoute('skill', id)))
);

console.log(`\n═══ RESULTADO: ${pass} passou / ${fail} falhou ═══`);
if (fail > 0) process.exit(1);
