/**
 * Pipeline "Reels + Post pronto"
 *
 * Usa agentes do Arsenal que hoje ficam ociosos no Copilot:
 *   1. Busca de referências (web search, quando disponível)
 *   2. STORYADS      → molde / cortes / gancho
 *   3. DISSECAÇÃO    → persona, dor, linguagem
 *   4. doug.tensão + UGLY COPY → roteiro, legenda, CTA, DM
 *
 * Cada etapa é uma chamada curta e barata. A saída final é um pacote
 * pronto para gravar e publicar — não uma aula.
 */

import { getAgentById } from '@/services/arsenalService';
import { buildReelsContext } from '@/lib/reelsPlaybook';
import { getAgentSystemPrompt } from '@/lib/copilotRouter';

export const REELS_PIPELINE_ID = 'reels-pipeline';

export const REELS_PIPELINE_AGENTS = [
  { id: 'storyads', name: 'STORYADS', emoji: '🎬' },
  { id: 'dissecacao', name: 'DISSECAÇÃO NEURAL', emoji: '🎯' },
  { id: 'doug-tensao', name: 'doug.tensão', emoji: '⏰' },
  { id: 'ugly-copy', name: 'UGLY COPY', emoji: '💬' },
] as const;

export type PipelineStepId = 'hunt' | 'storyads' | 'dissecacao' | 'closer';

export interface PipelineStepMeta {
  id: PipelineStepId;
  label: string;
  agentIds: string[];
}

export const PIPELINE_STEPS: PipelineStepMeta[] = [
  { id: 'hunt', label: 'Caçando referências', agentIds: [] },
  { id: 'storyads', label: 'STORYADS montando formato', agentIds: ['storyads'] },
  { id: 'dissecacao', label: 'Dissecação adaptando ao público', agentIds: ['dissecacao'] },
  {
    id: 'closer',
    label: 'doug.tensão + Ugly Copy fechando o post',
    agentIds: ['doug-tensao', 'ugly-copy'],
  },
];

export interface PipelineRunInput {
  userMessage: string;
  nicho?: string;
  cidade?: string;
  /** Texto cru da busca web (se houve). */
  huntText?: string;
  /** Links de vídeo encontrados na busca. */
  videoLinks?: { url: string; title: string }[];
  /** Hashtags em alta (TrendsMCP), se houver. */
  trendingHashtags?: string[];
  webSearchUsed: boolean;
}

function agentVoice(agentId: string): string {
  const agent = getAgentById(agentId);
  if (!agent) return '';
  return getAgentSystemPrompt(agent);
}

function contextBlock(input: PipelineRunInput): string {
  const lines: string[] = [];
  lines.push(`PEDIDO DO USUÁRIO: ${input.userMessage}`);
  if (input.nicho) lines.push(`NICHO: ${input.nicho}`);
  if (input.cidade) lines.push(`CIDADE/REGIÃO: ${input.cidade}`);
  if (input.trendingHashtags?.length) {
    lines.push(
      `HASHTAGS EM ALTA: ${input.trendingHashtags
        .slice(0, 8)
        .map((h) => (h.startsWith('#') ? h : `#${h}`))
        .join(' ')}`
    );
  }
  if (input.videoLinks?.length) {
    lines.push('VÍDEOS ENCONTRADOS NA BUSCA (use estes links, não invente outros):');
    for (const v of input.videoLinks.slice(0, 4)) {
      lines.push(`- ${v.title}: ${v.url}`);
    }
  } else if (input.webSearchUsed) {
    lines.push(
      'BUSCA NA WEB: rodou, mas não trouxe link direto de vídeo. Use formatos comprovados e diga isso com honestidade.'
    );
  } else {
    lines.push(
      'SEM BUSCA NA WEB nesta execução. Use apenas formatos comprovados do playbook — não invente tendência do momento nem URL.'
    );
  }
  if (input.huntText?.trim()) {
    const clipped =
      input.huntText.length > 1800 ? `${input.huntText.slice(0, 1800)}…` : input.huntText;
    lines.push(`NOTAS DA BUSCA:\n${clipped}`);
  }
  return lines.join('\n');
}

/** Etapa 1 — STORYADS: molde visual e de cortes. */
export function buildStoryAdsPrompt(input: PipelineRunInput): string {
  return `${agentVoice('storyads')}

Você está na etapa STORYADS do pipeline "Reels + Post pronto" do SocialFlow.
Sua ÚNICA entrega é o MOLDE do vídeo — gancho + cortes + o que aparece na tela.
Não escreva legenda longa, não faça análise de persona, não invente URL.

${contextBlock(input)}

--- PLAYBOOK DE FORMATOS ---
${buildReelsContext()}

REGRAS:
- Escolha 2 formatos (máx 3 se a busca trouxe links fortes).
- Se houver links de vídeo acima, amarre cada formato a um link real.
- NUNCA invente URL. Sem link = diga "sem link direto".
- Seja concreto e filmável. Zero teoria.

FORMATO DA RESPOSTA (exato):

FORMATO 1: [nome curto]
Link: [url ou "sem link direto"]
Gancho (0-3s): [frase ou imagem de abertura]
Cortes:
- 0-3s: ...
- 3-8s: ...
- 8s-final: ...
Por que gruda: [1 frase]
Ângulo pro nicho: [1 frase]

FORMATO 2: ...
(mesmo bloco)

Melhor pra gravar agora: [FORMATO N] — [motivo em 1 linha]`;
}

/** Etapa 2 — DISSECAÇÃO: persona e linguagem. */
export function buildDissecacaoPrompt(
  input: PipelineRunInput,
  storyAdsOutput: string
): string {
  return `${agentVoice('dissecacao')}

Você está na etapa DISSECAÇÃO NEURAL do pipeline "Reels + Post pronto".
Sua ÚNICA entrega é o mapa do cliente ideal para os formatos abaixo.
Não reescreva o roteiro completo. Não invente dados demográficos sem base.

${contextBlock(input)}

--- SAÍDA DO STORYADS ---
${storyAdsOutput}

FORMATO DA RESPOSTA (exato):

Cliente ideal: [quem é, em 1 linha]
Dor principal: [frase na linguagem dele]
Desejo secreto: [o que ele quer parecer / conquistar]
Objeção #1: [o que trava a ação]
Frase que ele usaria: "[citação crua, coloquial]"
Palavras que funcionam: [5-8 termos do universo dele]
Palavras proibidas: [3-5 termos de marketeiro que soam falsos]
Gatilho emocional: [1 emoção dominante pra o gancho]
Como o FORMATOS do StoryAds falam com essa dor: [2-4 linhas, prático]`;
}

/** Etapa 3 — doug.tensão + Ugly Copy: pacote final. */
export function buildCloserPrompt(
  input: PipelineRunInput,
  storyAdsOutput: string,
  dissecacaoOutput: string
): string {
  return `${agentVoice('doug-tensao')}

${agentVoice('ugly-copy')}

Você está na etapa FINAL do pipeline "Reels + Post pronto".
Combine doug.tensão (urgência, retenção, tensão) + Ugly Copy (DM/WhatsApp cru).
Entregue o PACOTE PRONTO PARA GRAVAR E PUBLICAR. Nada de preâmbulo.

${contextBlock(input)}

--- STORYADS ---
${storyAdsOutput}

--- DISSECAÇÃO ---
${dissecacaoOutput}

REGRAS:
- 1 vídeo principal (o "Melhor pra gravar agora" do StoryAds). Opcional: 1 variação curta.
- Texto publicável SEM markdown (sem ** * #). Instagram não renderiza.
- Se houver Link real no StoryAds, repita ele. Não invente URL.
- CTA de DM tem que parecer mensagem de gente, não de funil.

FORMATO DA RESPOSTA (exato):

🎬 GRAVE ESTE
Formato: [nome]
Link referência: [url ou "sem link direto — use o molde"]
Gancho na tela (0-3s): ...
Roteiro falado:
- 0-3s: ...
- 3-8s: ...
- final: ...
Texto na tela: [3-6 frases curtas, uma por corte]

✍️ LEGENDA (copiar e colar)
[legenda pronta, com CTA no fim]

💬 DM / WHATSAPP (Ugly Copy)
[2-4 linhas cruas pra mandar ou pedir que o lead mande]

⏰ TENSÃO
[1 linha de urgência/escassez realista — sem mentira de "últimas vagas" se não for verdade]

✅ CHECKLIST ANTES DE PUBLICAR
- [ ] gancho nos 3s
- [ ] 1 ideia só
- [ ] CTA claro
- [ ] legenda colada

Se quiser, no fim: "Variação B (30s a menos):" com 4 linhas.`;
}

/**
 * Monta o pacote final mostrado ao usuário, com selos dos agentes.
 * `huntPreface` é opcional (ex.: aviso de rate limit ou "sem web").
 */
export function assemblePipelineReply(opts: {
  huntPreface?: string;
  storyAds: string;
  dissecacao: string;
  closer: string;
  videoLinks?: { url: string; title: string }[];
  agentsUsed?: string[];
}): string {
  const agents =
    opts.agentsUsed?.join(' → ') ||
    REELS_PIPELINE_AGENTS.map((a) => `${a.emoji} ${a.name}`).join(' → ');

  const parts: string[] = [];
  parts.push(`Pipeline: ${agents}`);
  parts.push('');

  if (opts.huntPreface?.trim()) {
    parts.push(opts.huntPreface.trim());
    parts.push('');
  }

  if (opts.videoLinks?.length) {
    parts.push('🔗 REELS PARA ABRIR E COPIAR');
    for (const v of opts.videoLinks.slice(0, 4)) {
      parts.push(`• ${v.title}`);
      parts.push(`  ${v.url}`);
    }
    parts.push('');
  }

  parts.push('——— PACOTE PRONTO ———');
  parts.push(opts.closer.trim());
  parts.push('');
  parts.push('——— BASTIDORES (agentes) ———');
  parts.push('');
  parts.push('🎬 STORYADS');
  parts.push(opts.storyAds.trim());
  parts.push('');
  parts.push('🎯 DISSECAÇÃO NEURAL');
  parts.push(opts.dissecacao.trim());

  return parts.join('\n');
}

/** Prompt da etapa de caça (web search), curto de propósito. */
export function buildHuntPrompt(input: {
  userMessage: string;
  nicho?: string;
  cidade?: string;
}): string {
  const nicho = input.nicho || 'o nicho do usuário';
  const cidade = input.cidade ? ` na região de ${input.cidade}` : '';
  return `Você é o caçador de referências do SocialFlow.
TAREFA: achar VÍDEOS reais (Reels/TikTok/Shorts) sobre ${nicho}${cidade} para o pedido: "${input.userMessage}".

Regras:
- Prefira links diretos: instagram.com/reel/..., tiktok.com/@user/video/..., youtube.com/shorts/...
- NÃO invente URL. Se não achou, diga quantos achou.
- Máximo 3 itens.
- Por item: Link + criador + gancho em 1 linha + cortes (0-3s / 3-8s / final).
- Sem preâmbulo, sem aula.`;
}
