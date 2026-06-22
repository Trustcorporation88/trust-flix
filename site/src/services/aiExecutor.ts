/**
 * 🤖 AI Executor - Executa agentes em qualquer provedor de IA.
 *
 * As chamadas são feitas via rota server-side (/api/agents/execute) para:
 *  - evitar erros de CORS (Anthropic bloqueia chamadas diretas do browser);
 *  - não expor a API key em requisições cross-origin a partir do cliente.
 *
 * Provedores compatíveis com a API OpenAI (mesmo formato de payload):
 *  openai, deepseek, groq, mistral, openrouter e custom (baseUrl próprio).
 * Provedores com formato próprio: anthropic (Claude) e google (Gemini).
 */

export type AIProvider =
  | 'openai'
  | 'deepseek'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'mistral'
  | 'openrouter'
  | 'custom';

export interface AIExecutorConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  /** Obrigatório quando provider === 'custom' (endpoint OpenAI-compatible). */
  baseUrl?: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ExecutionResult {
  agentId: string;
  agentName: string;
  provider: AIProvider;
  model: string;
  messages: AgentMessage[];
  response: string;
  executedAt: Date;
  duration: number; // em ms
}

const STORAGE_KEY = 'jetflix_ai_config';

class AIExecutor {
  private config: AIExecutorConfig | null = null;
  private executionHistory: ExecutionResult[] = [];
  private loadedFromStorage = false;

  /** Lê a configuração persistida no localStorage (apenas no browser, uma vez). */
  private ensureLoaded(): void {
    if (this.loadedFromStorage || typeof window === 'undefined') return;
    this.loadedFromStorage = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AIExecutorConfig;
        if (parsed && parsed.provider && parsed.apiKey && parsed.model) {
          this.config = parsed;
        }
      }
    } catch (error) {
      console.error('Falha ao carregar config de IA do localStorage:', error);
    }
  }

  configure(config: AIExecutorConfig): void {
    this.config = config;
    this.loadedFromStorage = true;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch (error) {
        console.error('Falha ao salvar config de IA no localStorage:', error);
      }
    }
  }

  /** Remove a configuração salva (logout da IA). */
  reset(): void {
    this.config = null;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Falha ao remover config de IA do localStorage:', error);
      }
    }
  }

  async executeAgent(
    agentId: string,
    agentName: string,
    systemPrompt: string,
    userMessage: string
  ): Promise<ExecutionResult> {
    this.ensureLoaded();
    if (!this.config) {
      throw new Error('AI Executor não configurado. Use configure() primeiro.');
    }

    const startTime = performance.now();
    const messages: AgentMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    let response: string;

    try {
      const res = await fetch('/api/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: this.config.provider,
          apiKey: this.config.apiKey,
          model: this.config.model,
          systemPrompt,
          userMessage,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
          baseUrl: this.config.baseUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Erro ${res.status}`);
      }

      response = data.response || '';
    } catch (error) {
      response = `Erro ao executar agente: ${error instanceof Error ? error.message : 'Desconhecido'}`;
    }

    const result: ExecutionResult = {
      agentId,
      agentName,
      provider: this.config.provider,
      model: this.config.model,
      messages,
      response,
      executedAt: new Date(),
      duration: performance.now() - startTime,
    };

    this.executionHistory.push(result);
    return result;
  }

  getHistory(): ExecutionResult[] {
    return this.executionHistory;
  }

  clearHistory(): void {
    this.executionHistory = [];
  }

  exportHistory(): string {
    return JSON.stringify(this.executionHistory, null, 2);
  }

  getCurrentProvider(): AIExecutorConfig | null {
    this.ensureLoaded();
    return this.config;
  }
}

// Singleton global
export const aiExecutor = new AIExecutor();

/** Metadados de cada provider para uso na UI. */
export interface ProviderInfo {
  id: AIProvider;
  label: string;
  emoji: string;
  models: string[];
  defaultModel: string;
  /** Onde o usuário obtém a API key. */
  keyUrl: string;
  needsBaseUrl?: boolean;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'openai',
    label: 'OpenAI (GPT)',
    emoji: '🔴',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    emoji: '🐳',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    keyUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    emoji: '🟡',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
    defaultModel: 'claude-3-5-sonnet-20241022',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'google',
    label: 'Google (Gemini)',
    emoji: '🔵',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    defaultModel: 'gemini-1.5-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'groq',
    label: 'Groq',
    emoji: '⚡',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    defaultModel: 'llama-3.3-70b-versatile',
    keyUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    emoji: '🌬️',
    models: ['mistral-large-latest', 'mistral-small-latest'],
    defaultModel: 'mistral-large-latest',
    keyUrl: 'https://console.mistral.ai/api-keys',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    emoji: '🛣️',
    models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b-instruct'],
    defaultModel: 'openai/gpt-4o-mini',
    keyUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    emoji: '🔧',
    models: [],
    defaultModel: '',
    keyUrl: '',
    needsBaseUrl: true,
  },
];

export function getProvider(id: AIProvider): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Mantido para compatibilidade. */
export const MODEL_SUGGESTIONS: Record<AIProvider, string[]> = PROVIDERS.reduce(
  (acc, p) => {
    acc[p.id] = p.models;
    return acc;
  },
  {} as Record<AIProvider, string[]>
);
