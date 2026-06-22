/**
 * 🤖 Arsenal Service - DOUG.EXE Agentes
 * Sistema de agentes estratégicos para vendas, copy e posicionamento
 */

export interface Agent {
  id: string;
  name: string;
  tier: number; // 1-5 (Diagnóstico até Escala)
  phase: 'Diagnóstico' | 'Cliente' | 'Copy' | 'Distribuição' | 'Escala';
  category: 'Estratégia' | 'Inteligência' | 'Construção' | 'Conteúdo';
  description: string;
  link: string;
  useCase: string;
  emoji?: string;
  provider?: 'chatgpt' | 'claude' | 'gemini' | 'custom'; // Provider de IA
  systemPrompt?: string; // Prompt de sistema para executar via API
}

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export interface Workflow {
  id: string;
  name: string;
  phase: number; // 1-5
  agents: Agent[];
  description: string;
  duration: string;
}

export interface WorkflowSession {
  id: string;
  name: string;
  product: string;
  currentPhase: number;
  currentAgent?: string;
  completedAgents: string[];
  notes: string[];
  results: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const ARSENAL_AGENTS: Agent[] = [
  // FASE 1 - Diagnóstico e Estratégia
  {
    id: 'doug-exe-6',
    name: 'DOUG.EXE 6.0',
    tier: 1,
    phase: 'Diagnóstico',
    category: 'Estratégia',
    description: 'Diagnóstico e posicionamento da oferta',
    link: 'https://chatgpt.com/g/g-68ac7f56761081918c2c92f2d6313b28-jis-alex-hormozi',
    useCase: 'Comece aqui',
    emoji: '🧠',
  },
  {
    id: '100m-models',
    name: '$100M MONEY MODELS',
    tier: 1,
    phase: 'Diagnóstico',
    category: 'Estratégia',
    description: 'Estruturação de oferta no modelo Hormozi',
    link: '#',
    useCase: 'Valor percebido + Bônus + Garantia + Preço',
    emoji: '💰',
  },
  {
    id: 'raya',
    name: 'RAYA',
    tier: 1,
    phase: 'Diagnóstico',
    category: 'Estratégia',
    description: 'Análise fria, brutal e honesta',
    link: 'https://chatgpt.com/g/g-683fa30356608191a8d38c70ca9230ac-raya',
    useCase: 'Validação de pontos cegos',
    emoji: '⚡',
  },

  // FASE 2 - Inteligência de Cliente
  {
    id: 'dissecacao',
    name: 'DISSECAÇÃO NEURAL',
    tier: 2,
    phase: 'Cliente',
    category: 'Inteligência',
    description: 'Análise profunda do cliente ideal',
    link: 'https://chatgpt.com/g/g-68debe47af54819190692259f394047e-jis-simulador-cliente-ideal',
    useCase: 'Medos, desejos, objeções, linguagem',
    emoji: '🎯',
  },
  {
    id: 'simulador',
    name: 'SIMULADOR CLIENTE IDEAL',
    tier: 2,
    phase: 'Cliente',
    category: 'Inteligência',
    description: 'Teste sua oferta com simulação do cliente',
    link: 'https://chatgpt.com/g/g-68debe47af54819190692259f394047e-jis-simulador-cliente-ideal',
    useCase: 'Identificar objeções reais',
    emoji: '🤝',
  },

  // FASE 3 - Construção de Copy
  {
    id: 'z4-sys',
    name: 'Z4.SYS',
    tier: 3,
    phase: 'Copy',
    category: 'Construção',
    description: 'Organização e estruturação de ideias',
    link: 'https://chatgpt.com/g/g-6787e3c6f24881918b34f956724de8f2-jis-z4-sys',
    useCase: 'Base de copy estruturada',
    emoji: '📝',
  },
  {
    id: 'a-caixa',
    name: 'A CAIXA',
    tier: 3,
    phase: 'Copy',
    category: 'Construção',
    description: 'Conversão com gatilhos psicológicos',
    link: 'https://chatgpt.com/g/g-6845f08715d08191b7cf92f6cd3624c9-jis-a-caixa',
    useCase: 'Copy de página de vendas e e-mail',
    emoji: '🎁',
  },
  {
    id: 'doug-tensao',
    name: 'doug.tensão',
    tier: 3,
    phase: 'Copy',
    category: 'Construção',
    description: 'Tensão emocional e urgência',
    link: 'https://chatgpt.com/g/g-680aafa0210081919d1f2111e2e4f428-jis-doug-tensao',
    useCase: 'Aplicar FOMO e escassez',
    emoji: '⏰',
  },
  {
    id: 'ddemarco-bullets',
    name: 'ddemarco // bullets',
    tier: 3,
    phase: 'Copy',
    category: 'Construção',
    description: 'Bullets points refinados',
    link: 'https://chatgpt.com/g/g-67bf33158a748191878d21bfb825c5e1-jis-d-demarco-bullets-points',
    useCase: 'Máxima clareza e desejo',
    emoji: '✅',
  },
  {
    id: 'feedback-brutal',
    name: 'FEEDBACK CLAREZA BRUTAL',
    tier: 3,
    phase: 'Copy',
    category: 'Construção',
    description: 'Avaliação final e refinamento',
    link: '#',
    useCase: 'Correções antes de publicar',
    emoji: '🔍',
  },

  // FASE 4 - Distribuição e Funil
  {
    id: 'ugly-copy',
    name: 'UGLY COPY',
    tier: 4,
    phase: 'Distribuição',
    category: 'Conteúdo',
    description: 'Mensagens diretas e cruas',
    link: '#',
    useCase: 'WhatsApp, DM Instagram, SMS',
    emoji: '💬',
  },
  {
    id: 'storyads',
    name: 'STORYADS',
    tier: 4,
    phase: 'Distribuição',
    category: 'Conteúdo',
    description: 'Roteiros de Stories e anúncios',
    link: 'https://chatgpt.com/g/g-68dbf676f6b481918756759415986f84-jis-storyads',
    useCase: 'Vídeos para Instagram',
    emoji: '🎬',
  },
  {
    id: 'micro-offer',
    name: 'døug // micro-offer',
    tier: 4,
    phase: 'Distribuição',
    category: 'Conteúdo',
    description: 'Funil rápido para leads',
    link: 'https://chatgpt.com/g/g-67999d4ee7fc819194e56c816752d6b9-doug-micro-offer',
    useCase: 'Entrada de leads ou oferta de baixo ticket',
    emoji: '🚀',
  },

  // FASE 5 - Escala e Criação de Ativos
  {
    id: 'aria',
    name: 'ARIAPerspicaz',
    tier: 5,
    phase: 'Escala',
    category: 'Construção',
    description: 'Novas oportunidades de monetização',
    link: 'https://chatgpt.com/g/g-68854a28c43c819191cee0f252c059fd-jis-aria',
    useCase: 'Multiplicar ofertas existentes',
    emoji: '💎',
  },
  {
    id: 'arsenal-prompts',
    name: 'ARSENAL PROMPTS',
    tier: 5,
    phase: 'Escala',
    category: 'Construção',
    description: 'Prompts específicos para automação',
    link: 'https://chatgpt.com/g/g-68dbfe5dc20081918e45442595e021c3-jis-prompts',
    useCase: 'Tarefas repetitivas',
    emoji: '🔧',
  },
  {
    id: 'builder-00',
    name: 'BUILDER.00',
    tier: 5,
    phase: 'Escala',
    category: 'Construção',
    description: 'Agentes neurais personalizados',
    link: 'https://chatgpt.com/g/g-68bfe26da6788191a5c4eb459448af27-builder-00',
    useCase: 'Seu próprio GPT',
    emoji: '⚙️',
  },
  {
    id: 'builder-02',
    name: 'BUILDER.02',
    tier: 5,
    phase: 'Escala',
    category: 'Construção',
    description: 'Empacote e venda seu conhecimento',
    link: 'https://chatgpt.com/g/g-6901d12d816c8191893b4ac7786b28a5-builder-02',
    useCase: 'GPTs para vender',
    emoji: '📦',
  },

  // BONUS - Versão avançada
  {
    id: 'doug-exe-8',
    name: 'DOUG.EXE 8.0',
    tier: 1,
    phase: 'Diagnóstico',
    category: 'Estratégia',
    description: 'Versão avançada do diagnóstico',
    link: 'https://chatgpt.com/g/g-69d42429b2648191a0686b45a8a0f5f1-doug-exe-8-0',
    useCase: 'Análise estratégica completa',
    emoji: '🧠',
  },
];

export const WORKFLOWS: Workflow[] = [
  {
    id: 'phase-1',
    name: 'FASE 1 - Diagnóstico e Estratégia',
    phase: 1,
    agents: ARSENAL_AGENTS.filter(a => a.tier === 1),
    description: 'Use uma vez por produto/oferta. Identifique gargalos e estruture estratégia.',
    duration: '1-2 horas',
  },
  {
    id: 'phase-2',
    name: 'FASE 2 - Inteligência de Cliente',
    phase: 2,
    agents: ARSENAL_AGENTS.filter(a => a.tier === 2),
    description: 'Use para cada novo público/produto. Entenda profundamente seu cliente.',
    duration: '1-2 horas',
  },
  {
    id: 'phase-3',
    name: 'FASE 3 - Construção de Copy',
    phase: 3,
    agents: ARSENAL_AGENTS.filter(a => a.tier === 3),
    description: 'Use em sequência. Produza copy persuasiva e refinada.',
    duration: '3-4 horas',
  },
  {
    id: 'phase-4',
    name: 'FASE 4 - Distribuição e Funil',
    phase: 4,
    agents: ARSENAL_AGENTS.filter(a => a.tier === 4),
    description: 'Adapte copy para cada canal. Monte funis rápidos.',
    duration: '2-3 horas',
  },
  {
    id: 'phase-5',
    name: 'FASE 5 - Escala e Ativos',
    phase: 5,
    agents: ARSENAL_AGENTS.filter(a => a.tier === 5),
    description: 'Crie agentes, prompts e multiplique ofertas.',
    duration: '2-3 horas',
  },
];

class ArsenalService {
  private sessions: Map<string, WorkflowSession> = new Map();

  /**
   * Criar nova sessão de workflow
   */
  createSession(productName: string): WorkflowSession {
    const session: WorkflowSession = {
      id: `session-${Date.now()}`,
      name: `Workflow ${productName}`,
      product: productName,
      currentPhase: 1,
      completedAgents: [],
      notes: [],
      results: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Obter sessão
   */
  getSession(sessionId: string): WorkflowSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Atualizar sessão
   */
  updateSession(sessionId: string, updates: Partial<WorkflowSession>): WorkflowSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const updated = { ...session, ...updates, updatedAt: new Date() };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  /**
   * Marcar agente como completo
   */
  completeAgent(sessionId: string, agentId: string, result?: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.completedAgents.push(agentId);
    if (result) {
      session.results[agentId] = result;
    }
    session.updatedAt = new Date();
  }

  /**
   * Avançar para próxima fase
   */
  nextPhase(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.currentPhase < 5) {
      session.currentPhase++;
      session.updatedAt = new Date();
    }
  }

  /**
   * Adicionar nota
   */
  addNote(sessionId: string, note: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.notes.push(`[${new Date().toLocaleTimeString()}] ${note}`);
    session.updatedAt = new Date();
  }

  /**
   * Obter agente por ID
   */
  getAgent(agentId: string): Agent | undefined {
    return ARSENAL_AGENTS.find(a => a.id === agentId);
  }

  /**
   * Obter workflow por fase
   */
  getWorkflow(phase: number): Workflow | undefined {
    return WORKFLOWS.find(w => w.phase === phase);
  }

  /**
   * Obter agentes por situação (cheat sheet)
   */
  getSuggestedAgent(situation: string): Agent | undefined {
    const map: Record<string, string> = {
      'começar': 'doug-exe-6',
      'estruturar oferta': '100m-models',
      'cliente': 'dissecacao',
      'bagunçado': 'z4-sys',
      'copy': 'a-caixa',
      'whatsapp': 'ugly-copy',
      'story': 'storyads',
      'feedback': 'feedback-brutal',
      'gpt': 'builder-00',
      'análise': 'raya',
      'funil': 'micro-offer',
    };

    const key = Object.keys(map).find(k => situation.toLowerCase().includes(k));
    if (key) return this.getAgent(map[key]);

    return undefined;
  }

  /**
   * Ciclo semanal sugerido
   */
  getWeeklySchedule(): Record<string, string[]> {
    return {
      'Segunda': ['doug-exe-6', '100m-models'],
      'Terça': ['dissecacao', 'simulador'],
      'Quarta': ['z4-sys', 'a-caixa', 'doug-tensao'],
      'Quinta': ['storyads', 'ugly-copy'],
      'Sexta': ['feedback-brutal', 'arsenal-prompts'],
    };
  }

  /**
   * Exportar sessão
   */
  exportSession(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    return JSON.stringify(session, null, 2);
  }

  /**
   * Listar todas as sessões
   */
  listSessions(): WorkflowSession[] {
    return Array.from(this.sessions.values());
  }
}

export const arsenalService = new ArsenalService();
