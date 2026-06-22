'use client';

import { useState } from 'react';
import { DashboardShell, StatCard, StatusBadge } from '@/components/dashboard/DashboardShell';
import { mockAutomations, formatDate, statusColors } from '@/lib/mockData';
import { Automation } from '@/types';
import { FiPlus, FiZap, FiArrowRight } from 'react-icons/fi';

const triggerLabels: Record<string, string> = {
  new_lead: 'Novo lead captado',
  new_order: 'Novo pedido criado',
  payment_received: 'Pagamento confirmado',
  abandoned_cart: 'Carrinho abandonado',
  time_based: 'Baseado em tempo',
};

const actionLabels: Record<string, string> = {
  send_message: 'Enviar mensagem',
  send_email: 'Enviar e-mail',
  create_task: 'Criar tarefa',
  update_lead: 'Atualizar lead',
  trigger_webhook: 'Disparar webhook',
};

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations);

  const toggle = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' } : a
      )
    );
  };

  const active = automations.filter((a) => a.status === 'active').length;

  return (
    <DashboardShell
      title="Automações"
      subtitle="Engine de automações persistentes — gatilhos e ações"
      actions={
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <FiPlus /> Nova Automação
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard label="Automações" value={automations.length} icon="⚡" />
        <StatCard label="Ativas" value={active} icon="🟢" />
        <StatCard label="Inativas" value={automations.length - active} icon="⚪" />
      </div>

      <div className="space-y-4">
        {automations.map((a) => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <FiZap size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{a.name}</h3>
                  <p className="text-sm text-gray-500">{a.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={a.status}
                  label={a.status === 'active' ? 'Ativa' : 'Inativa'}
                  colorClass={statusColors[a.status]}
                />
                <button
                  onClick={() => toggle(a.id)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${a.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${a.status === 'active' ? 'translate-x-5' : ''}`}
                  ></span>
                </button>
              </div>
            </div>

            {/* Flow */}
            <div className="flex items-center gap-2 flex-wrap bg-gray-50 rounded-lg p-3">
              <span className="text-xs font-semibold text-purple-700 bg-purple-100 rounded-md px-2.5 py-1">
                QUANDO: {triggerLabels[a.trigger.type]}
              </span>
              {a.actions.map((act, i) => (
                <span key={i} className="flex items-center gap-2">
                  <FiArrowRight className="text-gray-400" size={14} />
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 rounded-md px-2.5 py-1">
                    {actionLabels[act.type]}
                  </span>
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Atualizada em {formatDate(a.updatedAt)}</p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
