'use client';

import { useState } from 'react';
import { FiCopy, FiCheck, FiLoader, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { authFetch } from '@/lib/auth/clientFetch';

interface DailyPlanItem {
  titulo: string;
  conteudo: string;
  hashtags: string[];
}

interface DailyPlan {
  reel: DailyPlanItem;
  tiktok: DailyPlanItem;
  story: DailyPlanItem;
  imagem: DailyPlanItem;
  post: DailyPlanItem;
}

const FORMATOS: { key: keyof DailyPlan; label: string; emoji: string }[] = [
  { key: 'reel', label: 'Reel (Instagram)', emoji: '🎬' },
  { key: 'tiktok', label: 'Vídeo TikTok', emoji: '🎵' },
  { key: 'story', label: 'Story', emoji: '📱' },
  { key: 'imagem', label: 'Imagem / Post estático', emoji: '🖼️' },
  { key: 'post', label: 'Publicação (feed)', emoji: '📝' },
];

function buildCopyText(item: DailyPlanItem): string {
  const hashtags = item.hashtags?.length ? `\n\n${item.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}` : '';
  return `${item.titulo}\n\n${item.conteudo}${hashtags}`;
}

export default function DailyContentGenerator() {
  const [tema, setTema] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleGerar = async () => {
    if (!tema.trim()) {
      toast.error('Descreva o tema ou um breve relato do que você precisa postar hoje.');
      return;
    }
    setIsGenerating(true);
    setPlan(null);
    try {
      const res = await authFetch('/api/content-studio/daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || 'Erro ao gerar os modelos do dia');
      setPlan(json.data);
      toast.success('Modelos do dia gerados!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar os modelos do dia');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (key: string, item: DailyPlanItem) => {
    try {
      await navigator.clipboard.writeText(buildCopyText(item));
      setCopiedKey(key);
      toast.success('Copiado! Cole na sua publicação.');
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000);
    } catch {
      toast.error('Não foi possível copiar automaticamente. Selecione o texto manualmente.');
    }
  };

  return (
    <div className="card-surface p-6">
      <span className="section-badge">Gerar do tema do dia</span>
      <h2 className="mt-3 font-display text-2xl font-bold text-white">
        Diga o que precisa postar hoje
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-300">
        Escreva o tema ou um breve relato do dia (ex: &quot;lançamento da promoção de tênis de corrida&quot;) e a IA
        entrega modelos prontos de Reel, TikTok, Story, Imagem e Post — é só copiar e colar na sua publicação.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <textarea
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          rows={3}
          placeholder="Ex: hoje quero divulgar o combo de verão com 20% de desconto para clientes novos"
          className="input-dark w-full resize-none sm:flex-1"
        />
      </div>
      <button
        onClick={handleGerar}
        disabled={isGenerating}
        className="btn-primary mt-3 disabled:opacity-50"
      >
        {isGenerating ? <FiLoader className="animate-spin" /> : <FiZap />}
        Gerar modelos do dia
      </button>

      {isGenerating && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {FORMATOS.map((f) => (
            <div key={f.key} className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      )}

      {plan && !isGenerating && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {FORMATOS.map(({ key, label, emoji }) => {
            const item = plan[key];
            if (!item) return null;
            return (
              <div
                key={key}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-300">
                    {emoji} {label}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-white">{item.titulo}</h3>
                <p className="mt-2 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-300">
                  {item.conteudo}
                </p>
                {item.hashtags?.length > 0 && (
                  <p className="mt-3 text-xs text-accent-400">
                    {item.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
                  </p>
                )}
                <button
                  onClick={() => handleCopy(key, item)}
                  className="btn-secondary mt-4 self-start text-sm"
                >
                  {copiedKey === key ? <FiCheck /> : <FiCopy />}
                  {copiedKey === key ? 'Copiado' : 'Copiar modelo'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
