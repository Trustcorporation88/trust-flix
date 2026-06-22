'use client';

import { useState } from 'react';
import { DashboardShell, StatCard } from '@/components/dashboard/DashboardShell';
import { FiSmartphone, FiRefreshCw, FiCheckCircle, FiPower } from 'react-icons/fi';

type ConnState = 'disconnected' | 'connecting' | 'connected';

export default function WhatsAppPage() {
  const [state, setState] = useState<ConnState>('connected');

  const handleConnect = () => {
    setState('connecting');
    setTimeout(() => setState('connected'), 2500);
  };

  return (
    <DashboardShell title="Conexão WhatsApp" subtitle="Gerencie a conexão do bot via Evolution API / whatsapp-web.js">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard label="Status" value={state === 'connected' ? 'Online' : state === 'connecting' ? 'Conectando' : 'Offline'} icon={state === 'connected' ? '🟢' : '🔴'} />
        <StatCard label="Mensagens Hoje" value={state === 'connected' ? 248 : 0} icon="💬" />
        <StatCard label="Conversas Ativas" value={state === 'connected' ? 17 : 0} icon="👥" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection / QR */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-center">
          {state === 'connected' ? (
            <>
              <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                <FiCheckCircle size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">WhatsApp Conectado</h3>
              <p className="text-gray-500 text-sm mb-1">Instância: <span className="font-mono">jetbot-main</span></p>
              <p className="text-gray-500 text-sm mb-6">Número: +55 11 99999-0000</p>
              <button
                onClick={() => setState('disconnected')}
                className="flex items-center gap-2 bg-red-50 text-red-600 px-5 py-2.5 rounded-lg font-medium hover:bg-red-100"
              >
                <FiPower /> Desconectar
              </button>
            </>
          ) : state === 'connecting' ? (
            <>
              <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-4 animate-pulse">
                <FiRefreshCw className="text-gray-400 animate-spin" size={48} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Gerando QR Code...</h3>
              <p className="text-gray-500 text-sm mt-1">Aguarde a autenticação</p>
            </>
          ) : (
            <>
              {/* Simulated QR */}
              <div className="w-48 h-48 bg-white border-4 border-gray-900 rounded-lg p-2 mb-4 grid grid-cols-8 gap-0.5">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? 'bg-gray-900' : 'bg-white'}`}></div>
                ))}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Escaneie o QR Code</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-xs">
                Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho
              </p>
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700"
              >
                <FiSmartphone /> Gerar novo QR
              </button>
            </>
          )}
        </div>

        {/* User states */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estados dos Usuários</h3>
          <p className="text-sm text-gray-500 mb-4">Distribuição das conversas no funil de atendimento.</p>
          <div className="space-y-4">
            {[
              { label: 'Aguardando resposta', count: 5, color: 'bg-yellow-500', pct: 20 },
              { label: 'Em negociação', count: 8, color: 'bg-blue-500', pct: 32 },
              { label: 'Pagamento pendente', count: 3, color: 'bg-orange-500', pct: 12 },
              { label: 'Finalizados hoje', count: 9, color: 'bg-green-500', pct: 36 },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{s.label}</span>
                  <span className="font-medium text-gray-900">{s.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${s.color} h-2 rounded-full`} style={{ width: `${s.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Backend de mensagens</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Provedor</span>
                <span className="text-gray-900 font-medium">Evolution API</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fallback</span>
                <span className="text-gray-900 font-medium">whatsapp-web.js</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Webhook</span>
                <span className="text-green-600 font-medium">Ativo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
