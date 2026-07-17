/**
 * 🤖 useAgentExecutor - Hook para executar agentes com qualquer IA
 */

import { useState, useCallback, useEffect } from 'react';
import { aiExecutor, AIExecutorConfig, ExecutionResult } from '@/services/aiExecutor';
import { Agent } from '@/services/arsenalService';

interface UseAgentExecutorState {
  isLoading: boolean;
  error: string | null;
  result: ExecutionResult | null;
  history: ExecutionResult[];
}

export const useAgentExecutor = () => {
  const [state, setState] = useState<UseAgentExecutorState>({
    isLoading: false,
    error: null,
    result: null,
    history: [],
  });

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      history: aiExecutor.getHistory(),
    }));
  }, []);

  const configure = useCallback((config: AIExecutorConfig) => {
    aiExecutor.configure(config);
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const executeAgent = useCallback(
    async (agent: Agent, userInput: string, systemPromptOverride?: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const systemPrompt = systemPromptOverride || agent.systemPrompt || generateSystemPrompt(agent);

        const result = await aiExecutor.executeAgent(agent.id, agent.name, systemPrompt, userInput);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          result,
          history: aiExecutor.getHistory(),
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    []
  );

  const executeWorkflow = useCallback(
    async (agents: Agent[], userInputs: string[]) => {
      const results: ExecutionResult[] = [];
      let currentInput = userInputs[0] || '';

      for (let i = 0; i < agents.length; i++) {
        try {
          const agent = agents[i];
          const input = userInputs[i] || currentInput;

          setState((prev) => ({
            ...prev,
            isLoading: true,
            error: null,
          }));

          const result = await executeAgent(agent, input);
          results.push(result);
          currentInput = result.response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro na execução';
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
          break;
        }
      }

      return results;
    },
    [executeAgent]
  );

  const clearHistory = useCallback(() => {
    aiExecutor.clearHistory();
    setState((prev) => ({
      ...prev,
      history: [],
      result: null,
    }));
  }, []);

  const exportHistory = useCallback(() => {
    const json = aiExecutor.exportHistory();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(json));
    element.setAttribute('download', `agent-execution-${Date.now()}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, []);

  return {
    ...state,
    configure,
    executeAgent,
    executeWorkflow,
    clearHistory,
    exportHistory,
    getCurrentProvider: () => aiExecutor.getCurrentProvider(),
    resetProvider: () => aiExecutor.reset(),
  };
};

function generateSystemPrompt(agent: Agent): string {
  const basePrompts: Record<string, string> = {
    'doug-exe-6': `Você é DOUG.EXE 6.0, especialista em diagnóstico e posicionamento de ofertas.
Sua função é:
1. Analisar o negócio/produto/oferta do usuário
2. Simular a estratégia de posicionamento
3. Identificar o maior gargalo de vendas
4. Fornecer recomendações acionáveis

Seja direto, específico e orientado a resultados.`,

    '100m-models': `Você é $100M MONEY MODELS, especialista no modelo de estruturação de ofertas Hormozi.
Sua função é estruturar a oferta usando os 4 pilares:
1. Valor Percebido - O quanto o cliente acha que vai ganhar
2. Stack de Bônus - Extras que aumentam a percepção de valor
3. Garantia - O que garante o resultado
4. Preço - Ponto de ancoramento

Estruture de forma clara e persuasiva.`,

    dissecacao: `Você é DISSECAÇÃO NEURAL, especialista em análise profunda do cliente ideal.
Sua função é extrair e mapear:
1. Medos e inseguranças do cliente
2. Desejos e sonhos não realizados
3. Objeções comuns
4. Linguagem, gírias e termos que ele usa
5. Padrões de comportamento

Seja preciso e específico. Use dados da psicologia comportamental.`,

    'z4-sys': `Você é Z4.SYS, especialista em organização e estruturação de ideias.
Sua função é pegar ideias bagunçadas e transformar em estrutura clara:
1. Organizar pensamentos
2. Identificar pontos principais
3. Criar fluxo lógico
4. Preparar base para copy estruturada

Seja metódico e lógico.`,

    'a-caixa': `Você é A CAIXA, especialista em conversão com gatilhos psicológicos.
Sua função é converter textos estruturados em copy persuasiva:
1. Usar gatilhos psicológicos
2. Criar tensão e curiosidade
3. Destacar benefícios
4. Orientado para página de vendas e e-mail

Use técnicas de copywriting comprovadas.`,

    'doug-tensao': `Você é doug.tensão, especialista em aplicar urgência emocional.
Sua função é injetar FOMO (medo de perder):
1. Criar senso de escassez
2. Aplicar deadline
3. Destacar custo da demora
4. Amplificar urgência

Seja persuasivo sem ser manipulador.`,

    storyads: `Você é STORYADS, especialista em roteiros de vídeos e anúncios.
Sua função é gerar roteiros para:
1. Instagram Stories
2. Reels
3. Anúncios em vídeo
4. Sequências de conteúdo

Crie roteiros visuais, diretos e envolventes.`,

    'ugly-copy': `Você é UGLY COPY, especialista em mensagens diretas e cruas.
Sua função é adaptar copy para canais diretos:
1. WhatsApp
2. DM Instagram
3. SMS
4. Linguagem coloquial e autêntica

Seja genuíno, informal, mas ainda persuasivo.`,

    'builder-00': `Você é BUILDER.00, especialista em criar agentes neurais personalizados.
Sua função é:
1. Compreender a necessidade do usuário
2. Desenhar arquitetura do agente
3. Criar system prompts eficazes
4. Definir fluxos de trabalho

Seja criativo e estruturado.`,
  };

  return (
    basePrompts[agent.id] ||
    `Você é ${agent.name}. ${agent.description}. Use case: ${agent.useCase}. Seja profissional e orientado a resultados.`
  );
}
