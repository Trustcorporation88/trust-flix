'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import {
  FiHome,
  FiCpu,
  FiEdit3,
  FiInstagram,
  FiShoppingCart,
  FiUsers,
  FiUserPlus,
  FiSend,
  FiZap,
  FiLink,
  FiSmartphone,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiExternalLink,
} from 'react-icons/fi';
import { ReactNode } from 'react';

const menuGroups: { title: string; items: { icon: typeof FiHome; label: string; href: string }[] }[] = [
  {
    title: 'Visão Geral',
    items: [{ icon: FiHome, label: 'Dashboard', href: '/dashboard' }],
  },
  {
    title: 'Ferramentas IA',
    items: [
      { icon: FiCpu, label: 'Agentes IA', href: '/dashboard/agents' },
      { icon: FiEdit3, label: 'Creator Studio', href: '/dashboard/creator' },
      { icon: FiInstagram, label: 'Instagram', href: '/dashboard/instagram' },
    ],
  },
  {
    title: 'Vendas',
    items: [
      { icon: FiShoppingCart, label: 'Pedidos', href: '/dashboard/orders' },
      { icon: FiUsers, label: 'Clientes', href: '/dashboard/customers' },
      { icon: FiUserPlus, label: 'CRM / Leads', href: '/dashboard/leads' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { icon: FiSend, label: 'Campanhas', href: '/dashboard/campaigns' },
      { icon: FiZap, label: 'Automações', href: '/dashboard/automations' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { icon: FiSmartphone, label: 'WhatsApp', href: '/dashboard/whatsapp' },
      { icon: FiLink, label: 'Integrações', href: '/dashboard/integrations' },
      { icon: FiBarChart2, label: 'Relatórios', href: '/dashboard/reports' },
      { icon: FiSettings, label: 'Configurações', href: '/dashboard/settings' },
    ],
  },
];

export function DashboardShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col fixed h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="TrustFlix Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold">TrustFlix Admin</span>
          </Link>
          {user?.name && <p className="text-gray-400 text-xs mt-2">{user.name}</p>}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800"
          >
            <FiExternalLink size={18} />
            <span>Ver site</span>
          </Link>
          <button
            onClick={() => {
              logout();
              if (typeof window !== 'undefined') localStorage.removeItem('token');
            }}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-400 hover:bg-gray-800"
          >
            <FiLogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 ml-64">
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon: string;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status, label, colorClass }: { status: string; label?: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {label || status}
    </span>
  );
}
