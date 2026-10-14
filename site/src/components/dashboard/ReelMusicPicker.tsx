'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FiLoader, FiMusic, FiPause, FiPlay, FiSearch, FiTrendingUp, FiX } from 'react-icons/fi';
import { authFetch } from '@/lib/auth/clientFetch';

export interface ReelAudioChoice {
  id: string;
  title: string;
  artist: string;
  image?: string;
  audio_volume: number;
  video_volume: number;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  image?: string;
  duration?: number;
  previewUrl?: string;
}

function formatDuration(ms?: number): string {
  if (!ms) return '';
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function ReelMusicPicker({
  integrationId,
  value,
  onChange,
}: {
  integrationId: string;
  value: ReelAudioChoice | null;
  onChange: (v: ReelAudioChoice | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'music' | 'original_sound'>('music');
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playingId, setPlayingId] = useState('');
  const player = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      player.current?.pause();
    };
  }, []);

  const search = async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ integrationId, q, type });
      const res = await authFetch(`/api/instagram/audio?${params}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json?.error || 'Falha na busca');
      setTracks(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setTracks(null);
      setError(err instanceof Error ? err.message : 'Falha na busca');
    } finally {
      setLoading(false);
    }
  };

  const togglePreview = (track: Track) => {
    if (!track.previewUrl) return;
    if (playingId === track.id) {
      player.current?.pause();
      setPlayingId('');
      return;
    }
    player.current?.pause();
    const audio = new Audio(track.previewUrl);
    audio.onended = () => setPlayingId('');
    audio.play().catch(() => setPlayingId(''));
    player.current = audio;
    setPlayingId(track.id);
  };

  const pick = (track: Track) => {
    player.current?.pause();
    setPlayingId('');
    onChange({
      id: track.id,
      title: track.title,
      artist: track.artist,
      image: track.image,
      audio_volume: value?.audio_volume ?? 100,
      video_volume: value?.video_volume ?? 30,
    });
  };

  return (
    <div>
      {value ? (
        <div className="rounded-lg border border-signal-500/40 bg-signal-50 p-3">
          <div className="flex items-center gap-3">
            {value.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.image} alt="" className="h-11 w-11 shrink-0 rounded object-cover" />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-signal-500 text-white">
                <FiMusic />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-950">{value.title}</p>
              <p className="truncate text-xs text-ink-950/55">{value.artist}</p>
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-md p-2 text-ink-950/50 hover:bg-white hover:text-ink-950"
              aria-label="Remover música"
            >
              <FiX />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-ink-950/70">
              Volume da música: <strong>{value.audio_volume}%</strong>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={value.audio_volume}
                onChange={(e) => onChange({ ...value, audio_volume: Number(e.target.value) })}
                className="mt-1 w-full accent-signal-500"
              />
            </label>
            <label className="text-xs text-ink-950/70">
              Som original do vídeo: <strong>{value.video_volume}%</strong>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={value.video_volume}
                onChange={(e) => onChange({ ...value, video_volume: Number(e.target.value) })}
                className="mt-1 w-full accent-signal-500"
              />
            </label>
          </div>
        </div>
      ) : null}

      <div className={clsx('flex gap-2', value ? 'mt-3' : '')}>
        {(
          [
            { id: 'music', label: 'Músicas' },
            { id: 'original_sound', label: 'Sons originais' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setType(t.id);
              setTracks(null);
            }}
            className={clsx(
              'rounded-full border px-3 py-1 text-xs font-medium',
              type === t.id
                ? 'border-signal-500 bg-signal-50 text-signal-700'
                : 'border-ink-950/10 text-ink-950/70 hover:border-signal-500/40'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-950/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search(query.trim())}
            placeholder="Nome da música ou artista"
            className="input-dark !py-2 !pl-9 text-base sm:text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => search(query.trim())}
          disabled={loading}
          className="btn-secondary shrink-0 !px-3 !py-2 text-sm disabled:opacity-50"
        >
          {loading ? <FiLoader className="animate-spin" /> : query.trim() ? <FiSearch /> : <FiTrendingUp />}
          {query.trim() ? 'Buscar' : 'Em alta'}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-danger-700">{error}</p>}

      {tracks && tracks.length === 0 && (
        <p className="mt-3 text-xs text-ink-950/55">Nada encontrado. Tente outro nome ou veja o que está em alta.</p>
      )}

      {tracks && tracks.length > 0 && (
        <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-ink-950/10 p-1">
          {tracks.map((track) => {
            const selected = value?.id === track.id;
            return (
              <li
                key={track.id}
                className={clsx(
                  'flex items-center gap-3 rounded-md px-2 py-2',
                  selected ? 'bg-signal-50' : 'hover:bg-stone-50'
                )}
              >
                <button
                  type="button"
                  onClick={() => togglePreview(track)}
                  disabled={!track.previewUrl}
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-stone-200 disabled:opacity-60"
                  aria-label={playingId === track.id ? 'Pausar prévia' : 'Ouvir prévia'}
                >
                  {track.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.image} alt="" className="h-full w-full object-cover" />
                  )}
                  {track.previewUrl && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                      {playingId === track.id ? <FiPause /> : <FiPlay />}
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-950">{track.title}</p>
                  <p className="truncate text-xs text-ink-950/55">
                    {track.artist}
                    {track.duration ? ` · ${formatDuration(track.duration)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => pick(track)}
                  className={clsx(
                    'shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold',
                    selected ? 'bg-signal-500 text-white' : 'border border-ink-950/15 text-ink-950 hover:bg-white'
                  )}
                >
                  {selected ? 'Escolhida' : 'Usar'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-2 text-[11px] text-ink-950/45">
        Só aparecem músicas liberadas pelo Instagram para publicação por apps — o catálogo é menor que o do app.
      </p>
    </div>
  );
}
