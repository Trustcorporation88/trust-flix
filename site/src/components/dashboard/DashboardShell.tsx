'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import { POSTIZ_APP_URL } from '@/lib/postizConfig';
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
  FiImage,
} from 'react-icons/fi';
import { SiTiktok } from 'react-icons/si';
import { ComponentType, ReactNode, useEffect, useState } from 'react';

/** Só o que está conectado de verdade — vendas/WhatsApp/etc. ficam fora até existirem. */
const menuGroups: {
  title: string;
  items: {
    icon: ComponentType<{ size?: number | string }>;
    label: string;
    href: string;
    external?: boolean;
  }[];
}[] = [
  {
    title: 'Visão Geral',
    items: [{ icon: FiHome, label: 'Dashboard', href: '/dashboard' }],
  },
  {
    title: 'Conteúdo & IA',
    items: [
      { icon: FiCpu, label: 'Agentes IA', href: '/dashboard/agents' },
      { icon: FiImage, label: 'Creator Studio', href: '/dashboard/creator' },
      { icon: FiEdit3, label: 'Content Studio', href: '/dashboard/content-studio' },
      { icon: FiInstagram, label: 'Instagram', href: '/dashboard/instagram' },
      { icon: SiTiktok, label: 'TikTok', href: '/dashboard/tiktok' },
    ],
  },
  {
    title: 'Publicação',
    items: [
      {
        icon: FiExternalLink,
        label: 'Abrir Postiz',
        href: POSTIZ_APP_URL,
        external: true,
      },
    ],
  },
  {
    title: 'Sistema',
    items: [{ icon: FiSettings, label: 'Configurações', href: '/dashboard/settings' }],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {menuGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              if (item.external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={onNavigate}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <item.icon size={18} />
                    <span className="flex-1">{item.label}</span>
                    <FiExternalLink size={14} className="opacity-50" />
                  </a>
                );
              }
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
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
  );
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const logoutAndClear = () => {
    logout();
    if (typeof window !== 'undefined') localStorage.removeItem('token');
  };

  const sidebarBody = (
    <>
      <div className="border-b border-white/10 p-5 sm:p-6">
        <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <img src="/logo.png" alt="SocialFlow" className="h-10 w-10 object-contain" />
          <span className="font-display text-xl font-bold">
            Social<span className="text-signal-500">Flow</span>
          </span>
        </Link>
        {user?.name && <p className="mt-2 truncate text-xs text-white/50">{user.name}</p>}
      </div>

      <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/70 hover:bg-white/5"
        >
          <FiExternalLink size={18} />
          <span>Ver site</span>
        </Link>
        <button
          type="button"
          onClick={logoutAndClear}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-red-400 hover:bg-white/5"
        >
          <FiLogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-stone-100">
      {/* Desktop sidebar */}
      <aside className="fixed z-30 hidden h-screen w-64 flex-col overflow-hidden bg-ink-950 text-white lg:flex">
        {sidebarBody}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-ink-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-white/70">Menu</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 text-white/70 hover:bg-white/5 hover:text-white"
                aria-label="Fechar"
              >
                <FiX size={20} />
              </button>
            </div>
            {sidebarBody}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-ink-950/10 bg-white/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-md border border-ink-950/10 p-2 text-ink-950 lg:hidden"
                aria-label="Abrir menu"
              >
                <FiMenu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-bold text-ink-950 sm:text-2xl">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-0.5 truncate text-sm text-ink-950/55">{subtitle}</p>
                )}
              </div>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2 sm:gap-3">{actions}</div>}
          </div>
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
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && <p className="mt-1 text-xs text-green-600">{trend}</p>}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

export function StatusBadge({
  status,
  label,
  colorClass,
}: {
  status: string;
  label?: string;
  colorClass: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}>
      {label || status}
    </span>
  );
}
