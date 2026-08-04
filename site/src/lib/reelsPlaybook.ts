/**
 * 🎬 Reels Playbook — formatos de Reels/TikTok com histórico comprovado de performance.
 *
 * Esta base alimenta o Copilot quando o usuário pede "ideias de Reels que fizeram sucesso".
 * São formatos estruturais (não cópias de vídeos específicos), o que os torna reutilizáveis
 * em qualquer nicho e evita depender de scraping de plataforma.
 *
 * Cada formato traz: gancho, estrutura beat-a-beat, por que funciona e faixa de duração.
 */

export type ReelsGoal = 'alcance' | 'engajamento' | 'autoridade' | 'venda' | 'seguidores';

export interface ReelsFormat {
  id: string;
  name: string;
  emoji: string;
  goal: ReelsGoal[];
  duration: string;
  hook: string;
  structure: string[];
  whyItWorks: string;
  /** Nível de esforço de produção: 1 = celular sem edição, 3 = requer edição/roteiro */
  effort: 1 | 2 | 3;
}

export const REELS_FORMATS: ReelsFormat[] = [
  {
    id: 'erro-comum',
    name: 'O erro que todo mundo comete',
    emoji: '🚫',
    goal: ['alcance', 'autoridade'],
    duration: '15–30s',
    hook: 'Pare de [ação comum] — isso está te custando [perda concreta].',
    structure: [
      'Gancho: nomeie o erro nos primeiros 2 segundos',
      'Agite: mostre o custo real do erro (número, tempo ou dinheiro)',
      'Corrija: entregue o jeito certo em 1 frase',
      'Prove: exemplo rápido ou antes/depois',
      'CTA: "salva esse pra não esquecer"',
    ],
    whyItWorks:
      'Ativa reação de defesa ("eu faço isso?") e gera salvamento — o salvamento é o sinal que mais empurra alcance no Reels.',
    effort: 1,
  },
  {
    id: 'antes-depois',
    name: 'Antes e depois (transformação)',
    emoji: '🔄',
    goal: ['alcance', 'venda'],
    duration: '10–20s',
    hook: 'De [estado ruim] para [estado bom] em [prazo].',
    structure: [
      'Frame 1: o "antes" cru, sem filtro',
      'Corte seco na batida da música',
      'Frame 2: o "depois" com o resultado',
      'Texto na tela com o prazo real',
      'CTA: "quer o passo a passo? comenta PLANO"',
    ],
    whyItWorks:
      'Transformação visual é o formato de maior retenção porque o cérebro completa a narrativa sozinho. Funciona sem falar nada.',
    effort: 1,
  },
  {
    id: 'lista-rapida',
    name: 'Lista rápida (X coisas em Y segundos)',
    emoji: '📋',
    goal: ['alcance', 'seguidores'],
    duration: '20–40s',
    hook: '[N] [coisas] que eu queria saber antes de [situação].',
    structure: [
      'Gancho com número específico (3, 5, 7 — ímpares performam melhor)',
      'Um item por corte, texto grande na tela',
      'Ritmo acelerado: máximo 4s por item',
      'Item final é o mais forte (guarde o melhor pro fim)',
      'CTA: "segue pra parte 2"',
    ],
    whyItWorks:
      'Promessa numérica cria contrato de tempo com o espectador. Guardar o melhor pro fim aumenta a taxa de visualização completa.',
    effort: 2,
  },
  {
    id: 'pov',
    name: 'POV / cena do dia a dia',
    emoji: '🎭',
    goal: ['engajamento', 'seguidores'],
    duration: '10–25s',
    hook: 'POV: você [situação específica e reconhecível do nicho].',
    structure: [
      'Texto POV na tela desde o frame 1',
      'Encene a situação (pode ser só expressão facial)',
      'Vire a expectativa no meio',
      'Deixe o final aberto pra comentário',
      'Sem CTA explícito — o comentário vem natural',
    ],
    whyItWorks:
      'Identificação gera comentário do tipo "sou eu" e compartilhamento em DM, que é o sinal de maior peso do algoritmo.',
    effort: 1,
  },
  {
    id: 'bastidor',
    name: 'Bastidor / como é feito',
    emoji: '🎥',
    goal: ['autoridade', 'engajamento'],
    duration: '20–45s',
    hook: 'Como eu realmente faço [processo] — sem filtro.',
    structure: [
      'Gancho de curiosidade sobre o processo',
      'Mostre o processo em timelapse',
      'Revele um detalhe que ninguém mostra',
      'Comente o erro que você já cometeu ali',
      'CTA: "pergunta o que quiser sobre isso"',
    ],
    whyItWorks:
      'Transparência constrói confiança rápido e o detalhe inesperado é o que gera compartilhamento entre pares do mesmo nicho.',
    effort: 2,
  },
  {
    id: 'mito-verdade',
    name: 'Mito x Verdade',
    emoji: '⚖️',
    goal: ['autoridade', 'alcance'],
    duration: '15–30s',
    hook: '"[Crença popular do nicho]" — isso é mentira. Deixa eu explicar.',
    structure: [
      'Enuncie o mito como se concordasse',
      'Quebre com dado ou experiência concreta',
      'Explique o porquê em linguagem simples',
      'Dê o que fazer no lugar',
      'CTA: "concorda? comenta aí"',
    ],
    whyItWorks:
      'Contrariar consenso gera comentário polarizado — discussão nos comentários mantém o vídeo em distribuição por mais tempo.',
    effort: 1,
  },
  {
    id: 'tutorial-15s',
    name: 'Tutorial de 15 segundos',
    emoji: '⚡',
    goal: ['alcance', 'seguidores'],
    duration: '15–30s',
    hook: 'Como fazer [resultado desejado] em [tempo curto].',
    structure: [
      'Mostre o resultado final primeiro (spoiler)',
      'Volte e ensine em 3 passos, 1 corte por passo',
      'Texto na tela numerando os passos',
      'Repita o resultado final',
      'CTA: "salva pra fazer depois"',
    ],
    whyItWorks:
      'Mostrar o resultado antes do processo é o que segura o espectador — ele fica pra saber como chegou lá. Alto índice de salvamento.',
    effort: 2,
  },
  {
    id: 'resposta-comentario',
    name: 'Resposta a comentário',
    emoji: '💬',
    goal: ['engajamento', 'autoridade'],
    duration: '20–40s',
    hook: 'Me perguntaram: "[pergunta real do seu público]".',
    structure: [
      'Print do comentário na tela',
      'Responda direto, sem enrolação',
      'Aprofunde com um exemplo seu',
      'Convide mais perguntas',
      'CTA: "manda sua dúvida nos comentários"',
    ],
    whyItWorks:
      'Conteúdo pautado pelo público já nasce validado. Além disso alimenta um ciclo: mais comentários geram mais vídeos.',
    effort: 1,
  },
  {
    id: 'comparacao',
    name: 'Isso vs Aquilo',
    emoji: '🆚',
    goal: ['alcance', 'venda'],
    duration: '15–30s',
    hook: '[Opção A] ou [Opção B]? A resposta depende de uma coisa.',
    structure: [
      'Apresente as duas opções lado a lado',
      'Dê o critério real de decisão',
      'Mostre quando cada uma ganha',
      'Tome partido no final',
      'CTA: "qual você usa? comenta"',
    ],
    whyItWorks:
      'Formato de decisão faz o espectador se posicionar mentalmente — e quem se posiciona tende a comentar.',
    effort: 1,
  },
  {
    id: 'numero-choque',
    name: 'Número de choque',
    emoji: '📊',
    goal: ['alcance', 'autoridade'],
    duration: '15–25s',
    hook: '[Número surpreendente] — e quase ninguém fala sobre isso.',
    structure: [
      'Solte o número nos primeiros 2s',
      'Contextualize por que é surpreendente',
      'Explique a causa',
      'Diga o que fazer com essa informação',
      'CTA: "compartilha com quem precisa ver"',
    ],
    whyItWorks:
      'Dado concreto tem alta credibilidade e é fácil de compartilhar — o número vira a "moeda" que a pessoa leva pra conversa.',
    effort: 1,
  },
];

/** Ganchos prontos de alta retenção, agrupados por mecanismo psicológico. */
export const HOOK_LIBRARY: Record<string, string[]> = {
  Curiosidade: [
    'Ninguém te contou isso sobre [tema]...',
    'Existe um detalhe em [tema] que muda tudo.',
    'Eu testei [ação] por [período]. O resultado me surpreendeu.',
  ],
  Urgência: [
    'Se você faz [ação], para agora.',
    'Você tem [prazo] pra corrigir isso.',
    'Isso vai custar caro se você ignorar.',
  ],
  Identificação: [
    'Se você é [perfil], isso é pra você.',
    'POV: você [situação do nicho].',
    'Só quem [experiência específica] vai entender.',
  ],
  Autoridade: [
    'Depois de [X anos/casos] em [nicho], aprendi que...',
    'O que [número] de [clientes/testes] me ensinaram sobre [tema].',
    'Errei isso [N] vezes pra descobrir o jeito certo.',
  ],
  Contraste: [
    '[Crença comum] está errado. Aqui está o porquê.',
    'Todo mundo faz [X]. Eu faço [Y] — e funciona melhor.',
    'Pare de [ação popular]. Comece a [alternativa].',
  ],
};

/** Formata o playbook como contexto compacto para o prompt do Copilot. */
export function buildReelsContext(goal?: ReelsGoal): string {
  const formats = goal ? REELS_FORMATS.filter((f) => f.goal.includes(goal)) : REELS_FORMATS;
  const list = (formats.length ? formats : REELS_FORMATS)
    .map(
      (f) =>
        `- ${f.name} (${f.duration}, esforço ${f.effort}/3): gancho "${f.hook}" | estrutura: ${f.structure.join(' → ')} | funciona porque ${f.whyItWorks}`
    )
    .join('\n');

  const hooks = Object.entries(HOOK_LIBRARY)
    .map(([k, v]) => `${k}: ${v.join(' / ')}`)
    .join('\n');

  return `FORMATOS DE REELS COM PERFORMANCE COMPROVADA:\n${list}\n\nBIBLIOTECA DE GANCHOS:\n${hooks}`;
}

export function getFormatById(id: string): ReelsFormat | undefined {
  return REELS_FORMATS.find((f) => f.id === id);
}
