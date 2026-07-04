'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { useCanvasEditor } from '@/hooks/useCanvasEditor';
import { Design } from '@/services/designService';
import { useAgentExecutor } from '@/hooks/useAgentExecutor';

export default function CreatorStudioPage() {
  const [activeTab, setActiveTab] = useState<'editor' | 'templates' | 'library' | 'saved'>('editor');
  const [showNewModal, setShowNewModal] = useState(false);
  const designStore = useDesignStore();
  const [currentDesign, setCurrentDesign] = useState<Design | null>(null);

  // States para o Copiloto IA DOUG.EXE
  const agentExecutor = useAgentExecutor();
  const [selectedCopilotAgent, setSelectedCopilotAgent] = useState('doug-exe-6');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: '🤖 Olá, parceiro da **Trust Insta**! Sou o **DOUG.EXE**, seu estrategista neural de copy e vendas. Escolha um agente abaixo, digite seu produto/nicho e clique em gerar para criar copys de alta conversão! Depois, clique em **Adicionar ao Canvas** para aplicar diretamente no seu post!'
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState('🚀');
  const [mounted, setMounted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const STICKERS = ['🚀', '🔥', '💎', '👑', '✨', '💥', '📦', '💻', '📊', '📈', '🔔', '📢', '👇', '🎯', '💯', '💰'];
  
  // Sempre chamar o hook, mesmo que não use o resultado
  const editor = useCanvasEditor(
    currentDesign || {
      id: 'temp',
      name: 'Novo Design',
      type: 'post' as const,
      width: 1080,
      height: 1350,
      backgroundColor: '#FFFFFF',
      assets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );

  useEffect(() => {
    designStore.loadTemplates();
    designStore.loadSavedDesigns();
  }, []);

  useEffect(() => {
    if (designStore.currentDesign) {
      setCurrentDesign(designStore.currentDesign);
      setActiveTab('editor'); // Sempre foca na aba Editor ao carregar/criar um design
    }
  }, [designStore.currentDesign]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        editor.addAsset({
          id: `asset-${Date.now()}`,
          type: 'image',
          x: 100,
          y: 100,
          width: 880,
          height: 880,
          rotation: 0,
          opacity: 1,
          content: dataUrl,
          zIndex: editor.design.assets.length + 1,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteCopilot = async (customPrompt?: string) => {
    const promptText = (customPrompt || aiPrompt).trim();
    if (!promptText) return;

    setAiMessages(prev => [...prev, { role: 'user', content: promptText }]);
    setAiPrompt('');
    setIsAiLoading(true);

    try {
      const agentId = selectedCopilotAgent;
      const hasConfig = agentExecutor.getCurrentProvider();

      let aiResultText = '';

      if (hasConfig) {
        const systemPrompt = agentId === 'doug-exe-6' ? 'Você é DOUG.EXE, estrategista supremo. Crie uma headline de alta conversão para o post do usuário.' :
                             agentId === '100m-models' ? 'Você é $100M Money Models. Crie uma oferta irresistível no modelo Hormozi.' :
                             agentId === 'a-caixa' ? 'Você é A CAIXA. Crie uma copy persuasiva de alta conversão para feed.' :
                             'Você é STORYADS. Gere um roteiro rápido de 3 stories para vender o produto.';

        const response = await fetch('/api/agents/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: hasConfig.provider,
            apiKey: hasConfig.apiKey,
            model: hasConfig.model,
            baseUrl: hasConfig.baseUrl,
            systemPrompt: systemPrompt,
            userMessage: promptText,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiResultText = data.response;
        } else {
          throw new Error('Falha na resposta do servidor.');
        }
      } else {
        // Fallback inteligente simulado se a chave não estiver configurada
        await new Promise(resolve => setTimeout(resolve, 1200));
        const lowered = promptText.toLowerCase();
        let keyword = "Seu Produto Irresistível";
        
        if (lowered.includes("sapato") || lowered.includes("tenis") || lowered.includes("moda")) {
          keyword = "Seus Sapatos Exclusivos";
        } else if (lowered.includes("curso") || lowered.includes("marketing") || lowered.includes("mentor")) {
          keyword = "Sua Mentoria Premium";
        } else if (lowered.includes("dieta") || lowered.includes("peso") || lowered.includes("fit")) {
          keyword = "Seu Protocolo Fitness";
        } else if (promptText.length > 3) {
          keyword = promptText.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        if (agentId === 'doug-exe-6') {
          aiResultText = `💎 HEADLINE VENCEDORA (DOUG.EXE 6.0)

🌟 "Chega de deixar dinheiro na mesa com processos ultrapassados!"

Sua audiência precisa ver que seu ${keyword} é a única solução lógica para o maior gargalo deles hoje.`;
        } else if (agentId === '100m-models') {
          aiResultText = `💰 OFERTA IRRESISTÍVEL ($100M MODELS)

🎁 Adquira o ${keyword} HOJE e ganhe:
- Bônus 1: Suporte Individual 24/7 (R$ 997)
- Bônus 2: Acesso Vitalício à Comunidade (R$ 497)

🔒 Risco Zero: Garantia Blindada de Satisfação!`;
        } else if (agentId === 'a-caixa') {
          aiResultText = `📦 COPY DE ALTA CONVERSÃO (A CAIXA)

Se você continuar fazendo o que sempre fez, terá os mesmos resultados. O ${keyword} foi desenhado para cortar o caminho e acelerar sua jornada.

👉 Clique no link da bio e garanta agora!`;
        } else {
          aiResultText = `🎬 ROTEIRO DE STORY ADS (STORYADS)

Clipe 1: [Atenção] "Seu negócio está travado e você não sabe o porquê?"
Clipe 2: [Solução] "Apresentamos o ${keyword}, o segredo dos top players."
Clipe 3: [CTA] "Clique no link e garanta sua licença hoje!"`;
        }
      }

      setAiMessages(prev => [...prev, { role: 'assistant', content: aiResultText }]);
    } catch (error) {
      console.error('Erro de IA:', error);
      setAiMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro ao executar a chamada de IA. Verifique suas configurações de API Key no painel DOUG.EXE!' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCreateNew = (type: 'post' | 'story' | 'carousel') => {
    designStore.createNewDesign(`Design ${Date.now()}`, type);
    setShowNewModal(false);
    setActiveTab('editor');
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    await designStore.createFromTemplate(templateId, `Template ${Date.now()}`);
    setActiveTab('editor');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🎨 Creator Studio
              </h1>
              <p className="text-gray-400 text-sm mt-1">Suite completa de criação de conteúdo para Instagram</p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              ✨ Novo Design
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-purple-500/20 bg-black/20 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {(['editor', 'templates', 'library', 'saved'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 font-semibold transition-all border-b-2 ${
                  activeTab === tab
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab === 'editor' && '✏️ Editor'}
                {tab === 'templates' && '📋 Templates'}
                {tab === 'library' && '🎨 Biblioteca'}
                {tab === 'saved' && '💾 Salvos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Editor Tab */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Canvas */}
            <div className="lg:col-span-3">
              <div className="bg-black/40 backdrop-blur border border-purple-500/20 rounded-xl p-6 min-h-[600px] flex items-center justify-center">
                {currentDesign ? (
                  <div className="w-full">
                    {/* Split Layout: Canvas & Controls vs Copiloto DOUG.EXE */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      
                      {/* Left Column: Toolbar + Canvas */}
                      <div className="xl:col-span-2 flex flex-col">
                        {/* Toolbar de Criação Rápida */}
                        <div className="mb-6 bg-black/40 border border-purple-500/20 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-lg">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() =>
                                editor.addAsset({
                                  id: `asset-${Date.now()}`,
                                  type: 'text',
                                  x: 100,
                                  y: 150,
                                  width: 880,
                                  height: 120,
                                  rotation: 0,
                                  opacity: 1,
                                  content: 'Clique para editar o texto',
                                  color: '#000000',
                                  fontSize: 48,
                                  zIndex: editor.design.assets.length + 1,
                                })
                              }
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-md hover:scale-105"
                            >
                              ➕ Texto
                            </button>
                            <button
                              onClick={() =>
                                editor.addAsset({
                                  id: `asset-${Date.now()}`,
                                  type: 'shape',
                                  x: 440,
                                  y: 500,
                                  width: 200,
                                  height: 200,
                                  rotation: 0,
                                  opacity: 1,
                                  color: '#3B82F6',
                                  zIndex: editor.design.assets.length + 1,
                                })
                              }
                              className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-md hover:scale-105"
                            >
                              ➕ Forma
                            </button>

                            {/* Upload de Imagem/Foto real */}
                            <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-md hover:scale-105 cursor-pointer flex items-center gap-1">
                              📷 Inserir Foto
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>

                            {/* Seletor de Adesivos/Stickers */}
                            <div className="flex items-center bg-slate-800/80 px-2 rounded-lg border border-purple-500/30">
                              <span className="text-sm mr-1">✨ Adesivo:</span>
                              <select
                                value={selectedSticker}
                                onChange={(e) => {
                                  const sticker = e.target.value;
                                  setSelectedSticker(sticker);
                                  editor.addAsset({
                                    id: `asset-${Date.now()}`,
                                    type: 'sticker',
                                    x: 440,
                                    y: 440,
                                    width: 200,
                                    height: 200,
                                    rotation: 0,
                                    opacity: 1,
                                    content: sticker,
                                    zIndex: editor.design.assets.length + 1,
                                  });
                                }}
                                className="bg-slate-950 text-white text-sm font-bold p-1 rounded border-0 outline-none cursor-pointer"
                              >
                                {STICKERS.map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-4 items-center flex-wrap">
                            <div className="flex items-center gap-2 bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-500/20">
                              <span className="text-gray-300 text-xs font-semibold">Fundo:</span>
                              <input
                                type="color"
                                value={editor.design.backgroundColor}
                                onChange={(e) => editor.setBackgroundColor(e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => editor.undo()}
                                disabled={!editor.canUndo}
                                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-20 transition-all"
                              >
                                ↩️
                              </button>
                              <button
                                onClick={() => editor.redo()}
                                disabled={!editor.canRedo}
                                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-20 transition-all"
                              >
                                🔁
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Canvas area */}
                        <div className="flex-1 flex items-center justify-center p-4 bg-purple-950/10 border border-purple-500/10 rounded-2xl overflow-auto">
                          <div
                            className="mx-auto bg-white rounded-lg shadow-2xl relative transition-all cursor-default"
                            style={{
                              width: `${editor.design.width * 0.3}px`,
                              height: `${editor.design.height * 0.3}px`,
                              backgroundColor: editor.design.backgroundColor,
                              transform: `scale(${editor?.state.zoom || 1})`,
                              transformOrigin: 'top center',
                            }}
                            onClick={() => editor?.deselect()}
                          >
                            {/* Assets renderizados */}
                            <div className="relative w-full h-full">
                              {editor.design.assets.map((asset) => (
                                <div
                                  key={asset.id}
                                  className={`absolute cursor-move rounded transition-all ${
                                    editor?.state.selectedAssetId === asset.id
                                      ? 'border-2 border-purple-500 ring-2 ring-purple-500/20 z-50'
                                      : 'border border-purple-300/30'
                                  }`}
                                  style={{
                                    left: `${asset.x * 0.3}px`,
                                    top: `${asset.y * 0.3}px`,
                                    width: `${asset.width * 0.3}px`,
                                    height: `${asset.height * 0.3}px`,
                                    transform: `rotate(${asset.rotation}deg)`,
                                    opacity: asset.opacity,
                                    zIndex: asset.zIndex,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation(); // Evita desmarcar
                                    editor?.selectAsset(asset.id);
                                  }}
                                >
                                  {asset.type === 'text' && (
                                    <span
                                      contentEditable={editor?.state.selectedAssetId === asset.id}
                                      suppressContentEditableWarning
                                      onBlur={(e) => {
                                        const text = e.currentTarget.innerText;
                                        editor?.updateAsset(asset.id, { content: text });
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      className={`block w-full h-full flex items-center justify-center overflow-hidden outline-none ${
                                        editor?.state.selectedAssetId === asset.id ? 'cursor-text select-text font-semibold' : 'cursor-move'
                                      }`}
                                      style={{
                                        color: asset.color,
                                        fontSize: `${asset.fontSize ? asset.fontSize * 0.3 : 12}px`,
                                        fontFamily: asset.fontFamily,
                                        lineHeight: '1.2',
                                      }}
                                    >
                                      {asset.content}
                                    </span>
                                  )}
                                  {asset.type === 'image' && asset.content && (
                                    <img
                                      src={asset.content}
                                      alt="Foto Carregada"
                                      className="w-full h-full object-cover pointer-events-none select-none rounded"
                                    />
                                  )}
                                  {asset.type === 'sticker' && asset.content && (
                                    <span className="text-4xl md:text-6xl flex items-center justify-center w-full h-full select-none pointer-events-none">
                                      {asset.content}
                                    </span>
                                  )}
                                  {asset.type === 'shape' && (
                                    <div
                                      className="w-full h-full rounded"
                                      style={{ backgroundColor: asset.color }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

