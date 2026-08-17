'use client';

import { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiHeart, FiMessageCircle, FiSend } from 'react-icons/fi';
import clsx from 'clsx';

/**
 * Prévia no formato do Instagram — fotos + legenda — para o usuário ver o post
 * pronto ANTES de agendar/publicar.
 */
export function PostPreview({
  images,
  caption,
  handle = 'cyntiarinaldidoces',
  className,
  showBadge = true,
}: {
  images: string[];
  caption: string;
  handle?: string;
  className?: string;
  /** Selo TESTE no topo — desligar quando o card já está dentro de outro TESTE */
  showBadge?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const n = images.length;
  const i = n ? Math.min(index, n - 1) : 0;
  const long = caption.length > 220;
  const shown = long && !expanded ? `${caption.slice(0, 220).trim()}…` : caption;

  if (!n && !caption.trim()) return null;

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-2xl border border-ink-950/12 bg-white shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-ink-950/8 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-950/45">
          Prévia do post
        </p>
        {showBadge ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
            TESTE
          </span>
        ) : (
          <p className="text-[11px] text-ink-950/40">ainda não publicado</p>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-amber-300 via-pink-400 to-violet-500" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-950">@{handle}</p>
          {n > 1 ? (
            <p className="text-[11px] text-ink-950/45">carrossel · {n} fotos</p>
          ) : null}
        </div>
      </div>

      {n > 0 ? (
        <div className="relative bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[i]}
            alt={`slide ${i + 1}`}
            className="max-h-[420px] w-full object-contain"
          />
          {n > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setIndex((v) => (v - 1 + n) % n)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white"
                aria-label="Foto anterior"
              >
                <FiChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIndex((v) => (v + 1) % n)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white"
                aria-label="Próxima foto"
              >
                <FiChevronRight size={16} />
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {images.map((_, d) => (
                  <span
                    key={d}
                    className={clsx(
                      'h-1.5 w-1.5 rounded-full',
                      d === i ? 'bg-white' : 'bg-white/40'
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3 px-3 py-2 text-ink-950">
        <FiHeart size={18} />
        <FiMessageCircle size={18} />
        <FiSend size={18} />
      </div>

      {caption.trim() ? (
        <div className="px-3 pb-3">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-950">
            <span className="font-semibold">@{handle}</span> {shown}
          </p>
          {long && !expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-0.5 text-sm text-ink-950/45"
            >
              mais
            </button>
          ) : null}
        </div>
      ) : (
        <p className="px-3 pb-3 text-sm text-ink-950/45">Sem legenda ainda.</p>
      )}
    </div>
  );
}
