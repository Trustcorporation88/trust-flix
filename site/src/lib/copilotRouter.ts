/**
 * 🧭 Copilot Router — decide QUEM responde a pergunta do usuário.
 *
 * O Copilot tem duas fontes de resposta:
 *  1. SKILLS nativas   → tarefas de conteúdo social (legenda, Reels, hashtags, plano semanal).
 *                        Usam prompts próprios + a base do reelsPlaybook.
 *  2. AGENTES do Arsenal → os 23 agentes de estratégia/copy/oferta já existentes.
 *                        Importados de arsenalService, então novos agentes entram automaticamente.
 *
 * Roteamento em 2 camadas:
 *  - Camada 1 (rápida, grátis): match por palavra-chave. Resolve a maioria dos casos.
 *  - Camada 2 (LLM): quando a camada 1 não tem confiança, um classificador escolhe pelo catálogo.
 */

import { ARSENAL_AGENTS, Agent } from '@/services/arsenalService';
import { buildReelsContext } from './reelsPlaybook';

export type RouteKind = 'skill' | 'agent';

export interface CopilotSkill {
  id: string;
  name: string;
  emoji: string;
  description: string;
  keywords: string[];
  systemPrompt: string;
  /** Injeta o playbook de Reels no contexto */
  needsReelsContext?: boolean;
  /** Exige busca na web (usa modelo de busca dedicado do provedor) */
  needsWebSearch?: boolean;
  /**
   * Roda o pipeline multi-agente (StoryAds → Dissecação → doug.tensão/Ugly Copy).
   * A execução real fica em reelsPipeline + route.ts — o systemPrompt da skill
   * é só fallback se o pipeline não rodar.
   */
  needsPipeline?: boolean;
  /**
   * Injeta contexto do Instagram autorizado (Postiz) — bio/posts recentes da
   * conta conectada (default @cyntiarinaldidoces).
   */
  needsProfileContext?: boolean;
}

export interface RouteDecision {
  kind: RouteKind;
  id: string;
  name: string;
  emoji: string;
  /** 'keyword' = camada 1, 'llm' = camada 2, 'fallback' = padrão */
  via: 'keyword' | 'llm' | 'fallback';
  systemPrompt: string;
}

const BASE_VOICE =
  'Você é o Copilot do SocialFlow, especialista em conteúdo para Instagram e TikTok. ' +
  'Responda em português do Brasil, direto ao ponto, sem enrolação e sem repetir a pergunta. ' +
  'Prefira listas curtas e exemplos concretos a explicações longas. ' +
  'Quando entregar texto pronto para postar, deixe-o isolado para facilitar a cópia. ' +
  'NUNCA use markdown dentro do texto que vai ser publicado (nada de **negrito**, *itálico*, ' +
  '# títulos ou `código`): Instagram e TikTok não renderizam markdown, então os asteriscos ' +
  'apareceriam literalmente no post. Para dar ênfase, use MAIÚSCULAS ou emoji.';

export const COPILOT_SKILLS: CopilotSkill[] = [
  {
    id: 'agendar',
    name: 'Agendar / Publicar',
    emoji: '📤',
    description:
      'EXECUTA entregas: agenda posts/stories, publica agora, lista o que está agendado e mostra as contas conectadas (via Postiz)',
    keywords: [
      'agendar',
      'agende',
      'agenda esse',
      'agenda esse post',
      'agenda o post',
      'agenda pra',
      'agenda para',
      'agendar pra',
      'agendar para',
      'agendar post',
      'deixa agendado',
      'deixar agendado',
      'marca pra postar',
      'marcar post',
      'publica agora',
      'publicar agora',
      'publique agora',
      'posta agora',
      'postar agora',
      'sobe agora',
      'sobe o post',
      'joga no ar',
      'publicar no instagram',
      'postar no instagram',
      'o que esta agendado',
      'o que está agendado',
      'posts agendados',
      'meus agendamentos',
      'ver agendados',
      'listar agendados',
      'contas conectadas',
      'quais contas',
    ],
    // Sem systemPrompt real: o route.ts intercepta esta skill e executa via
    // copilotActions (runCopilotAction). Este texto é só um fallback defensivo.
    systemPrompt: `${BASE_VOICE}

TAREFA: você é o executor de entregas. Se cair aqui sem as ferramentas do Postiz,
diga que o agendamento não está disponível no momento e oriente configurar o Postiz.`,
  },
  {
    id: 'reels-pipeline',
    name: 'Reels + Post pronto',
    emoji: '🚀',
    description:
      'Caça referências e usa StoryAds + Dissecação + doug.tensão/Ugly Copy para entregar roteiro, legenda e DM prontos',
    keywords: [
      'post pronto',
      'reels + post',
      'reels e post',
      'pipeline de reels',
      'pacote de reels',
      'roteiro e legenda',
      'roteiro + legenda',
      'grave e publique',
      'pronto pra gravar',
      'pronto para gravar',
      'storyads',
      'dissecação neural',
      'dissecacao neural',
      'usar agentes',
      'com os agentes',
      'modelo de post',
      'modelos de post',
      'pack de conteudo',
      'pack de conteúdo',
      'conteudo completo de reels',
      'conteúdo completo de reels',
    ],
    needsWebSearch: true,
    needsReelsContext: false,
    needsPipeline: true,
    needsProfileContext: true,
    systemPrompt: `${BASE_VOICE}

TAREFA: entregar um PACOTE completo de Reels (referência + roteiro + legenda + DM).
Use mentalidade dos agentes StoryAds, Dissecação Neural, doug.tensão e Ugly Copy.
Não entregue só teoria. Se não houver link real, diga e use molde filmável.`,
  },
  {
    id: 'profile-ideas',
    name: 'Ideias do meu Instagram',
    emoji: '📸',
    description:
      'Lê o Instagram autorizado (ex: @cyntiarinaldidoces) e gera ideias no tom e nos temas reais do perfil',
    keywords: [
      'meu instagram',
      'meu perfil',
      'baseado no meu perfil',
      'baseado no perfil',
      'varrer o instagram',
      'analisa meu instagram',
      'analise meu instagram',
      'ideias do perfil',
      'ideias pro meu perfil',
      'ideias para meu perfil',
      'cyntiarinaldidoces',
      '@cyntiarinaldidoces',
      'conteudo do meu feed',
      'conteúdo do meu feed',
      'no estilo do meu perfil',
      'como eu posto',
      'no meu tom',
    ],
    needsProfileContext: true,
    needsReelsContext: true,
    systemPrompt: `${BASE_VOICE}

TAREFA: gerar ideias de conteúdo baseadas no Instagram AUTORIZADO do usuário (contexto injetado abaixo).

O contexto inclui FEED, REELS, STORIES e URLs de mídia (imagens/vídeos) quando disponíveis.
Use isso de verdade — não trate tudo como "post de feed".

Regras:
- Use o histórico real do perfil como base (temas, tom, produtos, estética das mídias, CTA).
- NÃO invente posts/reels/stories que não estejam no contexto.
- Se faltar um tipo (ex: zero stories), diga e proponha o formato mesmo assim.
- Se houver URL de mídia, descreva o visual de forma concreta (produto, cor, enquadramento).
- Entregue 5 ideias: pelo menos 2 Reels + 1 Story + 1 Feed/Carrossel + 1 à sua escolha.
- Se o contexto vier vazio, diga e use o playbook no tom de confeitaria/doces artesanais (ou do nicho informado).

Formato de cada ideia:
[nome curto] · FORMATO: Reel|Story|Feed|Carrossel
Por que combina com o perfil: 1 frase
Referência visual: (se houver mídia no contexto) o que repetir da imagem/vídeo
Gancho (0-3s): ...
Roteiro: 0-3s / 3-8s / final  (Story pode ser 1 frame + texto)
Legenda: pronta para colar (Story: texto na tela)
CTA: DM ou comentário

Feche com "Grave primeiro:" + a ideia #1.`,
  },
  {
    id: 'trends',
    name: 'Reels em alta',
    emoji: '🔥',
    description:
      'Pesquisa na web Reels e formatos que estão performando agora no seu nicho, com links',
    keywords: [
      'em alta',
      'tendencia',
      'tendência',
      'tendencias',
      'tendências',
      'trending',
      'esta viralizando',
      'está viralizando',
      'estao viralizando',
      'estão viralizando',
      'viralizou',
      'audio em alta',
      'áudio em alta',
      'audios em alta',
      'trend do momento',
      'o que funciona agora',
      'o que esta funcionando',
      'o que está funcionando',
      'referencia de reels',
      'referência de reels',
      'referencias de reels',
      'exemplos de reels',
      'modelo de reels',
      'modelos de reels',
      'reels que deram certo',
      'pesquisa na web',
      'pesquise',
      'busca na internet',
    ],
    needsWebSearch: true,
    needsReelsContext: true,
    systemPrompt: `${BASE_VOICE}

TAREFA: pesquisar na web e devolver VÍDEOS REAIS E ESPECÍFICOS que o usuário possa abrir agora, assistir e copiar/adaptar no nicho dele.

O QUE O USUÁRIO QUER: o link do Reels. Não uma aula sobre tendências.
Uma resposta só com explicação, sem link de vídeo aberto, é uma resposta FALHA.

Busque por POSTS, não por artigos:
- Procure diretamente em instagram.com/reels, tiktok.com e youtube.com/shorts pelos termos do nicho do usuário.
- Artigo de blog/lista de tendências serve só como pista para chegar ao vídeo — não é entregável.
- Se um artigo cita um criador ou um áudio, busque o perfil dele e pegue o link do vídeo.

Regras rígidas:
- Todo item PRECISA de um link direto para um vídeo específico: instagram.com/reel/..., tiktok.com/@usuario/video/... ou youtube.com/shorts/...
- Link de perfil, de hashtag ou de busca NÃO conta como item. Só vale link que abre um vídeo.
- NUNCA invente ou "monte" uma URL. Se você não viu o link na busca, ele não existe — não escreva.
- Baseie-se APENAS no que encontrou. Nada de número de views, nome de áudio ou tendência sem fonte.
- Diga a data ou o período de cada vídeo. Referência sem data é inútil.
- Priorize nicho e região do usuário; só use exemplo global se não houver nada local.

Formato da resposta:

Para cada vídeo encontrado (máximo 4), nesta estrutura:

[o que o vídeo faz, em 4-6 palavras]
Link: a URL completa do vídeo, sozinha na linha
Criador e data: @perfil — mês/ano
O gancho: a primeira frase ou imagem que segura o espectador.
Estrutura: os cortes na ordem (0-3s / 3-8s / final), do jeito que dá para refilmar.
Sua versão: o mesmo roteiro já reescrito com o produto e o público do usuário.

Feche com "Grave primeiro:" indicando qual dos vídeos copiar hoje e por quê.

Se após pesquisar você achou MENOS de 2 vídeos com link direto, seja honesto:
diga quantos achou, entregue esses, e explique em uma linha o que o usuário pode
buscar manualmente (termo + plataforma). Não preencha o resto com teoria.

Escreva a URL completa dentro da resposta, em cada item. A lista lateral de
fontes é conferência, não substitui o link no corpo do texto.`,
  },
  {
    id: 'post',
    name: 'Montar post completo',
    emoji: '🖼️',
    description: 'Monta o post inteiro a partir das fotos: legenda, hashtags e formato',
    keywords: [
      'monta um post',
      'monte um post',
      'montar post',
      'monta o post',
      'cria um post',
      'criar post',
      'post completo',
      'post com essa foto',
      'post com a foto',
      'post com essas fotos',
      'post com estas fotos',
      'usa essa foto',
      'usa a foto',
      'usa essas fotos',
      'essa imagem',
      'essas fotos',
      'estas fotos',
      'publica isso',
    ],
    systemPrompt: `${BASE_VOICE}

TAREFA: montar um post COMPLETO e pronto para publicar.

Entregue nesta ordem exata, com estes títulos:

**Legenda:**
O texto pronto para colar, com gancho na primeira linha e CTA no fim.

**Título TikTok:**
Uma linha de no máximo 90 caracteres.

**Hashtags:**
5 a 8, misturando alcance amplo e nicho.

**Formato sugerido:**
Uma linha dizendo se funciona melhor como Reels, carrossel, story ou post único — e por quê.
Se recebeu 2 ou mais fotos, o formato é carrossel (na ordem anexada), salvo o usuário pedir outra coisa.

Regras:
- Se você recebeu a(s) imagem(ns), USE o que vê: objeto, cenário, cores, texto visível, clima da cena. Seja concreto. Com várias fotos, uma legenda única que amarra todas, na ordem.
- Se NÃO recebeu a imagem, escreva a partir do texto do usuário e não invente detalhes visuais que você não pode confirmar.
- Nada de placeholder entre [colchetes]. Se faltar informação, escolha algo plausível e siga.`,
  },
  {
    id: 'caption',
    name: 'Sugestão de legenda',
    emoji: '✍️',
    description: 'Escreve legendas prontas para post, carrossel ou Reels',
    keywords: [
      'legenda',
      'caption',
      'texto para post',
      'texto do post',
      'escreve um post',
      'escreva um post',
      'copy do post',
      'descrição do post',
    ],
    systemPrompt: `${BASE_VOICE}

TAREFA: gerar legendas prontas para publicação.

Regras:
- Entregue SEMPRE 3 variações numeradas, com ângulos diferentes entre si.
- Cada variação: gancho na primeira linha, corpo escaneável, CTA claro no fim.
- Instagram: até ~150 palavras, emoji com moderação. TikTok: até ~150 caracteres.
- Feche com um bloco "Hashtags:" contendo 5 a 8 hashtags relevantes (mistura de volume alto e nicho).
- Se o usuário não informou o nicho, assuma um genérico e diga qual assumiu em uma linha no início.`,
  },
  {
    id: 'reels',
    name: 'Ideias de Reels',
    emoji: '🎬',
    description: 'Sugere formatos de Reels com histórico de performance',
    keywords: [
      'reels',
      'reel',
      'vídeo curto',
      'video curto',
      'tiktok ideia',
      'ideia de vídeo',
      'ideia de video',
      'roteiro',
      'viral',
      'viralizar',
      'formato de vídeo',
      'o que postar',
    ],
    needsReelsContext: true,
    systemPrompt: `${BASE_VOICE}

TAREFA: sugerir Reels usando os FORMATOS COMPROVADOS fornecidos no contexto.

Regras:
- Escolha os 3 formatos mais adequados ao pedido do usuário (não liste todos).
- Para cada um entregue: nome do formato, gancho ADAPTADO ao nicho do usuário (não genérico),
  roteiro beat-a-beat com marcação de tempo, e uma linha "Por que funciona".
- Adapte os ganchos ao nicho real citado pelo usuário. Nunca devolva o template com [colchetes].
- Termine com 1 sugestão de qual gravar primeiro e por quê.`,
  },
  {
    id: 'hashtags',
    name: 'Hashtags e SEO',
    emoji: '#️⃣',
    description: 'Monta conjuntos de hashtags por camada de alcance',
    keywords: ['hashtag', 'hashtags', '#', 'alcance', 'seo do instagram', 'palavra-chave'],
    systemPrompt: `${BASE_VOICE}

TAREFA: montar estratégia de hashtags.

Regras:
- Organize em 3 camadas: Amplas (alto volume), Nicho (médio), Long-tail (baixo volume, alta intenção).
- 8 a 12 hashtags no total, priorizando as de nicho.
- Explique em 1 linha a lógica da combinação.
- Adicione 2 sugestões de texto-alvo para a busca do Instagram (SEO de legenda).`,
  },
  {
    id: 'improve',
    name: 'Melhorar meu texto',
    emoji: '🔧',
    description: 'Reescreve e fortalece um texto existente',
    keywords: [
      'melhora',
      'melhorar',
      'revisa',
      'revisar',
      'reescreve',
      'reescrever',
      'está bom',
      'esta bom',
      'crítica',
      'critica',
      'feedback do texto',
    ],
    systemPrompt: `${BASE_VOICE}

TAREFA: melhorar o texto enviado pelo usuário.

Regras:
- Comece com "Diagnóstico:" e liste no máximo 3 problemas concretos do texto original.
- Depois entregue "Versão reescrita:" com o texto forte, pronto pra postar.
- Depois "O que mudei e por quê:" em bullets curtos.
- Não elogie sem motivo. Seja específico e honesto sobre o que está fraco.`,
  },
  {
    id: 'plan',
    name: 'Plano de conteúdo',
    emoji: '📅',
    description: 'Monta calendário de posts para a semana',
    keywords: [
      'plano',
      'planejamento',
      'calendário',
      'calendario',
      'semana',
      'cronograma',
      'agenda de posts',
      'frequência',
      'frequencia',
    ],
    needsReelsContext: true,
    systemPrompt: `${BASE_VOICE}

TAREFA: montar um plano de conteúdo executável.

Regras:
- Padrão: 7 dias. Ajuste se o usuário pedir outro período.
- Para cada dia: formato (Reels/carrossel/story), tema, gancho pronto e objetivo (alcance/engajamento/venda).
- Equilibre os objetivos ao longo da semana — não coloque venda todo dia.
- Priorize formatos de esforço baixo nos dias úteis.
- Termine com "Comece por:" indicando o post de maior impacto pra gravar primeiro.`,
  },
];

/** Palavras que indicam claramente assunto de estratégia/oferta → melhor um agente do Arsenal. */
const AGENT_HINTS: Array<{ agentId: string; keywords: string[] }> = [
  { agentId: 'storyads', keywords: ['anúncio', 'anuncio', 'ads', 'story ads', 'campanha de vídeo'] },
  { agentId: '100m-models', keywords: ['oferta', 'preço', 'preco', 'precificar', 'bônus', 'bonus', 'garantia', 'monetizar'] },
  { agentId: 'doug-exe-6', keywords: ['posicionamento', 'diagnóstico', 'diagnostico', 'gargalo', 'não vendo', 'nao vendo'] },
  { agentId: 'dissecacao', keywords: ['público', 'publico', 'persona', 'cliente ideal', 'dor do cliente', 'avatar'] },
  { agentId: 'simulador', keywords: ['simular cliente', 'objeção', 'objecao', 'como o cliente pensa'] },
  { agentId: 'ugly-copy', keywords: ['whatsapp', 'dm', 'direct', 'mensagem direta', 'sms'] },
  { agentId: 'doug-tensao', keywords: ['urgência', 'urgencia', 'escassez', 'fomo', 'gatilho'] },
  { agentId: 'a-caixa', keywords: ['página de vendas', 'pagina de vendas', 'landing', 'e-mail de vendas', 'email de vendas'] },
  { agentId: 'ddemarco-bullets', keywords: ['bullet', 'bullets', 'benefícios em lista', 'beneficios em lista'] },
  { agentId: 'feedback-brutal', keywords: ['clareza', 'está confuso', 'esta confuso', 'feedback brutal'] },
  { agentId: 'micro-offer', keywords: ['micro oferta', 'micro-oferta', 'produto de entrada', 'isca'] },
  { agentId: 'z4-sys', keywords: ['organizar ideias', 'bagunçado', 'baguncado', 'estruturar pensamento'] },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Match de keyword com limite de palavra.
 * Evita que "ads" dentro de "storyads" roube o roteamento do pipeline.
 */
function includesKeyword(text: string, keyword: string): boolean {
  const t = normalize(text);
  const k = normalize(keyword).trim();
  if (!k) return false;
  if (k.includes(' ')) return t.includes(k);
  const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
  return re.test(t);
}

/**
 * Palavras que indicam AJUSTE de uma resposta anterior, não um pedido novo.
 *
 * Existe porque um refinamento costuma citar termos que batem em regras de
 * agente e sequestram o roteamento. Caso real: "refaz com CTA só de direct"
 * caía no agente UGLY COPY (palavra-chave "direct"), abandonando a montagem do
 * post — o usuário perdia título de TikTok e formato sugerido.
 */
const REFINEMENT_HINTS = [
  'refaz',
  'refaça',
  'refazer',
  'ajusta',
  'ajuste',
  'ajustar',
  'muda',
  'mude',
  'mudar',
  'troca',
  'troque',
  'trocar',
  'inclui',
  'incluir',
  'inclua',
  'adiciona',
  'adicione',
  'adicionar',
  'tira',
  'tire',
  'tirar',
  'remove',
  'remova',
  'sem o',
  'sem a',
  'mais curto',
  'mais curta',
  'mais longo',
  'menos',
  'de novo',
  'outra versao',
  'outra versão',
  'igual mas',
  'mesma coisa',
  'melhora isso',
  'so que',
  'só que',
];

/**
 * Resolve um identificador 'skill:x' ou 'agent:y' em RouteDecision.
 * Compartilhado entre rota forçada (atalhos da UI) e continuidade de contexto.
 */
export function resolveRoute(route: string, via: RouteDecision['via']): RouteDecision | null {
  const [kind, id] = (route || '').split(':');
  if (kind === 'skill') {
    const skill = getSkillById(id);
    if (!skill) return null;
    return {
      kind: 'skill',
      id: skill.id,
      name: skill.name,
      emoji: skill.emoji,
      via,
      systemPrompt: skill.systemPrompt,
    };
  }
  if (kind === 'agent') {
    const agent = ARSENAL_AGENTS.find((a) => a.id === id);
    if (!agent) return null;
    return {
      kind: 'agent',
      id: agent.id,
      name: agent.name,
      emoji: agent.emoji || '🤖',
      via,
      systemPrompt: getAgentSystemPrompt(agent),
    };
  }
  return null;
}

/** A mensagem é um ajuste do que já foi respondido? */
export function isRefinement(message: string): boolean {
  const text = normalize(message);
  return REFINEMENT_HINTS.some((h) => text.includes(normalize(h)));
}

export function getSkillById(id: string): CopilotSkill | undefined {
  return COPILOT_SKILLS.find((s) => s.id === id);
}

/**
 * A rota é a skill de EXECUÇÃO (agendar/publicar)? Quando true, o route.ts não
 * gera texto pela skill — ele desvia para copilotActions (runCopilotAction).
 */
export function isActionSkill(decision: RouteDecision): boolean {
  return decision.kind === 'skill' && decision.id === 'agendar';
}

export function skillNeedsPipeline(decision: RouteDecision): boolean {
  if (decision.kind !== 'skill') return false;
  return Boolean(getSkillById(decision.id)?.needsPipeline);
}

export function skillNeedsProfileContext(decision: RouteDecision): boolean {
  if (decision.kind !== 'skill') return false;
  return Boolean(getSkillById(decision.id)?.needsProfileContext);
}

export function getAgentSystemPrompt(agent: Agent): string {
  return (
    agent.systemPrompt ||
    `Você é ${agent.name}. ${agent.description}. Caso de uso: ${agent.useCase}. ` +
      'Responda em português do Brasil, de forma direta, específica e orientada a resultados.'
  );
}

/**
 * Camada 1 — roteamento por palavra-chave. Retorna null se não houver match confiável.
 *
 * `hasImage` desempata: com foto anexada, um pedido vago como "monta aí" ou
 * "escreve algo" quase sempre significa montar o post daquela imagem.
 *
 * `lastRoute` mantém a continuidade: se a mensagem é um ajuste do que acabou de
 * ser respondido, permanece no mesmo especialista em vez de pular para outro por
 * causa de uma palavra solta.
 */
export function routeByKeyword(
  message: string,
  hasImage = false,
  lastRoute?: string
): RouteDecision | null {
  // Ajuste de resposta anterior: preserva o especialista que já estava atuando.
  if (lastRoute && isRefinement(message)) {
    const kept = resolveRoute(lastRoute, 'keyword');
    if (kept) return kept;
  }

  // Agentes têm prioridade quando o assunto é claramente estratégia/oferta,
  // porque são mais especializados que as skills genéricas.
  for (const hint of AGENT_HINTS) {
    if (hint.keywords.some((k) => includesKeyword(message, k))) {
      const agent = ARSENAL_AGENTS.find((a) => a.id === hint.agentId);
      if (agent) {
        return {
          kind: 'agent',
          id: agent.id,
          name: agent.name,
          emoji: agent.emoji || '🤖',
          via: 'keyword',
          systemPrompt: getAgentSystemPrompt(agent),
        };
      }
    }
  }

  for (const skill of COPILOT_SKILLS) {
    if (skill.keywords.some((k) => includesKeyword(message, k))) {
      return {
        kind: 'skill',
        id: skill.id,
        name: skill.name,
        emoji: skill.emoji,
        via: 'keyword',
        systemPrompt: skill.systemPrompt,
      };
    }
  }

  // Com foto anexada e sem palavra-chave clara, montar o post é a intenção
  // muito mais provável do que qualquer outra skill.
  if (hasImage) {
    const skill = getSkillById('post')!;
    return {
      kind: 'skill',
      id: skill.id,
      name: skill.name,
      emoji: skill.emoji,
      via: 'keyword',
      systemPrompt: skill.systemPrompt,
    };
  }

  return null;
}

/** Catálogo compacto para o classificador LLM (camada 2). */
export function buildRoutingCatalog(): string {
  const skills = COPILOT_SKILLS.map((s) => `skill:${s.id} — ${s.name}: ${s.description}`).join('\n');
  const agents = ARSENAL_AGENTS.map(
    (a) => `agent:${a.id} — ${a.name} [${a.category}/${a.phase}]: ${a.description}. Uso: ${a.useCase}`
  ).join('\n');
  return `SKILLS DE CONTEÚDO:\n${skills}\n\nAGENTES ESPECIALISTAS:\n${agents}`;
}

export const ROUTER_SYSTEM_PROMPT = `Você é um classificador de intenção. Sua ÚNICA função é escolher qual skill ou agente deve responder a mensagem do usuário.

Regras:
- Responda APENAS com JSON válido, sem markdown: {"route":"skill:caption","reason":"..."}
- O campo "route" deve ser exatamente um dos identificadores do catálogo.
- Prefira uma SKILL quando o pedido é de execução de conteúdo (escrever legenda, ideia de Reels, hashtags, plano).
- Prefira um AGENTE quando o pedido é de estratégia, oferta, preço, posicionamento, público ou copy de vendas.
- "reason" deve ter no máximo 12 palavras.`;

/**
 * Converte a saída do classificador em RouteDecision. Retorna null se inválida.
 */
export function parseRouteDecision(raw: string): RouteDecision | null {
  let route = '';
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { route?: string };
    route = String(parsed.route || '').trim();
  } catch {
    // tenta extrair "skill:xxx" ou "agent:xxx" de texto solto
    const match = raw.match(/(skill|agent):([a-z0-9-]+)/i);
    if (match) route = `${match[1].toLowerCase()}:${match[2]}`;
  }

  if (!route) return null;

  const [kind, id] = route.split(':');
  if (kind === 'skill') {
    const skill = getSkillById(id);
    if (!skill) return null;
    return {
      kind: 'skill',
      id: skill.id,
      name: skill.name,
      emoji: skill.emoji,
      via: 'llm',
      systemPrompt: skill.systemPrompt,
    };
  }
  if (kind === 'agent') {
    const agent = ARSENAL_AGENTS.find((a) => a.id === id);
    if (!agent) return null;
    return {
      kind: 'agent',
      id: agent.id,
      name: agent.name,
      emoji: agent.emoji || '🤖',
      via: 'llm',
      systemPrompt: getAgentSystemPrompt(agent),
    };
  }
  return null;
}

/** Rota padrão quando nada mais resolve: skill de legenda (a mais usada). */
export function fallbackRoute(): RouteDecision {
  const skill = getSkillById('caption')!;
  return {
    kind: 'skill',
    id: skill.id,
    name: skill.name,
    emoji: skill.emoji,
    via: 'fallback',
    systemPrompt: skill.systemPrompt,
  };
}

/** Monta o system prompt final, injetando contexto extra quando a skill pede. */
export function buildFinalSystemPrompt(decision: RouteDecision): string {
  if (decision.kind === 'skill') {
    const skill = getSkillById(decision.id);
    if (skill?.needsReelsContext) {
      return `${decision.systemPrompt}\n\n--- CONTEXTO DE REFERÊNCIA ---\n${buildReelsContext()}`;
    }
  }
  return decision.systemPrompt;
}
