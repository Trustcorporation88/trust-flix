'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  FiChevronDown,
  FiCpu,
  FiEdit3,
  FiHome,
  FiImage,
  FiInstagram,
  FiMenu,
  FiSettings,
} from 'react-icons/fi';
import { SiTiktok } from 'react-icons/si';
import clsx from 'clsx';

const QUICK_LINKS = [
  { icon: FiHome, label: 'Dashboard', href: '/dashboard' },
  { icon: FiCpu, label: 'Agentes IA', href: '/dashboard/agents' },
  { icon: FiEdit3, label: 'Content Studio', href: '/dashboard/content-studio' },
  { icon: FiImage, label: 'Creator Studio', href: '/dashboard/creator' },
  { icon: FiInstagram, label: 'Instagram', href: '/dashboard/instagram' },
  { icon: SiTiktok, label: 'TikTok', href: '/dashboard/tiktok' },
  { icon: FiSettings, label: 'Configurações', href: '/dashboard/settings' },
];

/**
 * Algumas telas do dashboard (Agentes, Content Studio, Creator Studio) têm
 * layout próprio e não usam a sidebar do DashboardShell. Este menu garante
 * que o operador consiga pular para qualquer outra área sem precisar voltar
 * ao /dashboard primeiro.
 */
export function DashboardQuickNav({ dark = true }: { dark?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={clsx(
          'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors',
          dark
            ? 'border-white/15 text-ink-200 hover:bg-white/[0.08] hover:text-white'
            : 'border-ink-950/15 text-ink-950/70 hover:bg-ink-950/5 hover:text-ink-950'
        )}
      >
        <FiMenu size={15} />
        Navegar
        <FiChevronDown size={14} className={clsx('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={clsx(
            'absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border shadow-xl',
            dark ? 'border-white/10 bg-ink-900' : 'border-ink-950/10 bg-white'
          )}
        >
          {QUICK_LINKS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-signal-500 text-white'
                    : dark
                      ? 'text-ink-200 hover:bg-white/[0.06] hover:text-white'
                      : 'text-ink-950/75 hover:bg-ink-950/5 hover:text-ink-950'
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
