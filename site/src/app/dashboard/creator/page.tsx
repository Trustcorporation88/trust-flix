'use client';

import React, { useState, useEffect } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { useCanvasEditor } from '@/hooks/useCanvasEditor';
import { Design } from '@/services/designService';

export default function CreatorStudioPage() {
  const [activeTab, setActiveTab] = useState<'editor' | 'templates' | 'library' | 'saved'>('editor');
  const [showNewModal, setShowNewModal] = useState(false);
  const designStore = useDesignStore();
  const [currentDesign, setCurrentDesign] = useState<Design | null>(null);
  
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
                    {/* Canvas area */}
                    <div
                      className="mx-auto bg-white rounded-lg shadow-2xl"
                      style={{
                        width: `${currentDesign.width * 0.3}px`,
                        height: `${currentDesign.height * 0.3}px`,
                        backgroundColor: currentDesign.backgroundColor,
                      }}
                    >
                      {/* Assets renderizados */}
                      <div className="relative w-full h-full">
                        {currentDesign.assets.map((asset) => (
                          <div
                            key={asset.id}
                            className={`absolute cursor-move rounded transition-all ${
                              editor?.state.selectedAssetId === asset.id
                                ? 'border-2 border-purple-500'
                                : 'border border-purple-300'
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
                            onClick={() => editor?.selectAsset(asset.id)}
                          >
                            {asset.type === 'text' && (
                              <span
                                className="block w-full h-full flex items-center justify-center overflow-hidden"
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
                            {asset.type === 'shape' && (
                              <div
                                className="w-full h-full"
                                style={{ backgroundColor: asset.color }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="mt-6 flex justify-center gap-3 flex-wrap">
                      <button
                        onClick={() => editor?.zoomOut()}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1 rounded text-sm"
                      >
                        🔍 -
                      </button>
                      <span className="text-gray-400 text-sm px-3 py-1">
                        {Math.round((editor?.state.zoom || 1) * 100)}%
                      </span>
                      <button
                        onClick={() => editor?.zoomIn()}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1 rounded text-sm"
                      >
                        🔍 +
                      </button>
                      <button
                        onClick={() => editor?.resetZoom()}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1 rounded text-sm"
                      >
                        ↺ Reset
                      </button>
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
