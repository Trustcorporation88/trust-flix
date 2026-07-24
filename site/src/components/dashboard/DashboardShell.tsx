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
  FiMenu,
  FiX,
} from 'react-icons/fi';
import { SiTiktok } from 'react-icons/si';
import { ComponentType, ReactNode, useEffect, useState } from 'react';

/** Painel self-hosted do Postiz (motor de agendamento/publicação). */
const POSTIZ_PANEL_URL = 'https://insta.trustcorp.com.br';

/** Só o que está conectado de verdade — vendas/WhatsApp/etc. ficam fora até existirem. */
const menuGroups: {
  title: string;
  items: { icon: ComponentType<{ size?: number | string }>; label: string; href: string }[];
}[] = [
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
      { icon: SiTiktok, label: 'TikTok', href: '/dashboard/tiktok' },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fecha o drawer ao navegar (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Fecha com Esc e trava o scroll do body enquanto o drawer está aberto
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-stone-100">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col overflow-y-auto bg-ink-950 text-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between border-b border-white/10 p-6">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="SocialFlow" className="h-10 w-10 object-contain" />
              <span className="font-display text-xl font-bold">
                Social<span className="text-signal-500">Flow</span>
              </span>
            </Link>
            {user?.name && <p className="mt-2 text-xs text-white/50">{user.name}</p>}
          </div>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setSidebarOpen(false)}
            className="-mr-2 -mt-1 rounded-md p-2 text-white/60 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 px-3 py-4">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
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
          <a
            href={POSTIZ_PANEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
            title="Painel completo de contas e agendamentos (Postiz)"
          >
            <FiExternalLink size={18} />
            <span>Abrir Postiz</span>
          </a>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
          >
            <FiHome size={18} />
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
      <div className="min-w-0 flex-1 lg:ml-64">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-ink-950/10 bg-white px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-md border border-ink-950/10 p-2 text-ink-950/70 hover:bg-stone-100 lg:hidden"
            >
              <FiMenu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold text-ink-950 sm:text-2xl">{title}</h1>
              {subtitle && <p className="mt-0.5 hidden truncate text-sm text-ink-950/55 sm:block">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
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
