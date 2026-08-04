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
  'Quando entregar texto pronto para postar, deixe-o isolado para facilitar a cópia.';

export const COPILOT_SKILLS: CopilotSkill[] = [
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

export function getSkillById(id: string): CopilotSkill | undefined {
  return COPILOT_SKILLS.find((s) => s.id === id);
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
 */
export function routeByKeyword(message: string): RouteDecision | null {
  const text = normalize(message);

  // Agentes têm prioridade quando o assunto é claramente estratégia/oferta,
  // porque são mais especializados que as skills genéricas.
  for (const hint of AGENT_HINTS) {
    if (hint.keywords.some((k) => text.includes(normalize(k)))) {
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
    if (skill.keywords.some((k) => text.includes(normalize(k)))) {
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
