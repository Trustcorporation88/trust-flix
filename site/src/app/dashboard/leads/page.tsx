'use client';

import { useState } from 'react';
import { DashboardShell, StatCard, StatusBadge } from '@/components/dashboard/DashboardShell';
import { mockLeads, formatDate, statusColors } from '@/lib/mockData';
import { Lead } from '@/types';

const statusLabels: Record<Lead['status'], string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  customer: 'Cliente',
  lost: 'Perdido',
};

const sourceLabels: Record<Lead['source'], string> = {
  whatsapp: 'WhatsApp',
  website: 'Site',
  campaign: 'Campanha',
  funnel: 'Funil',
  import: 'Importação',
};

const pipeline: Lead['status'][] = ['new', 'contacted', 'qualified', 'customer', 'lost'];

export default function LeadsPage() {
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline');

  const byStatus = (s: Lead['status']) => mockLeads.filter((l) => l.status === s);

  return (
    <DashboardShell
      title="CRM / Leads"
      subtitle="Pipeline de leads e gestão de contatos"
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => setView('pipeline')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'pipeline' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Lista
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total de Leads" value={mockLeads.length} icon="🎯" />
        <StatCard label="Novos" value={byStatus('new').length} icon="✨" />
        <StatCard label="Qualificados" value={byStatus('qualified').length} icon="🔥" />
        <StatCard label="Convertidos" value={byStatus('customer').length} icon="✅" />
      </div>

      {view === 'pipeline' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {pipeline.map((status) => (
            <div key={status} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-semibold text-gray-700">{statusLabels[status]}</span>
                <span className="text-xs bg-white rounded-full px-2 py-0.5 text-gray-500">{byStatus(status).length}</span>
              </div>
              <div className="space-y-2">
                {byStatus(status).map((l) => (
                  <div key={l.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <p className="font-medium text-gray-900 text-sm">{l.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{l.phone}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{sourceLabels[l.source]}</span>
                      {l.tags.slice(0, 1).map((t) => (
                        <span key={t} className="text-[10px] bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {byStatus(status).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Vazio</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-4 font-medium">Lead</th>
                <th className="px-6 py-4 font-medium">Telefone</th>
                <th className="px-6 py-4 font-medium">Origem</th>
                <th className="px-6 py-4 font-medium">Tags</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Criado</th>
              </tr>
            </thead>
            <tbody>
              {mockLeads.map((l) => (
                <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{l.name}</td>
                  <td className="px-6 py-4 text-gray-600">{l.phone}</td>
                  <td className="px-6 py-4 text-gray-600">{sourceLabels[l.source]}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {l.tags.map((t) => (
                        <span key={t} className="text-[10px] bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={l.status} label={statusLabels[l.status]} colorClass={statusColors[l.status]} />
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
