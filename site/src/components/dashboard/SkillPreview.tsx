'use client';

import { useState, type ReactNode } from 'react';
import { FiExternalLink, FiPlay } from 'react-icons/fi';
import clsx from 'clsx';
import { PostPreview } from '@/components/dashboard/PostPreview';
import {
  buildSkillPreview,
  type PreviewKind,
  type PreviewVideo,
} from '@/lib/copilotPreview';

export type SkillPreviewSchedule = {
  intent?: string;
  integrationName?: string;
  postType?: string;
  scheduledFor?: string;
  content?: string;
  media?: { path: string }[];
};

function TesteChrome({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-2xl border border-ink-950/12 bg-white shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-ink-950/8 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-950/45">
          {title}
        </p>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
          TESTE
        </span>
      </div>
      {children}
    </div>
  );
}

function Tabs({
  count,
  index,
  onChange,
  prefix,
}: {
  count: number;
  index: number;
  onChange: (i: number) => void;
  prefix: string;
}) {
  if (count < 2) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-3">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={clsx(
            'rounded-full px-2.5 py-1 text-[11px] font-semibold',
            i === index
              ? 'bg-ink-950 text-white'
              : 'bg-stone-100 text-ink-950/60 hover:bg-stone-200'
          )}
        >
          {prefix} {i + 1}
        </button>
      ))}
    </div>
  );
}

function ReelsPhone({ script, image }: { script: string; image?: string }) {
  const shown = script.length > 420 ? `${script.slice(0, 420).trim()}…` : script;
  return (
    <div className="mx-auto w-[220px] rounded-[1.7rem] border-4 border-ink-950 bg-ink-950 p-1 shadow-lg">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[1.25rem] bg-gradient-to-b from-stone-700 to-stone-950">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/30">
            <FiPlay size={36} />
          </div>
        )}
        <div className="absolute left-1/2 top-2 h-1.5 w-14 -translate-x-1/2 rounded-full bg-black/40" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-3 pt-10">
          <p className="whitespace-pre-wrap break-words text-[11px] leading-snug text-white">
            {shown || 'Roteiro ainda vazio.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function FeedTeste({
  images,
  caption,
  handle,
  className,
}: {
  images: string[];
  caption: string;
  handle: string;
  className?: string;
}) {
  return (
    <PostPreview className={className} images={images} caption={caption} handle={handle} />
  );
}

export function SkillPreview({
  routeKind,
  skillId,
  content,
  images = [],
  handle = 'cyntiarinaldidoces',
  videoSources,
  pendingAction,
  className,
}: {
  routeKind?: string;
  skillId?: string;
  content: string;
  images?: string[];
  handle?: string;
  videoSources?: PreviewVideo[];
  pendingAction?: SkillPreviewSchedule | null;
  className?: string;
}) {
  const model = buildSkillPreview({ routeKind, skillId, content, videoSources });
  const kind: PreviewKind = model.kind;
  const [index, setIndex] = useState(0);

  if (!content.trim() && !images.length && !pendingAction && !model.videos.length) {
    return null;
  }

  if (kind === 'feed') {
    return (
      <FeedTeste
        className={className}
        images={images}
        caption={pendingAction?.content || model.feedCaption}
        handle={handle}
      />
    );
  }

  if (kind === 'captions') {
    const caps = model.captions;
    const i = Math.min(index, Math.max(caps.length - 1, 0));
    return (
      <div className={className}>
        <TesteChrome title={`${model.label} · ${caps.length}`}>
          <Tabs count={caps.length} index={i} onChange={setIndex} prefix="Legenda" />
          <div className="p-3 pt-2">
            <PostPreview
              images={images}
              caption={caps[i] || model.feedCaption}
              handle={handle}
              showBadge={false}
            />
          </div>
        </TesteChrome>
      </div>
    );
  }

  if (kind === 'reels') {
    const scripts = model.captions.length ? model.captions : [model.feedCaption];
    const i = Math.min(index, Math.max(scripts.length - 1, 0));
    return (
      <TesteChrome className={className} title={`${model.label} · 9:16`}>
        <Tabs count={scripts.length} index={i} onChange={setIndex} prefix="Roteiro" />
        <div className="px-3 py-4">
          <ReelsPhone script={scripts[i] || ''} image={images[0]} />
        </div>
      </TesteChrome>
    );
  }

  if (kind === 'hashtags') {
    return (
      <TesteChrome className={className} title={model.label}>
        <div className="flex flex-wrap gap-1.5 p-3">
          {model.hashtags.length ? (
            model.hashtags.map((h) => (
              <span
                key={h}
                className="rounded-full bg-signal-50 px-2.5 py-1 text-xs font-medium text-signal-700"
              >
                {h}
              </span>
            ))
          ) : (
            <p className="text-sm text-ink-950/45">Nenhuma hashtag nesta resposta.</p>
          )}
        </div>
      </TesteChrome>
    );
  }

  if (kind === 'plan') {
    const days = model.days.length ? model.days : [{ day: 'Semana', body: content }];
    return (
      <TesteChrome className={className} title={model.label}>
        <div className="grid gap-2 p-3 sm:grid-cols-2">
          {days.map((d) => (
            <div key={d.day} className="rounded-xl border border-ink-950/10 bg-stone-50 p-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-signal-700">
                {d.day}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-950/80">
                {d.body.length > 220 ? `${d.body.slice(0, 220).trim()}…` : d.body}
              </p>
            </div>
          ))}
        </div>
      </TesteChrome>
    );
  }

  if (kind === 'trends') {
    return (
      <TesteChrome className={className} title={model.label}>
        <ul className="space-y-2 p-3">
          {model.videos.length ? (
            model.videos.map((v) => (
              <li key={v.url}>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 rounded-xl border border-ink-950/10 bg-stone-50 p-2.5 text-sm text-ink-950 hover:border-signal-500/40"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-950 text-white">
                    <FiPlay size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{v.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-signal-600">
                      <FiExternalLink size={10} /> abrir vídeo
                    </span>
                  </span>
                </a>
              </li>
            ))
          ) : (
            <p className="text-sm text-ink-950/45">Nenhum link de vídeo nesta resposta.</p>
          )}
        </ul>
      </TesteChrome>
    );
  }

  if (kind === 'improve') {
    return (
      <div className={clsx('space-y-2', className)}>
        <TesteChrome title="Diagnóstico">
          <p className="whitespace-pre-wrap break-words p-3 text-sm text-ink-950/80">
            {model.diagnosis || 'Sem diagnóstico separado — veja o texto abaixo.'}
          </p>
        </TesteChrome>
        <PostPreview images={images} caption={model.rewrite} handle={handle} />
      </div>
    );
  }

  if (kind === 'ideas') {
    const ideas = model.ideas;
    const i = Math.min(index, Math.max(ideas.length - 1, 0));
    const current = ideas[i];
    return (
      <TesteChrome className={className} title={`${model.label} · ${ideas.length}`}>
        <Tabs count={ideas.length} index={i} onChange={setIndex} prefix="Ideia" />
        <div className="p-3">
          <p className="text-sm font-semibold text-ink-950">{current?.title}</p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-950/75">
            {current?.body
              ? current.body.length > 480
                ? `${current.body.slice(0, 480).trim()}…`
                : current.body
              : content}
          </p>
        </div>
      </TesteChrome>
    );
  }

  if (kind === 'schedule' || pendingAction) {
    const when = pendingAction?.scheduledFor
      ? new Date(pendingAction.scheduledFor).toLocaleString('pt-BR')
      : pendingAction?.intent === 'publish_now'
        ? 'agora'
        : 'horário a confirmar';
    return (
      <div className={clsx('space-y-2', className)}>
        {(pendingAction?.content || model.feedCaption) && (
          <PostPreview
            images={
              pendingAction?.media?.length
                ? pendingAction.media.map((x) => x.path)
                : images
            }
            caption={pendingAction?.content || model.feedCaption}
            handle={handle}
          />
        )}
        <TesteChrome title="Agendamento">
          <dl className="grid gap-1.5 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-950/45">Conta</dt>
              <dd className="font-medium">{pendingAction?.integrationName || handle}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-950/45">Tipo</dt>
              <dd className="font-medium">{pendingAction?.postType || 'post'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-950/45">Quando</dt>
              <dd className="font-medium">{when}</dd>
            </div>
          </dl>
        </TesteChrome>
      </div>
    );
  }

  return (
    <TesteChrome className={className} title={model.label}>
      <p className="whitespace-pre-wrap break-words p-3 text-sm leading-relaxed text-ink-950">
        {content.length > 600 ? `${content.slice(0, 600).trim()}…` : content}
      </p>
    </TesteChrome>
  );
}
