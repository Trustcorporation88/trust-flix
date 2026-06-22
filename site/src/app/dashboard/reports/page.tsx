'use client';

import { DashboardShell, StatCard } from '@/components/dashboard/DashboardShell';
import { mockSalesByDay, mockTopProducts, mockStats, formatBRL } from '@/lib/mockData';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const channelData = [
  { name: 'WhatsApp', value: 58, color: '#22c55e' },
  { name: 'Instagram', value: 24, color: '#ec4899' },
  { name: 'Site', value: 12, color: '#3b82f6' },
  { name: 'Indicação', value: 6, color: '#f59e0b' },
];

export default function ReportsPage() {
  return (
    <DashboardShell title="Relatórios" subtitle="Análise de desempenho e métricas de vendas">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard label="Receita do Mês" value={formatBRL(mockStats.thisMonthRevenue)} icon="💰" trend="+18% vs mês anterior" />
        <StatCard label="Conversão" value={`${mockStats.conversionRate}%`} icon="📈" trend="+2.1pp" />
        <StatCard label="Ticket Médio" value={formatBRL(mockStats.avgOrderValue)} icon="🎯" />
        <StatCard label="Leads Captados" value={mockStats.totalLeads} icon="🧲" trend="+34 esta semana" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita na Semana</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={mockSalesByDay}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Area type="monotone" dataKey="receita" stroke="#7c3aed" strokeWidth={2} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Origem das Vendas</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {channelData.map((c) => (
                  <Cell key={c.name} fill={c.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Faturamento por Produto</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={mockTopProducts}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            <Bar dataKey="receita" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashboardShell>
  );
}
