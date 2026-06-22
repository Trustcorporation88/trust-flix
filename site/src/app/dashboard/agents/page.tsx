'use client';

import React, { useState, useEffect } from 'react';
import { useAgentExecutor } from '@/hooks/useAgentExecutor';
import { ARSENAL_AGENTS, WORKFLOWS } from '@/services/arsenalService';
import { AIExecutorConfig, AIProvider, PROVIDERS, getProvider } from '@/services/aiExecutor';

export default function AgentsPage() {
  const agentExecutor = useAgentExecutor();

  const [activeTab, setActiveTab] = useState<'discover' | 'workflow' | 'cheatsheet' | 'execute' | 'schedule'>('discover');
  const [selectedPhase, setSelectedPhase] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState(ARSENAL_AGENTS[0]);
  const [userInput, setUserInput] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai');
  const [model, setModel] = useState(getProvider('openai')?.defaultModel || '');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  const providerInfo = getProvider(aiProvider);

  // Reflete a configuração de IA já persistida (localStorage) ao abrir a página
  useEffect(() => {
    const saved = agentExecutor.getCurrentProvider();
    if (saved) {
      setAiProvider(saved.provider);
      setModel(saved.model);
      if (saved.baseUrl) setBaseUrl(saved.baseUrl);
      setApiKey(saved.apiKey);
      setIsConfigured(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trocar de provider reseta o modelo e a base URL para o padrão dele
  const handleSelectProvider = (id: AIProvider) => {
    setAiProvider(id);
    setModel(getProvider(id)?.defaultModel || '');
    if (id === 'openai') {
      setBaseUrl('https://api.openai.com/v1');
    } else if (id === 'deepseek') {
      setBaseUrl('https://api.deepseek.com/v1');
    } else if (id === 'groq') {
      setBaseUrl('https://api.groq.com/openai/v1');
    } else if (id === 'mistral') {
      setBaseUrl('https://api.mistral.ai/v1');
    } else if (id === 'openrouter') {
      setBaseUrl('https://openrouter.ai/api/v1');
    } else {
      setBaseUrl('');
    }
    setIsConfigured(false);
  };

  // Configurar IA
  const handleConfigureAI = () => {
    if (!apiKey) {
      alert('Por favor, insira a API key');
      return;
    }
    if (!model) {
      alert('Por favor, informe o modelo');
      return;
    }
    if ((aiProvider === 'custom' || aiProvider === 'openai') && !baseUrl) {
      alert('Por favor, informe a Base URL do endpoint da API');
      return;
    }

    const config: AIExecutorConfig = {
      provider: aiProvider,
      apiKey,
      model,
      ...(baseUrl ? { baseUrl } : {}),
    };

    agentExecutor.configure(config);
    setIsConfigured(true);
    alert('✅ IA configurada com sucesso!');
  };

  // Executar agente
  const handleExecuteAgent = async () => {
    if (!isConfigured) {
      alert('Configure a IA primeiro');
      return;
    }

    if (!userInput.trim()) {
      alert('Digite sua pergunta/input');
      return;
    }

    try {
      await agentExecutor.executeAgent(selectedAgent, userInput);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const phaseAgents = ARSENAL_AGENTS.filter(a => a.tier === selectedPhase);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🤖 Arsenal de Agentes DOUG.EXE</h1>
          <p className="text-purple-300">Sistema inteligente para vendas, copy e posicionamento</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'discover', label: '🔍 Descobrir', icon: '🔍' },
            { id: 'workflow', label: '⚙️ Workflow', icon: '⚙️' },
            { id: 'cheatsheet', label: '📋 Cheat Sheet', icon: '📋' },
            { id: 'execute', label: '▶️ Executar', icon: '▶️' },
            { id: 'schedule', label: '📅 Ciclo Semanal', icon: '📅' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-slate-800 text-purple-300 hover:bg-slate-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: DESCOBRIR AGENTES */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            {/* Seletor de Fase */}
            <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-purple-500/30">
              <h3 className="text-lg font-semibold text-white mb-4">Selecione uma Fase:</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map(phase => {
                  const phaseNames = ['Diagnóstico', 'Cliente', 'Copy', 'Distribuição', 'Escala'];
                  return (
                    <button
                      key={phase}
                      onClick={() => setSelectedPhase(phase)}
                      className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                        selectedPhase === phase
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-slate-700 text-purple-300 hover:bg-slate-600'
                      }`}
                    >
                      <div className="text-sm">FASE {phase}</div>
                      <div className="text-xs mt-1">{phaseNames[phase - 1]}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid de Agentes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {phaseAgents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAgent.id === agent.id
                      ? 'bg-purple-600/20 border-purple-500 shadow-lg'
                      : 'bg-slate-800/50 border-slate-700 hover:border-purple-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{agent.emoji}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{agent.name}</h4>
                      <p className="text-sm text-slate-400 mt-1">{agent.description}</p>
                      <p className="text-xs text-purple-300 mt-2 font-semibold">💡 {agent.useCase}</p>
                      {agent.link && agent.link !== '#' && (
                        <a
                          href={agent.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                        >
                          Acessar GPT →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: WORKFLOW POR FASE */}
        {activeTab === 'workflow' && (
          <div className="space-y-6">
            {WORKFLOWS.map(workflow => (
              <div key={workflow.id} className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-purple-500/30">
                <h3 className="text-2xl font-bold text-white mb-2">{workflow.name}</h3>
                <p className="text-purple-300 mb-4">{workflow.description}</p>
                <p className="text-sm text-slate-400 mb-4">⏱️ Duração estimada: {workflow.duration}</p>

                {/* Sequência de agentes */}
                <div className="flex items-center gap-3 overflow-x-auto pb-4">
                  {workflow.agents.map((agent, idx) => (
                    <React.Fragment key={agent.id}>
                      <div className="flex-shrink-0 px-4 py-2 bg-purple-600/30 rounded-lg border border-purple-500 text-center min-w-max">
                        <div className="text-2xl">{agent.emoji}</div>
                        <div className="text-xs font-semibold text-white mt-1">{agent.name}</div>
                      </div>
                      {idx < workflow.agents.length - 1 && (
                        <div className="text-2xl text-purple-400">→</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: CHEAT SHEET */}
        {activeTab === 'cheatsheet' && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-purple-500/30">
              <h3 className="text-2xl font-bold text-white mb-6">⚡ Cheat Sheet - Qual agente usar agora?</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { situation: 'Não sei por onde começar', agent: 'DOUG.EXE 6.0', icon: '🧠' },
                  { situation: 'Preciso estruturar minha oferta', agent: '$100M MONEY MODELS', icon: '💰' },
                  { situation: 'Quero entender meu cliente', agent: 'DISSECAÇÃO NEURAL', icon: '🎯' },
                  { situation: 'Tenho uma ideia bagunçada', agent: 'Z4.SYS', icon: '📝' },
                  { situation: 'Preciso de copy persuasiva', agent: 'A CAIXA → doug.tensão', icon: '🎁' },
                  { situation: 'Vou mandar no WhatsApp/DM', agent: 'UGLY COPY', icon: '💬' },
                  { situation: 'Vou fazer story/anúncio', agent: 'STORYADS', icon: '🎬' },
                  { situation: 'Quero feedback no meu texto', agent: 'FEEDBACK BRUTAL', icon: '🔍' },
                  { situation: 'Quero criar meu próprio GPT', agent: 'BUILDER.00', icon: '⚙️' },
                  { situation: 'Preciso de uma análise dura', agent: 'RAYA', icon: '⚡' },
                  { situation: 'Quero montar um funil rápido', agent: 'døug // micro-offer', icon: '🚀' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 hover:border-purple-500 transition-all cursor-pointer">
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <p className="text-sm text-slate-300">{item.situation}</p>
                    <p className="font-bold text-purple-300 mt-2">→ {item.agent}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EXECUTAR AGENTE */}
        {activeTab === 'execute' && (
          <div className="space-y-6">
            {/* Configuração de IA */}
            <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4">⚙️ Configurar Provedor de IA</h3>

              <p className="text-sm text-slate-400 mb-3">
                Escolha o provedor, cole sua API key e selecione o modelo. A chave é enviada apenas
                ao servidor para executar a chamada — funciona com OpenAI, DeepSeek, Claude, Gemini e mais.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProvider(p.id)}
                    className={`py-3 px-3 rounded-lg font-semibold text-sm transition-all ${
                      aiProvider === p.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>

              <input
                type="password"
                placeholder="Cole sua API Key aqui"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-slate-500 border border-slate-600 focus:border-purple-500 focus:outline-none mb-3"
              />

              {providerInfo?.keyUrl && (
                <a
                  href={providerInfo.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline mb-3 inline-block"
                >
                  Obter API key da {providerInfo.label} →
                </a>
              )}

              {/* Base URL para custom ou openai/compatíveis */}
              {(aiProvider === 'custom' || aiProvider === 'openai' || aiProvider === 'deepseek' || aiProvider === 'groq' || aiProvider === 'openrouter' || aiProvider === 'mistral') && (
                <div className="mb-3">
                  <label className="block text-xs text-slate-400 mb-1">Base URL (API Endpoint)</label>
                  <input
                    type="text"
                    placeholder="Base URL (ex: https://api.openai.com/v1)"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-slate-500 border border-slate-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Seletor de modelo */}
              <label className="block text-xs text-slate-400 mb-1">Modelo</label>
              {providerInfo && providerInfo.models.length > 0 ? (
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-purple-500 focus:outline-none mb-4"
                >
                  {providerInfo.models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Nome do modelo (ex: gpt-4o-mini)"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-slate-500 border border-slate-600 focus:border-purple-500 focus:outline-none mb-4"
                />
              )}

              <button
                onClick={handleConfigureAI}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all"
              >
                {isConfigured ? '✅ IA Configurada' : '🔐 Configurar IA'}
              </button>

              {isConfigured && agentExecutor.getCurrentProvider() && (
                <div className="mt-4 p-3 bg-purple-600/20 border border-purple-500 rounded-lg">
                  <p className="text-sm text-purple-300">
                    ✅ Usando <strong>{agentExecutor.getCurrentProvider()!.provider}</strong> ({agentExecutor.getCurrentProvider()!.model})
                  </p>
                </div>
              )}
            </div>

            {/* Seletor de Agente */}
            <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4">🤖 Selecione um Agente</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {ARSENAL_AGENTS.slice(0, 9).map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`p-3 rounded-lg text-left transition-all ${
                      selectedAgent.id === agent.id
                        ? 'bg-purple-600 text-white border-2 border-purple-400'
                        : 'bg-slate-700 text-slate-300 border border-slate-600 hover:border-purple-500'
                    }`}
                  >
                    <span className="text-2xl">{agent.emoji}</span>
                    <div className="font-semibold text-sm mt-1">{agent.name}</div>
                  </button>
                ))}
              </div>

              {selectedAgent && (
                <div className="p-4 bg-slate-700/50 rounded-lg mb-4">
                  <p className="text-white font-semibold">{selectedAgent.name}</p>
                  <p className="text-sm text-slate-300 mt-1">{selectedAgent.description}</p>
                  <p className="text-xs text-purple-300 mt-2">💡 {selectedAgent.useCase}</p>
                </div>
              )}
            </div>

            {/* Input do usuário */}
            <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4">💬 Sua Pergunta/Input</h3>

              <textarea
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder="Digite sua pergunta ou input para o agente..."
                className="w-full h-32 px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-slate-500 border border-slate-600 focus:border-purple-500 focus:outline-none"
              />

              <button
                onClick={handleExecuteAgent}
                disabled={!isConfigured || agentExecutor.isLoading}
                className="w-full mt-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all"
              >
                {agentExecutor.isLoading ? '⏳ Executando...' : '▶️ Executar Agente'}
              </button>
            </div>

            {/* Resultado */}
            {agentExecutor.result && (
              <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-green-500/30">
                <h3 className="text-xl font-bold text-white mb-4">📊 Resultado</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400">Agente:</p>
                    <p className="text-white font-semibold">{agentExecutor.result.agentName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Provedor:</p>
                    <p className="text-purple-300">{agentExecutor.result.provider} ({agentExecutor.result.model})</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Resposta:</p>
                    <div className="bg-slate-700/50 p-4 rounded-lg text-white mt-2 max-h-96 overflow-y-auto">
                      {agentExecutor.result.response}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Tempo: {(agentExecutor.result.duration / 1000).toFixed(2)}s</p>
                  </div>
                </div>
              </div>
            )}

            {agentExecutor.error && (
              <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg">
                <p className="text-red-400">❌ Erro: {agentExecutor.error}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CICLO SEMANAL */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { day: 'Segunda', agents: ['DOUG.EXE 6.0', '$100M MODELS'], task: 'Revisão de estratégia' },
              { day: 'Terça', agents: ['DISSECAÇÃO NEURAL', 'SIMULADOR CLIENTE'], task: 'Pesquisa de cliente' },
              { day: 'Quarta', agents: ['Z4.SYS', 'A CAIXA', 'doug.tensão'], task: 'Produção de copy' },
              { day: 'Quinta', agents: ['STORYADS', 'UGLY COPY'], task: 'Distribuição' },
              { day: 'Sexta', agents: ['FEEDBACK BRUTAL', 'ARSENAL PROMPTS'], task: 'Refinamento' },
            ].map(day => (
              <div key={day.day} className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-purple-500/30">
                <h3 className="text-lg font-bold text-white mb-4">{day.day}</h3>
                <div className="space-y-3">
                  {day.agents.map((agent, idx) => (
                    <div key={idx} className="bg-purple-600/20 p-3 rounded-lg border border-purple-500/50">
                      <p className="text-sm font-semibold text-purple-300">{agent}</p>
                    </div>
                  ))}
                  <div className="bg-slate-700/50 p-3 rounded-lg mt-4 border-l-2 border-purple-500">
                    <p className="text-xs text-slate-400">Task:</p>
                    <p className="text-sm text-white font-semibold">{day.task}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
