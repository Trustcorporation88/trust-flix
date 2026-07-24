'use client';

import { FiExternalLink, FiRefreshCw } from 'react-icons/fi';

interface PostizOnboardingProps {
  platform?: 'Instagram' | 'TikTok';
  onRefresh?: () => void;
  technicalDetail?: string;
}

export function PostizOnboarding({
  platform,
  onRefresh,
  technicalDetail,
}: PostizOnboardingProps) {
  const channelLabel = platform ? `uma conta do ${platform}` : 'suas contas sociais';

  return (
    <section className="rounded-xl border border-dashed border-ink-950/20 bg-white p-5 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-signal-600">
          Configuração rápida
        </span>
        <h2 className="mt-2 font-display text-xl font-bold text-ink-950">
          Conecte {channelLabel} pelo Postiz
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-950/60">
          O Postiz é o motor de publicação do SocialFlow. A conexão é feita uma vez e, depois,
          sua conta aparece aqui para criar, agendar e acompanhar conteúdo.
        </p>

        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ['1', 'Abrir o Postiz'],
            ['2', `Adicionar ${platform || 'um'} canal`],
            ['3', 'Voltar e atualizar'],
          ].map(([number, label]) => (
            <li key={number} className="flex items-center gap-3 rounded-lg bg-stone-100 px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-950 text-xs font-bold text-white">
                {number}
              </span>
              <span className="text-sm font-medium text-ink-950">{label}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a
            href="https://insta.trustcorp.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary !px-4 !py-2.5 !text-sm"
          >
            Abrir Postiz <FiExternalLink />
          </a>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="btn-secondary !px-4 !py-2.5 !text-sm"
            >
              <FiRefreshCw /> Já conectei, atualizar
            </button>
          )}
        </div>

        {technicalDetail && (
          <details className="mt-5 text-xs text-ink-950/50">
            <summary className="cursor-pointer font-semibold hover:text-ink-950">
              Informações para o administrador
            </summary>
            <p className="mt-2 rounded-md bg-stone-100 p-3 leading-5">{technicalDetail}</p>
          </details>
        )}
      </div>
    </section>
  );
}
