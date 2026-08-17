/**
 * Fotos múltiplas no Copilot — collectVisionImages / prompts.
 * Isolado de axios/Postiz para rodar sem node_modules completo.
 */
import {
  MAX_COPILOT_IMAGES,
  collectVisionImages,
  defaultPostPrompt,
  describeImagesMetadata,
  visionCanSeeHint,
} from '../src/lib/copilotImages';
import { COPILOT_SKILLS, SKILL_SCOPE, skillScopeLock } from '../src/lib/copilotRouter';
import { extractCaption } from '../src/lib/textClean';

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

const one = { dataUrl: 'data:image/jpeg;base64,aaa', name: 'a.jpg', width: 1080, height: 1350 };
const two = { dataUrl: 'data:image/jpeg;base64,bbb', name: 'b.jpg', width: 1080, height: 1080 };

console.log('─── collectVisionImages ───');
checkTrue('images[] vence o alias image', collectVisionImages({ image: one, images: [one, two] }).length === 2);
checkTrue('image legado ainda funciona', collectVisionImages({ image: one }).length === 1);
checkTrue('sem foto retorna vazio', collectVisionImages({}).length === 0);
checkTrue(
  `teto de ${MAX_COPILOT_IMAGES} fotos`,
  collectVisionImages({
    images: Array.from({ length: 12 }, (_, i) => ({ dataUrl: `data:image/jpeg;base64,${i}` })),
  }).length === MAX_COPILOT_IMAGES
);
checkTrue('ignora item sem dataUrl', collectVisionImages({ images: [{ dataUrl: '' }, one] }).length === 1);

console.log('\n─── prompts ───');
checkTrue('prompt singular', defaultPostPrompt(1).includes('esta foto'));
checkTrue(
  'prompt carrossel cita a quantidade',
  defaultPostPrompt(3).includes('3 fotos') && defaultPostPrompt(3).includes('carrossel')
);
checkTrue(
  'metadados numeram as fotos',
  describeImagesMetadata([one, two]).includes('foto 1') &&
    describeImagesMetadata([one, two]).includes('foto 2')
);
checkTrue('hint de visão cita carrossel com 3 fotos', visionCanSeeHint(3).includes('carrossel'));
checkTrue('hint de 1 foto nao fala carrossel', !visionCanSeeHint(1).includes('carrossel'));
checkTrue(
  'prompt padrao e so Instagram',
  defaultPostPrompt(3).includes('Instagram') &&
    defaultPostPrompt(3).includes('sem TikTok') &&
    defaultPostPrompt(3).includes('sem Reels')
);
checkTrue('hint de visao veta titulo de TikTok', visionCanSeeHint(2).includes('nem título de TikTok'));

console.log('\n─── Skill post e so Instagram ───');
const postSkill = COPILOT_SKILLS.find((s) => s.id === 'post');
checkTrue('skill post existe', Boolean(postSkill));
checkTrue(
  'prompt proibe TikTok/Reels/video',
  Boolean(postSkill?.systemPrompt.includes('PROIBIDO')) &&
    Boolean(postSkill?.systemPrompt.includes('TikTok')) &&
    Boolean(postSkill?.systemPrompt.includes('Reels'))
);
checkTrue(
  'prompt nao pede secao Titulo TikTok',
  !Boolean(postSkill?.systemPrompt.includes('**Título TikTok:**'))
);
const capNovo = extractCaption(
  `Uma caixa dessas não se divide.\n\nChama no direct.\n\n#BrigadeiroGourmet`
);
checkTrue('legenda sem secoes passa inteira', capNovo.includes('não se divide'));
checkTrue('hashtags ficam na legenda', capNovo.includes('#BrigadeiroGourmet'));
checkTrue('escopo do post veta TikTok', skillScopeLock('post').includes('TikTok'));
checkTrue('escopo de hashtags veta legenda', skillScopeLock('hashtags').includes('legenda'));
checkTrue('escopo de reels veta post de feed', skillScopeLock('reels').includes('post de feed'));
checkTrue(
  'toda skill de conteudo tem escopo',
  ['post', 'caption', 'reels', 'trends', 'hashtags', 'plan', 'improve'].every((id) =>
    Boolean(SKILL_SCOPE[id])
  )
);

console.log(`\n═══ RESULTADO: ${pass} passou / ${fail} falhou ═══`);
if (fail > 0) process.exit(1);
