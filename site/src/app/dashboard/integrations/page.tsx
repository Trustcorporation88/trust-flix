'use client';

import { useState } from 'react';
import { DashboardShell, StatCard, StatusBadge } from '@/components/dashboard/DashboardShell';
import { mockIntegrations, formatDate, statusColors } from '@/lib/mockData';
import { Integration } from '@/types';
import { FiLink, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';

const statusLabels: Record<Integration['status'], string> = {
  active: 'Conectado',
  inactive: 'Desconectado',
  error: 'Erro',
};

const typeIcons: Record<string, string> = {
  evolution_api: '🟢',
  mercado_pago: '💳',
  pushinpay: '⚡',
  zapier: '🔗',
  custom: '🛠️',
};

const typeDescriptions: Record<string, string> = {
  evolution_api: 'Conexão WhatsApp via Evolution API para envio e recebimento de mensagens.',
  mercado_pago: 'Processamento de pagamentos via cartão, boleto e PIX.',
  pushinpay: 'Geração de cobranças PIX instantâneas com confirmação automática.',
  zapier: 'Conecte o JetFlix a mais de 5000 aplicativos.',
  custom: 'Integração customizada via webhook.',
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);

  const toggle = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: i.status === 'active' ? 'inactive' : 'active' } : i
      )
    );
  };

  const active = integrations.filter((i) => i.status === 'active').length;

  return (
    <DashboardShell title="Integrações" subtitle="Conexões com APIs externas e webhooks">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard label="Integrações" value={integrations.length} icon="🔌" />
        <StatCard label="Conectadas" value={active} icon="✅" />
        <StatCard label="Inativas" value={integrations.length - active} icon="⚪" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((i) => (
          <div key={i.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{typeIcons[i.type]}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{i.name}</h3>
                  <StatusBadge status={i.status} label={statusLabels[i.status]} colorClass={statusColors[i.status]} />
                </div>
              </div>
              {i.status === 'active' ? (
                <FiCheckCircle className="text-green-500" size={22} />
              ) : (
                <FiXCircle className="text-gray-300" size={22} />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-4">{typeDescriptions[i.type]}</p>

            {Object.keys(i.config).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1">
                {Object.entries(i.config).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-gray-500">{k}</span>
                    <span className="text-gray-800 font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                {i.lastSync ? (
                  <>
                    <FiRefreshCw size={12} /> Sincronizado {formatDate(i.lastSync)}
                  </>
                ) : (
                  'Nunca sincronizado'
                )}
              </span>
              <button
                onClick={() => toggle(i.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  i.status === 'active'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <FiLink size={14} />
                {i.status === 'active' ? 'Desconectar' : 'Conectar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
