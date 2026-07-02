'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import { useCart } from '@/lib/store/cartStore';
import { FiShoppingCart, FiUser, FiMenu, FiX } from 'react-icons/fi';
import { useState } from 'react';
import clsx from 'clsx';

const navLinks = [
  { href: '/shop', label: 'Loja' },
  { href: '/dashboard/agents', label: 'Agentes IA' },
  { href: '/dashboard/content-studio', label: 'Content Studio' },
  { href: '/dashboard/creator', label: 'Creator Studio' },
  { href: '/dashboard/instagram', label: 'Instagram' },
  { href: '/dashboard', label: 'Painel' },
];

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const { getItemCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const cartCount = getItemCount();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 shrink-0">
          <img src="/logo.png" alt="Trust Insta Logo" className="h-9 w-9 rounded-lg object-contain" />
          <span className="hidden text-xl font-bold tracking-tight text-white sm:inline font-display">
            Trust<span className="gradient-text">Insta</span>
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/[0.08] text-white'
                    : 'text-ink-300 hover:bg-white/[0.05] hover:text-white'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cart */}
          <Link
            href="/cart"
            className="relative rounded-lg p-2 text-ink-300 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <FiShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[11px] font-bold text-ink-950">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Auth */}
          {isAuthenticated && user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-ink-300 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-white">
                <FiUser size={16} />
              </span>
              <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
            </Link>
          ) : (
            <Link href="/login" className="btn-primary !px-4 !py-2 !text-sm">
              Entrar
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-2 text-ink-300 hover:bg-white/[0.05] hover:text-white md:hidden"
          >
            {isOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-t border-white/10 bg-ink-950/95 backdrop-blur-xl md:hidden">
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={clsx(
                    'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active ? 'bg-white/[0.08] text-white' : 'text-ink-300 hover:bg-white/[0.05] hover:text-white'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
