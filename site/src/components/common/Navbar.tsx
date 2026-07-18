'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import { useCart } from '@/lib/store/cartStore';
import { FiShoppingCart, FiUser, FiMenu, FiX } from 'react-icons/fi';
import { useState } from 'react';
import clsx from 'clsx';

const navLinks = [
  { href: '/cursos/do-zero-ao-lucro', label: 'Curso ML' },
  { href: '/shop', label: 'Loja' },
  { href: '/dashboard/content-studio', label: 'Content Studio' },
  { href: '/dashboard/agents', label: 'Agentes IA' },
  { href: '/dashboard/instagram', label: 'Instagram' },
  { href: '/dashboard/tiktok', label: 'TikTok' },
  { href: '/dashboard', label: 'Painel' },
];

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { getItemCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const cartCount = getItemCount();
  const pathname = usePathname();
  const isApp = pathname.startsWith('/dashboard');

  const handleLogout = () => {
    localStorage.removeItem('token');
    logout();
  };

  return (
    <header
      className={clsx(
        'sticky top-0 z-50 border-b backdrop-blur-xl',
        isApp
          ? 'border-white/10 bg-ink-950/85'
          : 'border-ink-950/10 bg-stone-50/85'
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/logo.png" alt="SocialFlow" className="h-10 w-10 rounded-md object-contain" />
          <span
            className={clsx(
              'hidden font-display text-xl font-bold tracking-tight sm:inline',
              isApp ? 'text-white' : 'text-ink-950'
            )}
          >
            Social<span className="text-signal-500">Flow</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
                  isApp
                    ? active
                      ? 'bg-white/[0.08] text-white'
                      : 'text-ink-300 hover:bg-white/[0.05] hover:text-white'
                    : active
                      ? 'bg-ink-950/5 text-ink-950'
                      : 'text-ink-950/60 hover:bg-ink-950/5 hover:text-ink-950'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/cart"
            className={clsx(
              'relative rounded-md p-2 transition-colors',
              isApp
                ? 'text-ink-300 hover:bg-white/[0.05] hover:text-white'
                : 'text-ink-950/60 hover:bg-ink-950/5 hover:text-ink-950'
            )}
          >
            <FiShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-signal-500 text-[11px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className={clsx(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                  isApp
                    ? 'text-ink-300 hover:bg-white/[0.05] hover:text-white'
                    : 'text-ink-950/70 hover:bg-ink-950/5 hover:text-ink-950'
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-500 text-white">
                  <FiUser size={16} />
                </span>
                <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className={clsx(
                  'hidden text-xs font-semibold sm:inline',
                  isApp ? 'text-ink-400 hover:text-white' : 'text-ink-950/50 hover:text-ink-950'
                )}
              >
                Sair
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary !px-4 !py-2 !text-sm">
              Entrar
            </Link>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={clsx(
              'rounded-md p-2 md:hidden',
              isApp ? 'text-ink-300 hover:bg-white/[0.05]' : 'text-ink-950/70 hover:bg-ink-950/5'
            )}
          >
            {isOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </nav>

      {isOpen && (
        <div
          className={clsx(
            'border-t backdrop-blur-xl md:hidden',
            isApp ? 'border-white/10 bg-ink-950/95' : 'border-ink-950/10 bg-stone-50/95'
          )}
        >
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={clsx(
                  'block rounded-md px-3 py-2.5 text-sm font-medium',
                  isApp ? 'text-ink-200 hover:bg-white/[0.05]' : 'text-ink-950/80 hover:bg-ink-950/5'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
