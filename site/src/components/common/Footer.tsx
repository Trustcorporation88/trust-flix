'use client';

import Link from 'next/link';
import { FiFacebook, FiTwitter, FiInstagram, FiLinkedin } from 'react-icons/fi';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const socials = [
    { icon: FiFacebook, href: '#', label: 'Facebook' },
    { icon: FiTwitter, href: '#', label: 'Twitter' },
    { icon: FiInstagram, href: '#', label: 'Instagram' },
    { icon: FiLinkedin, href: '#', label: 'LinkedIn' },
  ];

  return (
    <footer className="relative mt-24 border-t border-white/10 bg-ink-950">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center space-x-2">
              <img src="/logo.png" alt="Trust Insta Logo" className="h-9 w-9 rounded-lg object-contain" />
              <span className="text-xl font-bold text-white font-display">
                Trust<span className="gradient-text">Insta</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink-300">
              Plataforma de vendas e atendimento automático com IA, integrada ao WhatsApp e Instagram.
            </p>
          </div>

          {/* Plataforma */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Plataforma</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/dashboard/agents" className="text-ink-300 transition-colors hover:text-accent-300">
                  Agentes IA
                </Link>
              </li>
              <li>
                <Link href="/dashboard/creator" className="text-ink-300 transition-colors hover:text-accent-300">
                  Creator Studio
                </Link>
              </li>
              <li>
                <Link href="/dashboard/instagram" className="text-ink-300 transition-colors hover:text-accent-300">
                  Instagram
                </Link>
              </li>
            </ul>
          </div>

          {/* Loja */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Loja</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/shop" className="text-ink-300 transition-colors hover:text-accent-300">
                  Produtos
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-ink-300 transition-colors hover:text-accent-300">
                  Carrinho
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-ink-300 transition-colors hover:text-accent-300">
                  Painel Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Conta */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Conta</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/login" className="text-ink-300 transition-colors hover:text-accent-300">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-ink-300 transition-colors hover:text-accent-300">
                  Meu Painel
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-ink-400">
            &copy; {currentYear} Trust Insta. Todos os direitos reservados.
          </p>
          <div className="flex space-x-3">
            {socials.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-ink-300 transition-all hover:border-accent-400/50 hover:bg-accent-500/10 hover:text-accent-300"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
