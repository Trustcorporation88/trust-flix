'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import {
  FiHome,
  FiCpu,
  FiEdit3,
  FiImage,
  FiInstagram,
  FiSettings,
  FiLogOut,
  FiExternalLink,
  FiMenu,
  FiX,
} from 'react-icons/fi';
import { SiTiktok } from 'react-icons/si';
import { ComponentType, ReactNode, useEffect, useState } from 'react';

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
      { icon: FiImage, label: 'Creator Studio', href: '/dashboard/creator' },
      { icon: FiInstagram, label: 'Instagram', href: '/dashboard/instagram' },
      { icon: SiTiktok, label: 'TikTok', href: '/dashboard/tiktok' },
    ],
  },
  {
    title: 'Sistema',
    items: [{ icon: FiSettings, label: 'Configurações', href: '/dashboard/settings' }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha o menu ao navegar para outra página.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Evita rolagem do body enquanto o menu mobile está aberto.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    if (typeof window !== 'undefined') localStorage.removeItem('token');
  };

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Backdrop no mobile */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-y-auto bg-ink-950 text-white transition-transform duration-300 ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-white/10 p-6">
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
            onClick={() => setMobileOpen(false)}
            className="-mr-1 rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
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
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
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
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-white/5"
          >
            <FiLogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-950/10 bg-white px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="-ml-1 shrink-0 rounded-md p-2 text-ink-950/70 hover:bg-ink-950/5 hover:text-ink-950 lg:hidden"
          >
            <FiMenu size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold text-ink-950 sm:text-2xl">{title}</h1>
            {subtitle && <p className="mt-1 truncate text-sm text-ink-950/55">{subtitle}</p>}
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
