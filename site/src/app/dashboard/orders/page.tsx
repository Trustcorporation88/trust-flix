'use client';

import { useState } from 'react';
import { DashboardShell, StatCard, StatusBadge } from '@/components/dashboard/DashboardShell';
import { mockOrders, formatBRL, formatDate, statusColors } from '@/lib/mockData';

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  processing: 'Processando',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const paymentLabels: Record<string, string> = {
  pix: 'PIX',
  mercado_pago: 'Mercado Pago',
  manual: 'Manual',
};

export default function OrdersPage() {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? mockOrders : mockOrders.filter((o) => o.status === filter);
  const totalRevenue = mockOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const pending = mockOrders.filter((o) => o.status === 'pending').length;

  return (
    <DashboardShell title="Pedidos" subtitle="Gestão completa de pedidos e pagamentos">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total de Pedidos" value={mockOrders.length} icon="📦" />
        <StatCard label="Receita" value={formatBRL(totalRevenue)} icon="💰" />
        <StatCard label="Pendentes" value={pending} icon="⏳" />
        <StatCard label="Ticket Médio" value={formatBRL(totalRevenue / mockOrders.length)} icon="🎯" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'pending', 'paid', 'processing', 'delivered', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'Todos' : statusLabels[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-6 py-4 font-medium">Pedido</th>
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">Produto</th>
              <th className="px-6 py-4 font-medium">Pagamento</th>
              <th className="px-6 py-4 font-medium">Total</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{o.id}</td>
                <td className="px-6 py-4 text-gray-600">{o.deliveryAddress.city}/{o.deliveryAddress.state}</td>
                <td className="px-6 py-4 text-gray-600">{o.items[0]?.productName}</td>
                <td className="px-6 py-4 text-gray-600">{paymentLabels[o.paymentMethod]}</td>
                <td className="px-6 py-4 text-gray-900 font-medium">{formatBRL(o.total)}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={o.status} label={statusLabels[o.status]} colorClass={statusColors[o.status]} />
                </td>
                <td className="px-6 py-4 text-gray-500">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  Nenhum pedido neste status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
