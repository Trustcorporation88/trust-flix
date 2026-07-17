'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import {
  FiHome,
  FiCpu,
  FiEdit3,
  FiInstagram,
  FiSettings,
  FiLogOut,
  FiExternalLink,
} from 'react-icons/fi';
import { ReactNode } from 'react';

/** Só o que está conectado de verdade — vendas/WhatsApp/etc. ficam fora até existirem. */
const menuGroups: { title: string; items: { icon: typeof FiHome; label: string; href: string }[] }[] = [
  {
    title: 'Visão Geral',
    items: [{ icon: FiHome, label: 'Dashboard', href: '/dashboard' }],
  },
  {
    title: 'Conteúdo & IA',
    items: [
      { icon: FiCpu, label: 'Agentes IA', href: '/dashboard/agents' },
      { icon: FiEdit3, label: 'Content Studio', href: '/dashboard/content-studio' },
      { icon: FiEdit3, label: 'Creator Studio', href: '/dashboard/creator' },
      { icon: FiInstagram, label: 'Instagram', href: '/dashboard/instagram' },
    ],
  },
  {
    title: 'Sistema',
    items: [{ icon: FiSettings, label: 'Configurações', href: '/dashboard/settings' }],
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
    <div className="flex min-h-screen bg-stone-100">
      {/* Sidebar */}
      <aside className="fixed flex h-screen w-64 flex-col overflow-y-auto bg-ink-950 text-white">
        <div className="border-b border-white/10 p-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="SocialFlow" className="h-10 w-10 object-contain" />
            <span className="font-display text-xl font-bold">
              Social<span className="text-signal-500">Flow</span>
            </span>
          </Link>
          {user?.name && <p className="mt-2 text-xs text-white/50">{user.name}</p>}
        </div>

        <nav className="flex-1 space-y-6 px-3 py-4">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        active ? 'bg-signal-500 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
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

        <div className="space-y-1 border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/5"
          >
            <FiExternalLink size={18} />
            <span>Ver site</span>
          </Link>
          <button
            onClick={() => {
              logout();
              if (typeof window !== 'undefined') localStorage.removeItem('token');
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-white/5"
          >
            <FiLogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-64 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-950/10 bg-white px-8 py-5">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-950">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-ink-950/55">{subtitle}</p>}
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
