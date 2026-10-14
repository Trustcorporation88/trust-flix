/**
 * Regras de publicação do Instagram — validação antes de mandar ao Postiz.
 * Rodar: npx tsx scripts/test-instagram-rules.ts
 */
import {
  extractHashtags,
  extractMentions,
  hasBlockingIssues,
  moveHashtagsToComment,
  parseCollaborators,
  quickSlots,
  ratioLabel,
  suggestFormat,
  validateIgDraft,
} from '../src/lib/instagramRules';

let pass = 0;
let fail = 0;

function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`, detail ?? '');
  }
}

const img = (w: number, h: number) => ({ kind: 'image' as const, width: w, height: h, bytes: 500_000 });
const vid = (w: number, h: number) => ({ kind: 'video' as const, width: w, height: h });

console.log('─── hashtags / menções ───');
check('acentos em hashtag', extractHashtags('Bolo #docesCaseiros #confeitaria e #pão').join(' ') === '#docesCaseiros #confeitaria #pão');
check('não pega âncora de URL nem &#', extractHashtags('site.com/a#b &#123; x#y').length === 0, extractHashtags('site.com/a#b &#123; x#y'));
check('menções', extractMentions('Com @fulano e @ciclana.doces! email a@b.com').join(' ') === '@fulano @ciclana.doces');

console.log('─── colaboradores ───');
check('normaliza e deduplica', parseCollaborators('@Fulano, ciclana ; @fulano  inválido!').join(',') === 'fulano,ciclana');

console.log('─── mover hashtags ───');
{
  const r = moveHashtagsToComment('Bolo de pote 🍰\nPeça já! #bolo #doces\n\n#confeitaria', '#bolo');
  check('legenda sem hashtags', !r.caption.includes('#'), r.caption);
  check('legenda preserva texto', r.caption.startsWith('Bolo de pote 🍰\nPeça já!'), r.caption);
  check('sem duplicar no comentário', r.firstComment === '#bolo\n#doces #confeitaria', r.firstComment);
}

console.log('─── proporção ───');
check('4:5', ratioLabel(1080, 1350) === '4:5');
check('9:16', ratioLabel(1080, 1920) === '9:16');

console.log('─── formato sugerido ───');
check('1 vídeo → reel', suggestFormat([vid(1080, 1920)]) === 'reel');
check('fotos → feed', suggestFormat([img(1080, 1080), img(1080, 1080)]) === 'feed');

console.log('─── validação ───');
{
  const ok = validateIgDraft({ format: 'feed', caption: 'Oi #a', media: [img(1080, 1350)] });
  check('feed 4:5 sem erros', !hasBlockingIssues(ok), ok);

  const noMedia = validateIgDraft({ format: 'feed', caption: 'oi', media: [] });
  check('sem mídia bloqueia', hasBlockingIssues(noMedia));

  const tall = validateIgDraft({ format: 'feed', caption: 'oi', media: [img(1080, 1920)] });
  check('9:16 no feed bloqueia (pede ajuste)', tall.some((i) => i.level === 'error' && i.message.includes('Ajustar')), tall);

  const tallStory = validateIgDraft({ format: 'story', caption: '', media: [img(1080, 1920)] });
  check('9:16 em story ok', !hasBlockingIssues(tallStory), tallStory);

  const longCap = validateIgDraft({ format: 'feed', caption: 'x'.repeat(2201), media: [img(1080, 1080)] });
  check('legenda > 2200 bloqueia', hasBlockingIssues(longCap));

  const tags = Array.from({ length: 20 }, (_, i) => `#t${i}`).join(' ');
  const tooMany = validateIgDraft({ format: 'feed', caption: tags, firstComment: tags, media: [img(1080, 1080)] });
  check('> 30 hashtags (legenda + comentário) bloqueia', hasBlockingIssues(tooMany));

  const carousel = validateIgDraft({ format: 'feed', caption: 'oi', media: Array.from({ length: 11 }, () => img(1080, 1080)) });
  check('carrossel > 10 bloqueia', hasBlockingIssues(carousel));

  const reelPhoto = validateIgDraft({ format: 'reel', caption: 'oi', media: [img(1080, 1920)] });
  check('reel com foto bloqueia', hasBlockingIssues(reelPhoto));

  const reelWide = validateIgDraft({ format: 'reel', caption: 'oi', media: [vid(1920, 1080)] });
  check('reel horizontal só avisa', !hasBlockingIssues(reelWide) && reelWide.length > 0, reelWide);

  const storyMulti = validateIgDraft({ format: 'story', caption: '', media: [img(1080, 1920), img(1080, 1920)] });
  check('story com 2 mídias bloqueia', hasBlockingIssues(storyMulti));

  const collab = validateIgDraft({ format: 'feed', caption: 'oi', collaborators: ['a', 'b', 'c', 'd'], media: [img(1080, 1080)] });
  check('> 3 colaboradores bloqueia', hasBlockingIssues(collab));

  const linkMedia = validateIgDraft({ format: 'feed', caption: 'oi', media: [{ kind: 'image' }] });
  check('mídia por link (sem dimensões) não bloqueia', !hasBlockingIssues(linkMedia), linkMedia);
}

console.log('─── horários rápidos ───');
{
  const morning = new Date(2026, 9, 14, 8, 0);
  const s = quickSlots(morning);
  check('manhã → começa em Hoje 12h', s[0]?.label === 'Hoje 12h', s);
  const late = new Date(2026, 9, 14, 21, 0);
  const l = quickSlots(late);
  check('noite → só amanhã', l.every((x) => x.label.startsWith('Amanhã')), l);
  check('máximo 4 atalhos', s.length <= 4);
}

console.log(`\n${pass} ok · ${fail} falhas`);
if (fail > 0) process.exit(1);
