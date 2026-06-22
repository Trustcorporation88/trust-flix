'use client';

import { useState, useEffect } from 'react';
import { FiCalendar, FiImage, FiBarChart2, FiEdit2, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function InstagramPage() {
  const [activeTab, setActiveTab] = useState<'scheduler' | 'analytics' | 'settings'>('scheduler');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    caption: '',
    imageUrl: '',
    scheduledFor: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Aqui vai carregar dados da API
      // const response = await fetch('/api/instagram/posts');
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.caption || !formData.imageUrl) {
      toast.error('Preencha legenda e imagem');
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Implement Instagram scheduling API call
      // const scheduledDateTime = new Date(`${formData.scheduledFor}T${formData.scheduledTime}`);

      // Aqui será a chamada à API
      // const response = await fetch('/api/instagram/schedule', {
      //   method: 'POST',
      //   body: JSON.stringify({ ...formData, scheduledFor: scheduledDateTime })
      // });

      toast.success('Post agendado com sucesso!');
      setFormData({
        caption: '',
        imageUrl: '',
        scheduledFor: new Date().toISOString().split('T')[0],
        scheduledTime: '09:00',
      });
    } catch (error) {
      toast.error('Erro ao agendar post');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">📷</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Instagram Automation</h1>
                <p className="text-gray-600 text-sm">Gerencie sua presença no Instagram</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-8">
            {[
              { id: 'scheduler', label: 'Agendador', icon: FiCalendar },
              { id: 'analytics', label: 'Analytics', icon: FiBarChart2 },
              { id: 'settings', label: 'Configurações', icon: FiEdit2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-4 border-b-2 font-semibold flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Scheduler Tab */}
        {activeTab === 'scheduler' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Agendar Novo Post</h2>

                <form onSubmit={handleSchedulePost} className="space-y-6">
                  {/* Legenda */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Legenda do Post
                    </label>
                    <textarea
                      value={formData.caption}
                      onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                      placeholder="Escreva uma legenda envolvente..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.caption.length} caracteres
                    </p>
                  </div>

                  {/* URL da Imagem */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      URL da Imagem
                    </label>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Data e Hora */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Data
                      </label>
                      <input
                        type="date"
                        value={formData.scheduledFor}
                        onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Hora
                      </label>
                      <input
                        type="time"
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:shadow-lg disabled:opacity-50 font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    {isLoading ? (
                      <>
                        <FiLoader className="animate-spin" size={20} />
                        Agendando...
                      </>
                    ) : (
                      <>
                        <FiCalendar size={20} />
                        Agendar Post
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Preview */}
            <div>
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>
                {formData.imageUrl ? (
                  <div className="space-y-4">
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">{formData.caption}</p>
                    <p className="text-xs text-gray-500">
                      Publicado em: {formData.scheduledFor} às {formData.scheduledTime}
                    </p>
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <FiImage size={40} className="text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Seguidores', value: '12.5K', icon: '👥', change: '+2.3%' },
              { label: 'Engajamento', value: '8.2%', icon: '❤️', change: '+1.1%' },
              { label: 'Alcance', value: '45.8K', icon: '📊', change: '+5.4%' },
              { label: 'Impressões', value: '156K', icon: '👀', change: '+12%' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{stat.icon}</span>
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                    {stat.change}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Configurações</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Access Token
                </label>
                <input
                  type="password"
                  placeholder="Cole seu Access Token do Meta"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  🔒 Nunca compartilhe seu token. Ele é salvo criptografado.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  ID da Conta Instagram
                </label>
                <input
                  type="text"
                  placeholder="123456789"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-semibold">
                Salvar Configurações
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
