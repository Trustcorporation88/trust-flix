'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-ink-950/10 bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <img src="/logo.png" alt="SocialFlow" className="h-10 w-10 rounded-md object-contain" />
              <span className="font-display text-xl font-bold text-ink-950">
                Social<span className="text-signal-500">Flow</span>
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-ink-950/60">
              Conteúdo, IA e vendas no mesmo fluxo — para marcas que executam todos os dias.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-ink-950">Produto</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/cursos/do-zero-ao-lucro" className="text-ink-950/60 hover:text-signal-600">
                  Curso Mercado Livre
                </Link>
              </li>
              <li>
                <Link href="/dashboard/content-studio" className="text-ink-950/60 hover:text-signal-600">
                  Content Studio
                </Link>
              </li>
              <li>
                <Link href="/dashboard/agents" className="text-ink-950/60 hover:text-signal-600">
                  Agentes IA
                </Link>
              </li>
              <li>
                <Link href="/dashboard/instagram" className="text-ink-950/60 hover:text-signal-600">
                  Instagram
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tiktok" className="text-ink-950/60 hover:text-signal-600">
                  TikTok
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-ink-950">Conta</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/login" className="text-ink-950/60 hover:text-signal-600">
                  Entrar
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-ink-950/60 hover:text-signal-600">
                  Termos
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-ink-950/60 hover:text-signal-600">
                  Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-ink-950/10 pt-8">
          <p className="text-sm text-ink-950/45">© {currentYear} SocialFlow · socialflow.site</p>
        </div>
      </div>
    </footer>
  );
}
