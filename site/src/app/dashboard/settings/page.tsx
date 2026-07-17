'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  AIExecutorConfig,
  AIProvider,
  PROVIDERS,
  getProvider,
  aiExecutor,
} from '@/services/aiExecutor';
import { FiBriefcase, FiCpu, FiSave, FiTrash2, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

const BRAND_KEY = 'sf_brand_settings';

const tabs = [
  { id: 'ai', label: 'IA', icon: FiCpu },
  { id: 'brand', label: 'Marca', icon: FiBriefcase },
] as const;

type TabId = (typeof tabs)[number]['id'];

interface BrandSettings {
  name: string;
  slogan: string;
  email: string;
  nicho: string;
  tone: string;
}

const defaultBrand: BrandSettings = {
  name: 'SocialFlow',
  slogan: 'Crie, publique e venda no mesmo ritmo',
  email: '',
  nicho: '',
  tone: 'Consultivo e direto',
};

function defaultBaseUrl(id: AIProvider): string {
  if (id === 'openai') return 'https://api.openai.com/v1';
  if (id === 'deepseek') return 'https://api.deepseek.com/v1';
  if (id === 'groq') return 'https://api.groq.com/openai/v1';
  if (id === 'mistral') return 'https://api.mistral.ai/v1';
  if (id === 'openrouter') return 'https://openrouter.ai/api/v1';
  return '';
}

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('ai');
  const [brand, setBrand] = useState<BrandSettings>(defaultBrand);

  const [aiProvider, setAiProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(getProvider('openai')?.defaultModel || '');
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl('openai'));
  const [isConfigured, setIsConfigured] = useState(false);

  const providerInfo = getProvider(aiProvider);

  useEffect(() => {
    const saved = aiExecutor.getCurrentProvider();
    if (saved) {
      setAiProvider(saved.provider);
      setApiKey(saved.apiKey);
      setModel(saved.model);
      setBaseUrl(saved.baseUrl || defaultBaseUrl(saved.provider));
      setIsConfigured(true);
    }
    try {
      const raw = localStorage.getItem(BRAND_KEY);
      if (raw) setBrand({ ...defaultBrand, ...JSON.parse(raw) });
    } catch {
      // ignore
    }
  }, []);

  const handleSelectProvider = (id: AIProvider) => {
    setAiProvider(id);
    setModel(getProvider(id)?.defaultModel || '');
    setBaseUrl(defaultBaseUrl(id));
    setIsConfigured(false);
  };

  const handleSaveAi = () => {
    if (!apiKey.trim()) {
      toast.error('Informe a API key');
      return;
    }
    if (!model.trim()) {
      toast.error('Informe o modelo');
      return;
    }
    if ((aiProvider === 'custom' || aiProvider === 'openai') && !baseUrl.trim()) {
      toast.error('Informe a Base URL');
      return;
    }

    const config: AIExecutorConfig = {
      provider: aiProvider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
    };
    aiExecutor.configure(config);
    setIsConfigured(true);
    toast.success('IA salva — Agentes e Content Studio usam esta config');
  };

  const handleClearAi = () => {
    aiExecutor.reset();
    setApiKey('');
    setIsConfigured(false);
    toast.success('Configuração de IA removida');
  };

  const handleSaveBrand = () => {
    localStorage.setItem(BRAND_KEY, JSON.stringify(brand));
    toast.success('Marca salva neste navegador');
  };

  return (
    <DashboardShell
      title="Configurações"
      subtitle="IA e marca — o que os Agentes usam de verdade"
      actions={
        tab === 'ai' ? (
          <button
            onClick={handleSaveAi}
            className="flex items-center gap-2 rounded-lg bg-signal-500 px-4 py-2 text-sm font-medium text-white hover:bg-signal-600"
          >
            <FiSave /> {isConfigured ? 'Atualizar IA' : 'Salvar IA'}
          </button>
        ) : (
          <button
            onClick={handleSaveBrand}
            className="flex items-center gap-2 rounded-lg bg-signal-500 px-4 py-2 text-sm font-medium text-white hover:bg-signal-600"
          >
            <FiSave /> Salvar marca
          </button>
        )
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-56">
          <div className="space-y-1 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-ink-950 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <t.icon size={18} />
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            Vendas, pagamentos e WhatsApp ainda não estão conectados — por isso sumiram do menu.
          </p>
        </div>

        <div className="flex-1 rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          {tab === 'ai' && (
            <div className="max-w-xl space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Provedor de IA</h3>
                <p className="mt-1 text-sm text-gray-500">
                  A chave fica só neste navegador e é enviada ao servidor na hora de executar um
                  agente. Mesma config usada em{' '}
                  <Link href="/dashboard/agents" className="text-signal-600 underline">
                    Agentes IA
                  </Link>
                  .
                </p>
              </div>

              {isConfigured && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Ativo: <strong>{aiProvider}</strong> · {model}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProvider(p.id)}
                    className={`rounded-lg px-2 py-2.5 text-left text-xs font-semibold transition-all sm:text-sm ${
                      aiProvider === p.id
                        ? 'bg-ink-950 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-1">{p.emoji}</span>
                    {p.label.replace(/ \(.*\)/, '')}
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setIsConfigured(false);
                  }}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
                />
                {providerInfo?.keyUrl && (
                  <a
                    href={providerInfo.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-signal-600 hover:underline"
                  >
                    Obter API key <FiExternalLink size={12} />
                  </a>
                )}
              </div>

              {(aiProvider === 'custom' ||
                aiProvider === 'openai' ||
                aiProvider === 'deepseek' ||
                aiProvider === 'groq' ||
                aiProvider === 'openrouter' ||
                aiProvider === 'mistral') && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Base URL</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => {
                      setBaseUrl(e.target.value);
                      setIsConfigured(false);
                    }}
                    placeholder="https://api.openai.com/v1"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Modelo</label>
                {providerInfo && providerInfo.models.length > 0 ? (
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setIsConfigured(false);
                    }}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
                  >
                    {providerInfo.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setIsConfigured(false);
                    }}
                    placeholder="nome-do-modelo"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
                  />
                )}
              </div>

              {isConfigured && (
                <button
                  type="button"
                  onClick={handleClearAi}
                  className="inline-flex items-center gap-2 text-sm text-red-600 hover:underline"
                >
                  <FiTrash2 /> Remover chave deste navegador
                </button>
              )}
            </div>
          )}

          {tab === 'brand' && (
            <div className="max-w-xl space-y-5">
              <h3 className="text-lg font-semibold text-gray-900">Identidade da marca</h3>
              <p className="text-sm text-gray-500">
                Salvo neste navegador. Nicho e tom ajudam a pré-preencher o Content Studio.
              </p>
              {(
                [
                  ['name', 'Nome', 'text'],
                  ['slogan', 'Slogan', 'text'],
                  ['email', 'E-mail', 'email'],
                  ['nicho', 'Nicho padrão', 'text'],
                  ['tone', 'Tom de voz', 'text'],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
                  <input
                    type={type}
                    value={brand[key]}
                    onChange={(e) => setBrand((b) => ({ ...b, [key]: e.target.value }))}
                    placeholder={key === 'nicho' ? 'ex: estética, fitness' : undefined}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
