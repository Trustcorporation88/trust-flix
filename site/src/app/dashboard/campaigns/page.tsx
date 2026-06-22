'use client';

import { DashboardShell, StatCard, StatusBadge } from '@/components/dashboard/DashboardShell';
import { mockCampaigns, formatDate, statusColors } from '@/lib/mockData';
import { Campaign } from '@/types';
import { FiPlus, FiMail, FiMessageCircle } from 'react-icons/fi';

const statusLabels: Record<Campaign['status'], string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  running: 'Ativa',
  completed: 'Concluída',
  paused: 'Pausada',
};

const typeLabels: Record<Campaign['type'], string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  reminder: 'Lembrete',
};

export default function CampaignsPage() {
  const totalSent = mockCampaigns.reduce((s, c) => s + c.sentCount, 0);
  const totalOpened = mockCampaigns.reduce((s, c) => s + c.openedCount, 0);
  const openRate = totalSent ? Math.round((totalOpened / totalSent) * 100) : 0;

  return (
    <DashboardShell
      title="Campanhas"
      subtitle="Marketing por WhatsApp, e-mail e remarketing"
      actions={
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <FiPlus /> Nova Campanha
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard label="Campanhas" value={mockCampaigns.length} icon="📣" />
        <StatCard label="Mensagens Enviadas" value={totalSent} icon="✉️" />
        <StatCard label="Taxa de Abertura" value={`${openRate}%`} icon="👀" />
        <StatCard label="Ativas" value={mockCampaigns.filter((c) => c.status === 'running').length} icon="🔥" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockCampaigns.map((c) => {
          const rate = c.sentCount ? Math.round((c.openedCount / c.sentCount) * 100) : 0;
          return (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.type === 'email' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                    {c.type === 'email' ? <FiMail size={20} /> : <FiMessageCircle size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    <p className="text-xs text-gray-500">{typeLabels[c.type]}</p>
                  </div>
                </div>
                <StatusBadge status={c.status} label={statusLabels[c.status]} colorClass={statusColors[c.status]} />
              </div>
              <p className="text-sm text-gray-600 mb-4">{c.description}</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 italic mb-4">&ldquo;{c.message}&rdquo;</div>
              <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <div>
                  <p className="text-lg font-bold text-gray-900">{c.sentCount}</p>
                  <p className="text-xs text-gray-500">Enviadas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{c.openedCount}</p>
                  <p className="text-xs text-gray-500">Abertas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{c.clickedCount}</p>
                  <p className="text-xs text-gray-500">Cliques</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${rate}%` }}></div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Abertura: {rate}%</span>
                <span>{formatDate(c.startDate)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
