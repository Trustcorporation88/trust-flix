'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDesignStore } from '@/stores/designStore';
import { useCanvasEditor } from '@/hooks/useCanvasEditor';
import { Design } from '@/services/designService';
import { useAgentExecutor } from '@/hooks/useAgentExecutor';
import { saveContentDraft } from '@/lib/contentDraft';
import toast from 'react-hot-toast';

export default function CreatorStudioPage() {
  const router = useRouter();
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
      content: '🤖 Olá, parceiro da **Social Flow**! Sou o **DOUG.EXE**, seu estrategista neural de copy e vendas. Escolha um agente abaixo, digite seu produto/nicho e clique em gerar para criar copys de alta conversão! Depois, clique em **Adicionar ao Canvas** para aplicar diretamente no seu post!'
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
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Creator Studio
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Crie o visual e envie a copy para o Content Studio publicar
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/5"
              >
                ← Painel
              </Link>
              <button
                type="button"
                onClick={() => {
                  const lastAssistant = [...aiMessages].reverse().find((m) => m.role === 'assistant');
                  const text = lastAssistant?.content?.replace(/\*\*/g, '') || '';
                  if (!text || text.includes('Sou o **DOUG')) {
                    toast.error('Gere uma copy no copiloto antes de enviar');
                    return;
                  }
                  saveContentDraft({ caption: text, source: 'Creator Studio' });
                  toast.success('Copy enviada ao Content Studio');
                  router.push('/dashboard/content-studio');
                }}
                className="rounded-lg bg-signal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-signal-600"
              >
                Usar copy no Content Studio
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Novo Design
              </button>
            </div>
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

                        {/* Controls */}
                        <div className="mt-4 flex justify-center gap-3 items-center">
                          <button
                            onClick={() => editor?.zoomOut()}
                            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1 rounded text-sm font-bold"
                          >
                            🔍 -
                          </button>
                          <span className="text-gray-400 text-sm px-3 py-1 font-bold">
                            {Math.round((editor?.state.zoom || 1) * 100)}%
                          </span>
                          <button
                            onClick={() => editor?.zoomIn()}
                            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1 rounded text-sm font-bold"
                          >
                            🔍 +
                          </button>
                          <button
                            onClick={() => editor?.resetZoom()}
                            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1 rounded text-sm font-bold"
                          >
                            ↺ Reset
                          </button>
                        </div>
                      </div>

                      {/* Right Column: DOUG.EXE AI Copywriting Copilot */}
                      <div className="xl:col-span-1 bg-slate-950/80 border border-purple-500/30 rounded-2xl p-4 flex flex-col justify-between min-h-[550px] shadow-2xl relative">
                        <div>
                          <div className="flex items-center justify-between border-b border-purple-500/20 pb-3 mb-3">
                            <h3 className="font-bold text-white flex items-center gap-2 text-md">
                              🤖 Copiloto Copy DOUG.EXE
                            </h3>
                            <span className="bg-purple-600/30 text-purple-300 text-xs px-2 py-0.5 rounded-full font-bold">
                              {mounted && agentExecutor.getCurrentProvider() ? 'Conectado' : 'Modo Livre'}
                            </span>
                          </div>

                          {/* Seletor de Agente de Copy */}
                          <div className="mb-3">
                            <label className="text-xs text-purple-300 block mb-1">Agente de Redação:</label>
                            <select
                              value={selectedCopilotAgent}
                              onChange={(e) => setSelectedCopilotAgent(e.target.value)}
                              className="w-full bg-slate-900 border border-purple-500/30 rounded px-2 py-1 text-xs text-white outline-none focus:border-purple-500"
                            >
                              <option value="doug-exe-6">DOUG.EXE 6.0 (Estrategista e Headlines)</option>
                              <option value="100m-models">$100M MODELS (Oferta Alex Hormozi)</option>
                              <option value="a-caixa">A CAIXA (Gatilhos Psicológicos)</option>
                              <option value="storyads">STORYADS (Roteiro Stories/Reels)</option>
                            </select>
                          </div>

                          {mounted && !agentExecutor.getCurrentProvider() && (
                            <div className="mb-3 text-[10px] leading-relaxed bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg p-2">
                              ⚡ <strong>Modo Livre:</strong> respostas de exemplo. Para gerar copy real com IA (OpenAI, Gemini, Groq, Claude...),{' '}
                              <a href="/dashboard/agents" className="underline font-bold hover:text-amber-100">
                                conecte sua API key na aba Agentes
                              </a>.
                            </div>
                          )}

                          {/* Chat Messages */}
                          <div className="space-y-3 max-h-72 overflow-y-auto mb-3 p-2 bg-black/40 rounded-xl border border-purple-500/10 min-h-[220px]">
                            {aiMessages.map((msg, index) => (
                              <div
                                key={index}
                                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                              >
                                <span className="text-[10px] text-gray-500 mb-0.5 px-1">
                                  {msg.role === 'user' ? 'Você' : 'DOUG.EXE'}
                                </span>
                                <div
                                  className={`p-2.5 rounded-lg text-xs leading-relaxed max-w-[90%] whitespace-pre-line ${
                                    msg.role === 'user'
                                      ? 'bg-purple-600 text-white rounded-tr-none'
                                      : 'bg-slate-800 text-gray-200 rounded-tl-none border border-purple-500/20'
                                  }`}
                                >
                                  {msg.content}

                                  {/* Actions for Assistant Message */}
                                  {msg.role === 'assistant' && index > 0 && (
                                    <div className="flex gap-1.5 mt-2 pt-2 border-t border-purple-500/20">
                                      <button
                                        onClick={() => {
                                          editor.addAsset({
                                            id: `asset-${Date.now()}`,
                                            type: 'text',
                                            x: 80,
                                            y: 200,
                                            width: 900,
                                            height: 250,
                                            rotation: 0,
                                            opacity: 1,
                                            content: msg.content.replace(/^[^\s]+/, '').trim(), // Remove header decorativo se houver
                                            color: '#000000',
                                            fontSize: 32,
                                            zIndex: editor.design.assets.length + 1,
                                          });
                                        }}
                                        className="bg-purple-600/40 hover:bg-purple-600/70 text-purple-200 text-[10px] font-bold px-2 py-1 rounded transition-all"
                                      >
                                        ➕ Adicionar ao Canvas
                                      </button>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(msg.content);
                                          alert('✅ Copy copiada para a área de transferência!');
                                        }}
                                        className="bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-1 rounded transition-all"
                                      >
                                        📋 Copiar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {isAiLoading && (
                              <div className="text-xs text-purple-400 italic animate-pulse p-2">
                                ⏳ DOUG.EXE está gerando sua copy estratégica...
                              </div>
                            )}
                            <div ref={chatEndRef} />
                          </div>
                        </div>

                        {/* Input Area + Quick Prompt Buttons */}
                        <div>
                          {/* Quick Prompt Sugesters */}
                          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
                            <button
                              onClick={() => {
                                handleExecuteCopilot('Crie uma Headline Suprema de Vendas Alex Hormozi para meu nicho');
                              }}
                              className="bg-purple-950/60 hover:bg-purple-900 border border-purple-500/20 text-purple-300 text-[10px] px-2 py-1 rounded-full whitespace-nowrap transition-all"
                            >
                              📝 Headline Suprema
                            </button>
                            <button
                              onClick={() => {
                                handleExecuteCopilot('Estruture os Bônus de Alta Conversão para meu produto');
                              }}
                              className="bg-purple-950/60 hover:bg-purple-900 border border-purple-500/20 text-purple-300 text-[10px] px-2 py-1 rounded-full whitespace-nowrap transition-all"
                            >
                              🔥 Stack de Bônus
                            </button>
                            <button
                              onClick={() => {
                                handleExecuteCopilot('Crie uma CTA persuasiva direcionando para a DM ou link');
                              }}
                              className="bg-purple-950/60 hover:bg-purple-900 border border-purple-500/20 text-purple-300 text-[10px] px-2 py-1 rounded-full whitespace-nowrap transition-all"
                            >
                              👉 CTA de Alta Conversão
                            </button>
                          </div>

                          <div className="flex gap-2">
                            <textarea
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleExecuteCopilot();
                                }
                              }}
                              placeholder="Nicho, dor ou produto..."
                              className="flex-1 bg-slate-900 border border-purple-500/30 text-white rounded px-2 py-1.5 text-xs outline-none focus:border-purple-500 resize-none h-12"
                            />
                            <button
                              onClick={() => handleExecuteCopilot()}
                              disabled={isAiLoading}
                              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold px-3.5 rounded text-xs transition-all disabled:opacity-40"
                            >
                              Enviar
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-400 mb-4">Nenhum design aberto</p>
                    <button
                      onClick={() => setShowNewModal(true)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg"
                    >
                      Criar Novo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Properties */}
            <div className="lg:col-span-1">
              <div className="bg-black/40 backdrop-blur border border-purple-500/20 rounded-xl p-4 sticky top-32">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  ⚙️ Propriedades
                </h3>

                {currentDesign && editor?.selectedAsset ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-400 text-sm">Tipo</label>
                      <p className="text-white font-semibold">{editor.selectedAsset.type}</p>
                    </div>

                    {editor.selectedAsset.type === 'text' && (
                      <>
                        <div>
                          <label className="text-gray-400 text-sm block mb-1">Texto</label>
                          <input
                            type="text"
                            value={editor.selectedAsset.content || ''}
                            onChange={(e) =>
                              editor.updateAsset(editor.selectedAsset!.id, {
                                content: e.target.value,
                              })
                            }
                            className="w-full bg-purple-900/30 text-white border border-purple-500/30 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm block mb-1">Cor</label>
                          <input
                            type="color"
                            value={editor.selectedAsset.color || '#000000'}
                            onChange={(e) =>
                              editor.updateAsset(editor.selectedAsset!.id, {
                                color: e.target.value,
                              })
                            }
                            className="w-full h-8 cursor-pointer rounded"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm block mb-1">Tamanho</label>
                          <input
                            type="number"
                            value={editor.selectedAsset.fontSize || 24}
                            onChange={(e) =>
                              editor.updateAsset(editor.selectedAsset!.id, {
                                fontSize: parseInt(e.target.value),
                              })
                            }
                            className="w-full bg-purple-900/30 text-white border border-purple-500/30 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm block mb-1">Fonte</label>
                          <select
                            value={editor.selectedAsset.fontFamily || 'Arial'}
                            onChange={(e) =>
                              editor.updateAsset(editor.selectedAsset!.id, {
                                fontFamily: e.target.value,
                              })
                            }
                            className="w-full bg-purple-900/30 text-white border border-purple-500/30 rounded px-2 py-1 text-sm"
                          >
                            <option value="Arial">Arial</option>
                            <option value="Impact">Impact</option>
                            <option value="'Poppins', sans-serif">Poppins</option>
                            <option value="'Montserrat', sans-serif">Montserrat</option>
                            <option value="'Bebas Neue', sans-serif">Bebas Neue</option>
                            <option value="'Playfair Display', serif">Playfair Display</option>
                          </select>
                        </div>
                      </>
                    )}

                    {editor.selectedAsset.type === 'shape' && (
                      <div>
                        <label className="text-gray-400 text-sm block mb-1">Cor</label>
                        <input
                          type="color"
                          value={editor.selectedAsset.color || '#FFFFFF'}
                          onChange={(e) =>
                            editor.updateAsset(editor.selectedAsset!.id, {
                              color: e.target.value,
                            })
                          }
                          className="w-full h-8 cursor-pointer rounded"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-gray-400 text-sm block mb-1">Opacidade</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={(editor.selectedAsset.opacity || 1) * 100}
                        onChange={(e) =>
                          editor.updateAsset(editor.selectedAsset!.id, {
                            opacity: parseInt(e.target.value) / 100,
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-2 border-t border-purple-500/20">
                      <button
                        onClick={() => editor.duplicateAsset(editor.selectedAsset!.id)}
                        className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-2 rounded text-sm transition-all"
                      >
                        📋 Duplicar
                      </button>
                      <button
                        onClick={() => editor.removeAsset(editor.selectedAsset!.id)}
                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded text-sm transition-all"
                      >
                        🗑️ Deletar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Selecione um elemento para editar</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {designStore.templates.map((template) => (
              <div
                key={template.id}
                className="bg-black/40 backdrop-blur border border-purple-500/20 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all group cursor-pointer"
              >
                <div className="h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <span className="text-4xl">{template.category === 'post' ? '📄' : template.category === 'story' ? '📖' : '🎠'}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white">{template.name}</h3>
                  <p className="text-gray-400 text-sm">{template.description}</p>
                  <button
                    onClick={() => handleCreateFromTemplate(template.id)}
                    className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded font-semibold hover:shadow-lg transition-all"
                  >
                    Usar Modelo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="bg-black/40 backdrop-blur border border-purple-500/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">📚 Biblioteca de Assets</h2>
            <p className="text-gray-400 mb-6">
              Suas bibliotecas de assets estão no Google Drive. Clique para acessar:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: '📇', name: 'Cartões Digitais', url: 'https://drive.google.com/drive/u/0/folders/1EyH390UjMEWbV-Kw35nFTXs6_mClEYGy' },
                { icon: '🔷', name: 'Shapes', url: 'https://drive.google.com/drive/u/0/folders/1Yrt_k6wzchzssxPzs5ZJhSHLLSqEa_TH' },
                { icon: '🎯', name: 'Ícones', url: 'https://drive.google.com/drive/u/0/folders/1yOoGdU0KFPhLWW4PxZSi6qzo8q7oChZ3' },
                { icon: '🎀', name: 'Fitas PNG', url: 'https://drive.google.com/drive/u/0/folders/1RclSmk5aU31ZfEURV3TD09j_gPw9f-WM' },
                { icon: '✨', name: 'Stickers PNG', url: 'https://drive.google.com/drive/u/0/folders/1AiClIzRW6-QPkSgEj3sHOvLSaQCp_681' },
                { icon: '🎨', name: 'Texturas', url: 'https://drive.google.com/drive/u/0/folders/1aa5Sw_g90Dwn5mFmeqW4-0m5MLm6wKFJ' },
                { icon: '❓', name: 'Perguntas Stories', url: 'https://drive.google.com/drive/u/0/folders/17K3UeTvQqmUjH6A_RDz3IKhlzQVro_rL' },
                { icon: '😊', name: 'Emojis e Selos', url: 'https://drive.google.com/drive/u/0/folders/1Hki3_bYXHP2x6ugqKtnJMX70Dk-WYZ36' },
              ].map((lib) => (
                <a
                  key={lib.name}
                  href={lib.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all group"
                >
                  <div className="text-4xl mb-3">{lib.icon}</div>
                  <h3 className="font-bold text-white group-hover:text-purple-300 transition-all">
                    {lib.name}
                  </h3>
                  <p className="text-gray-400 text-sm mt-2">Acessar →</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Saved Designs Tab */}
        {activeTab === 'saved' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {designStore.savedDesigns.length > 0 ? (
              designStore.savedDesigns.map((design) => (
                <div
                  key={design.id}
                  className="bg-black/40 backdrop-blur border border-purple-500/20 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all"
                >
                  <div className="h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <span className="text-2xl">
                      {design.type === 'post' && '📄'}
                      {design.type === 'story' && '📖'}
                      {design.type === 'carousel' && '🎠'}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white">{design.name}</h3>
                    <p className="text-gray-400 text-sm">
                      {design.assets.length} elementos
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          designStore.loadDesign(design.id);
                          setActiveTab('editor');
                        }}
                        className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 py-2 rounded text-sm transition-all"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => designStore.exportDesign(design.id)}
                        className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 rounded text-sm transition-all"
                      >
                        Export
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400">Nenhum design salvo ainda</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* New Design Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-6">Novo Design</h2>
            <p className="text-gray-400 mb-6">Escolha o tipo de conteúdo:</p>

            <div className="space-y-3">
              {[
                { icon: '📄', name: 'Post', type: 'post' as const, desc: '1080x1350px' },
                { icon: '📖', name: 'Story', type: 'story' as const, desc: '1080x1920px' },
                { icon: '🎠', name: 'Carrossel', type: 'carousel' as const, desc: '1080x1350px' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleCreateNew(item.type)}
                  className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500/60 rounded-lg p-4 text-left transition-all hover:shadow-lg hover:shadow-purple-500/20 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <h3 className="font-bold text-white group-hover:text-purple-300">{item.name}</h3>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                    <span className="text-2xl">→</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowNewModal(false)}
              className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-semibold transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
