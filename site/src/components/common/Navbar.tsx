'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import { useCart } from '@/lib/store/cartStore';
import { FiShoppingCart, FiUser, FiMenu, FiX } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

/** Nav pública enxuta — ferramentas do app ficam no Painel após login. */
const publicLinks = [
  { href: '/cursos/do-zero-ao-lucro', label: 'Curso ML' },
  { href: '/shop', label: 'Loja' },
];

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { getItemCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const cartCount = getItemCount();
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    logout();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-ink-950/10 bg-stone-50/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/logo.png" alt="SocialFlow" className="h-10 w-10 rounded-md object-contain" />
          <span className="hidden font-display text-xl font-bold tracking-tight text-ink-950 sm:inline">
            Social<span className="text-signal-500">Flow</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {publicLinks.map((link) => {
            const active =
              pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-ink-950/5 text-ink-950'
                    : 'text-ink-950/60 hover:bg-ink-950/5 hover:text-ink-950'
                )}
              >
                {link.label}
              </Link>
            );
          })}
          {isAuthenticated && (
            <Link
              href="/dashboard"
              className={clsx(
                'rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
                pathname.startsWith('/dashboard')
                  ? 'bg-ink-950/5 text-ink-950'
                  : 'text-ink-950/60 hover:bg-ink-950/5 hover:text-ink-950'
              )}
            >
              Painel
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/cart"
            className="relative rounded-md p-2 text-ink-950/60 transition-colors hover:bg-ink-950/5 hover:text-ink-950"
            aria-label="Carrinho"
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
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-ink-950/70 transition-colors hover:bg-ink-950/5 hover:text-ink-950"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-500 text-white">
                  <FiUser size={16} />
                </span>
                <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden text-xs font-semibold text-ink-950/50 hover:text-ink-950 sm:inline"
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
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-md p-2 text-ink-950/70 hover:bg-ink-950/5 md:hidden"
            aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {isOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className="border-t border-ink-950/10 bg-stone-50/95 backdrop-blur-xl md:hidden">
          <div className="space-y-1 px-4 py-4">
            {publicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-ink-950/80 hover:bg-ink-950/5"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={isAuthenticated ? '/dashboard' : '/login'}
              onClick={() => setIsOpen(false)}
              className="block rounded-md px-3 py-2.5 text-sm font-medium text-ink-950/80 hover:bg-ink-950/5"
            >
              {isAuthenticated ? 'Painel' : 'Entrar na plataforma'}
            </Link>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-signal-600 hover:bg-ink-950/5"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
