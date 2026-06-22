'use client';

import { DashboardShell, StatCard } from '@/components/dashboard/DashboardShell';
import { mockCustomers, formatBRL, formatDate } from '@/lib/mockData';

export default function CustomersPage() {
  const totalSpent = mockCustomers.reduce((s, c) => s + c.spent, 0);
  const totalOrders = mockCustomers.reduce((s, c) => s + c.orders, 0);

  return (
    <DashboardShell title="Clientes" subtitle="Base de clientes e histórico de compras">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard label="Total de Clientes" value={mockCustomers.length} icon="👥" />
        <StatCard label="Receita Acumulada" value={formatBRL(totalSpent)} icon="💰" />
        <StatCard label="Pedidos Totais" value={totalOrders} icon="📦" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">Contato</th>
              <th className="px-6 py-4 font-medium">Pedidos</th>
              <th className="px-6 py-4 font-medium">Total Gasto</th>
              <th className="px-6 py-4 font-medium">Cliente desde</th>
            </tr>
          </thead>
          <tbody>
            {mockCustomers.map((c) => (
              <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center font-semibold">
                      {c.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  <div>{c.email}</div>
                  <div className="text-gray-400 text-xs">{c.phone}</div>
                </td>
                <td className="px-6 py-4 text-gray-900">{c.orders}</td>
                <td className="px-6 py-4 font-medium text-green-600">{formatBRL(c.spent)}</td>
                <td className="px-6 py-4 text-gray-500">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
