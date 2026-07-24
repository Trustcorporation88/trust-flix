'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { authFetch } from '@/lib/auth/clientFetch';
import { POSTIZ_APP_URL } from '@/lib/postizConfig';
import { aiExecutor } from '@/services/aiExecutor';
import {
  FiCpu,
  FiEdit3,
  FiInstagram,
  FiImage,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiExternalLink,
} from 'react-icons/fi';
import { SiTiktok } from 'react-icons/si';
import { isInstagramIntegration, isTikTokIntegration } from '@/lib/postizPlatforms';

interface HubStatus {
  postizConfigured: boolean;
  accounts: number;
  igAccounts: number;
  ttAccounts: number;
  agentRuns: number;
  aiConfigured: boolean;
}

const steps = [
  {
    n: '01',
    title: 'Agentes IA',
    text: 'Diagnóstico, oferta e copy — outputs ficam salvos no navegador.',
    href: '/dashboard/agents',
    icon: FiCpu,
  },
  {
    n: '02',
    title: 'Creator Studio',
    text: 'Monte o criativo (post/story) e leve a copy para o Content Studio.',
    href: '/dashboard/creator',
    icon: FiImage,
  },
  {
    n: '03',
    title: 'Content Studio',
    text: 'Agende ou publique no Instagram e TikTok via Postiz.',
    href: '/dashboard/content-studio',
    icon: FiEdit3,
  },
];

export default function DashboardPage() {
  const [status, setStatus] = useState<HubStatus>({
    postizConfigured: false,
    accounts: 0,
    igAccounts: 0,
    ttAccounts: 0,
    agentRuns: 0,
    aiConfigured: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const aiConfigured = Boolean(aiExecutor.getCurrentProvider()?.apiKey);
      const agentRuns = aiExecutor.getHistory().length;

      let postizConfigured = false;
      let accounts = 0;
      let igAccounts = 0;
      let ttAccounts = 0;

      try {
        const res = await authFetch('/api/content-studio/accounts');
        const json = await res.json();
        postizConfigured = json.configured === true;
        const list = json?.data?.integrations || [];
        accounts = list.length;
        igAccounts = list.filter((i: { identifier?: string }) =>
          isInstagramIntegration(String(i.identifier || ''))
        ).length;
        ttAccounts = list.filter((i: { identifier?: string }) =>
          isTikTokIntegration(String(i.identifier || ''))
        ).length;
      } catch {
        // silencioso
      }

      if (!cancelled) {
        setStatus({ postizConfigured, accounts, igAccounts, ttAccounts, agentRuns, aiConfigured });
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const needsAccounts = status.postizConfigured && status.accounts === 0;
  const needsPostiz = !status.postizConfigured;

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Hub operacional — SocialFlow + Postiz"
      actions={
        <a
          href={POSTIZ_APP_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary !px-3 !py-2 !text-sm"
        >
          Abrir Postiz <FiExternalLink size={14} />
        </a>
      }
    >
      {(needsPostiz || needsAccounts) && !loading && (
        <div className="mb-6 rounded-xl border border-signal-500/25 bg-signal-50 px-4 py-4 sm:px-5">
          <p className="font-display text-base font-bold text-ink-950">
            {needsPostiz ? 'Conecte o motor Postiz' : 'Conecte suas contas sociais'}
          </p>
          <p className="mt-1 text-sm text-ink-950/65">
            {needsPostiz
              ? 'O SocialFlow publica pelo Postiz (insta.trustcorp.com.br). Sem a API configurada na Vercel, agendamento e contas não aparecem.'
              : 'Nenhuma conta Instagram/TikTok veio da API. Abra o Postiz, conecte a conta na organização certa e confira se a API Key é da mesma org.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={POSTIZ_APP_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-primary !px-4 !py-2 !text-sm"
            >
              Abrir Postiz
            </a>
            <Link href="/dashboard/settings" className="btn-secondary !px-4 !py-2 !text-sm">
              Ver configuração
            </Link>
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatusCard
          label="Postiz"
          value={loading ? '…' : status.postizConfigured ? 'Conectado' : 'Pendente'}
          ok={status.postizConfigured}
        />
        <StatusCard
          label="Instagram"
          value={loading ? '…' : String(status.igAccounts)}
          ok={status.igAccounts > 0}
        />
        <StatusCard
          label="TikTok"
          value={loading ? '…' : String(status.ttAccounts)}
          ok={status.ttAccounts > 0}
        />
        <StatusCard
          label="IA (Agentes)"
          value={loading ? '…' : status.aiConfigured ? 'Configurada' : 'Sem API key'}
          ok={status.aiConfigured}
        />
        <StatusCard
          label="Execuções"
          value={loading ? '…' : String(status.agentRuns)}
          ok={status.agentRuns > 0}
        />
      </div>

      <div className="mb-8 rounded-xl border border-ink-950/10 bg-white p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-ink-950">Fluxo em 3 passos</h2>
        <p className="mt-2 text-sm text-ink-950/60">
          Estruture com agentes → crie o visual → publique no Content Studio (Postiz).
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group rounded-xl border border-ink-950/10 p-5 transition-all hover:border-signal-500/40 hover:shadow-sm"
            >
              <p className="font-display text-sm font-semibold text-signal-500">{s.n}</p>
              <div className="mt-3 flex items-center gap-2">
                <s.icon className="text-ink-950" size={20} />
                <h3 className="font-display text-lg font-bold text-ink-950">{s.title}</h3>
              </div>
              <p className="mt-2 text-sm text-ink-950/60">{s.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-flow-700 group-hover:text-signal-600">
                Abrir <FiArrowRight />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/instagram"
          className="flex items-center justify-between rounded-xl border border-ink-950/10 bg-white p-5 hover:border-signal-500/40"
        >
          <div className="flex items-center gap-3">
            <FiInstagram size={22} className="text-signal-500" />
            <div>
              <p className="font-semibold text-ink-950">Instagram</p>
              <p className="text-sm text-ink-950/55">
                {status.igAccounts > 0
                  ? `${status.igAccounts} conta(s) · agenda e analytics`
                  : 'Conecte no Postiz'}
              </p>
            </div>
          </div>
          <FiArrowRight className="text-ink-950/40" />
        </Link>
        <Link
          href="/dashboard/tiktok"
          className="flex items-center justify-between rounded-xl border border-ink-950/10 bg-white p-5 hover:border-signal-500/40"
        >
          <div className="flex items-center gap-3">
            <SiTiktok size={22} className="text-ink-950" />
            <div>
              <p className="font-semibold text-ink-950">TikTok</p>
              <p className="text-sm text-ink-950/55">
                {status.ttAccounts > 0
                  ? `${status.ttAccounts} conta(s) · agenda e analytics`
                  : 'Conecte no Postiz'}
              </p>
            </div>
          </div>
          <FiArrowRight className="text-ink-950/40" />
        </Link>
        <Link
          href="/dashboard/content-studio"
          className="flex items-center justify-between rounded-xl border border-ink-950/10 bg-white p-5 hover:border-signal-500/40"
        >
          <div className="flex items-center gap-3">
            <FiEdit3 size={22} className="text-signal-500" />
            <div>
              <p className="font-semibold text-ink-950">Publicar agora</p>
              <p className="text-sm text-ink-950/55">Content Studio → Postiz</p>
            </div>
          </div>
          <FiArrowRight className="text-ink-950/40" />
        </Link>
      </div>
    </DashboardShell>
  );
}

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-xl border border-ink-950/10 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-950/45 sm:text-xs">
          {label}
        </p>
        {ok ? (
          <FiCheckCircle className="text-flow-600" size={16} />
        ) : (
          <FiAlertCircle className="text-signal-500" size={16} />
        )}
      </div>
      <p className="mt-2 font-display text-xl font-bold text-ink-950 sm:text-2xl">{value}</p>
    </div>
  );
}
