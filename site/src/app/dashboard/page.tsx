'use client';

import { DashboardShell, StatCard, StatusBadge } from '@/components/dashboard/DashboardShell';
import Link from 'next/link';
import {
  mockStats,
  mockSalesByDay,
  mockTopProducts,
  mockOrders,
  formatBRL,
  formatDate,
  statusColors,
} from '@/lib/mockData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { FiCpu, FiEdit3, FiInstagram } from 'react-icons/fi';

const shortcuts = [
  { icon: FiCpu, label: 'Agentes IA', href: '/dashboard/agents', color: 'from-purple-500 to-indigo-600' },
  { icon: FiEdit3, label: 'Creator Studio', href: '/dashboard/creator', color: 'from-pink-500 to-rose-600' },
  { icon: FiInstagram, label: 'Instagram', href: '/dashboard/instagram', color: 'from-blue-500 to-cyan-600' },
];

export default function DashboardPage() {
  return (
    <DashboardShell title="Dashboard" subtitle="Visão geral do seu negócio em tempo real">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard label="Receita Total" value={formatBRL(mockStats.totalRevenue)} icon="💰" trend="+18% no mês" />
        <StatCard label="Pedidos" value={mockStats.totalOrders} icon="📦" trend={`${mockStats.pendingOrders} pendentes`} />
        <StatCard label="Clientes" value={mockStats.totalCustomers} icon="👥" trend="+12 novos" />
        <StatCard label="Taxa de Conversão" value={`${mockStats.conversionRate}%`} icon="📈" trend={`Ticket ${formatBRL(mockStats.avgOrderValue)}`} />
      </div>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`bg-gradient-to-r ${s.color} text-white rounded-xl p-5 flex items-center gap-4 hover:opacity-90 transition-opacity`}
          >
            <s.icon size={28} />
            <span className="font-semibold text-lg">{s.label}</span>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita por Dia</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={mockSalesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Line type="monotone" dataKey="receita" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mockTopProducts} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} />
              <YAxis type="category" dataKey="name" width={120} stroke="#9ca3af" fontSize={11} />
              <Tooltip />
              <Bar dataKey="vendas" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pedidos Recentes</h3>
          <Link href="/dashboard/orders" className="text-sm text-blue-600 hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Pedido</th>
                <th className="pb-3 font-medium">Produto</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {mockOrders.slice(0, 5).map((o) => (
                <tr key={o.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 font-medium text-gray-900">{o.id}</td>
                  <td className="py-3 text-gray-600">{o.items[0]?.productName}</td>
                  <td className="py-3 text-gray-900">{formatBRL(o.total)}</td>
                  <td className="py-3">
                    <StatusBadge status={o.status} colorClass={statusColors[o.status]} />
                  </td>
                  <td className="py-3 text-gray-500">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
