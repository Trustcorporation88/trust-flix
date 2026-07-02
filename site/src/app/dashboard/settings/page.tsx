'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { FiBriefcase, FiCpu, FiShoppingBag, FiCreditCard, FiSave } from 'react-icons/fi';

const tabs = [
  { id: 'brand', label: 'Marca', icon: FiBriefcase },
  { id: 'ai', label: 'IA', icon: FiCpu },
  { id: 'sales', label: 'Vendas', icon: FiShoppingBag },
  { id: 'payment', label: 'Pagamento', icon: FiCreditCard },
] as const;

type TabId = (typeof tabs)[number]['id'];

function Field({ label, defaultValue, type = 'text', placeholder }: { label: string; defaultValue?: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('brand');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardShell
      title="Configurações"
      subtitle="Configure marca, IA, vendas e pagamentos"
      actions={
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <FiSave /> {saved ? 'Salvo!' : 'Salvar'}
        </button>
      }
    >
      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <t.icon size={18} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {tab === 'brand' && (
            <div className="space-y-5 max-w-xl">
              <h3 className="text-lg font-semibold text-gray-900">Identidade da Marca</h3>
              <Field label="Nome da empresa" defaultValue="Trust Insta" />
              <Field label="Slogan" defaultValue="Venda, crie e automatize em uma plataforma" />
              <Field label="E-mail de contato" type="email" defaultValue="contato@trustcorp.com.br" />
              <Field label="Cor primária" defaultValue="#2563eb" />
            </div>
          )}
          {tab === 'ai' && (
            <div className="space-y-5 max-w-xl">
              <h3 className="text-lg font-semibold text-gray-900">Configuração de IA</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provedor padrão</label>
                <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  <option>OpenAI (GPT-4)</option>
                  <option>Anthropic (Claude)</option>
                  <option>Google (Gemini)</option>
                </select>
              </div>
              <Field label="API Key" type="password" placeholder="sk-..." />
              <Field label="Tom de voz do bot" defaultValue="Consultivo e direto" />
              <p className="text-xs text-gray-400">As chaves são usadas apenas no seu ambiente. Configure no Arsenal de Agentes para execução real.</p>
            </div>
          )}
          {tab === 'sales' && (
            <div className="space-y-5 max-w-xl">
              <h3 className="text-lg font-semibold text-gray-900">Vendas</h3>
              <Field label="Moeda" defaultValue="BRL (R$)" />
              <Field label="Prazo de expiração do PIX (horas)" type="number" defaultValue="72" />
              <Field label="Mensagem pós-venda" defaultValue="Obrigado pela compra! Seu acesso foi liberado." />
            </div>
          )}
          {tab === 'payment' && (
            <div className="space-y-5 max-w-xl">
              <h3 className="text-lg font-semibold text-gray-900">Pagamentos</h3>
              <Field label="Token Mercado Pago" type="password" placeholder="APP_USR-..." />
              <Field label="Token PushinPay" type="password" placeholder="••••••••" />
              <Field label="Chave PIX padrão" defaultValue="contato@trustcorp.com.br" />
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
