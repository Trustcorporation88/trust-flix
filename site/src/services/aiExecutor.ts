/**
 * 🤖 AI Executor - Executa agentes em qualquer API de IA
 * Suporta: OpenAI (GPT), Anthropic (Claude), Google (Gemini), e custom
 */

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'custom';

export interface AIExecutorConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
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

class AIExecutor {
  private config: AIExecutorConfig | null = null;
  private executionHistory: ExecutionResult[] = [];

  /**
   * Configurar provider de IA
   */
  configure(config: AIExecutorConfig): void {
    this.config = config;
    console.log(`✅ AI Executor configurado com ${config.provider} (${config.model})`);
  }

  /**
   * Executar agente com o provider configurado
   */
  async executeAgent(
    agentId: string,
    agentName: string,
    systemPrompt: string,
    userMessage: string
  ): Promise<ExecutionResult> {
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
      switch (this.config.provider) {
        case 'openai':
          response = await this.executeOpenAI(messages);
          break;
        case 'anthropic':
          response = await this.executeAnthropic(messages);
          break;
        case 'google':
          response = await this.executeGoogle(messages);
          break;
        case 'custom':
          response = await this.executeCustom(messages);
          break;
        default:
          throw new Error(`Provider não suportado: ${this.config.provider}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao executar agente ${agentName}:`, error);
      response = `Erro ao executar agente: ${error instanceof Error ? error.message : 'Desconhecido'}`;
    }

    const duration = performance.now() - startTime;

    const result: ExecutionResult = {
      agentId,
      agentName,
      provider: this.config.provider,
      model: this.config.model,
      messages,
      response,
      executedAt: new Date(),
      duration,
    };

    this.executionHistory.push(result);
    return result;
  }

  /**
   * Executar via OpenAI (GPT-4, GPT-3.5)
   */
  private async executeOpenAI(messages: AgentMessage[]): Promise<string> {
    if (!this.config) throw new Error('Config não disponível');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Executar via Anthropic (Claude)
   */
  private async executeAnthropic(messages: AgentMessage[]): Promise<string> {
    if (!this.config) throw new Error('Config não disponível');

    // Claude usa formato diferente - não tem system message na array
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const otherMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 2000,
        system: systemMessage,
        messages: otherMessages,
        temperature: this.config.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  /**
   * Executar via Google (Gemini)
   */
  private async executeGoogle(messages: AgentMessage[]): Promise<string> {
    if (!this.config) throw new Error('Config não disponível');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages.map(m => ({
            role: m.role === 'system' ? 'user' : m.role,
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: this.config.temperature || 0.7,
            maxOutputTokens: this.config.maxTokens || 2000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  /**
   * Executar via custom endpoint
   */
  private async executeCustom(messages: AgentMessage[]): Promise<string> {
    if (!this.config) throw new Error('Config não disponível');

    const response = await fetch(this.config.apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || data.content || JSON.stringify(data);
  }

  /**
   * Obter histórico de execuções
   */
  getHistory(): ExecutionResult[] {
    return this.executionHistory;
  }

  /**
   * Limpar histórico
   */
  clearHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Exportar histórico
   */
  exportHistory(): string {
    return JSON.stringify(this.executionHistory, null, 2);
  }

  /**
   * Obter provider atual
   */
  getCurrentProvider(): AIExecutorConfig | null {
    return this.config;
  }
}

// Singleton global
export const aiExecutor = new AIExecutor();

/**
 * Sugestões de modelos por provider
 */
export const MODEL_SUGGESTIONS: Record<AIProvider, string[]> = {
  openai: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-pro', 'gemini-pro-vision'],
  custom: [],
};
