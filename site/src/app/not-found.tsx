import Link from 'next/link';
import { FiArrowLeft, FiHome } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden bg-stone-50 px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
      <div className="card-surface relative w-full max-w-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="SocialFlow" className="h-16 w-16 rounded-lg object-contain" />
        </div>
        <p className="font-display text-6xl font-extrabold tracking-tight text-signal-500">404</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink-950">Página não encontrada</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-950/60">
          O link pode estar quebrado ou a página foi movida. Volte para o início ou acesse seu painel.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="btn-primary">
            <FiHome /> Ir para o início
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            <FiArrowLeft /> Ir para o painel
          </Link>
        </div>
      </div>
    </div>
  );
}
