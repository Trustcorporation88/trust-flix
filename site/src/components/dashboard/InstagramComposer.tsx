'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCrop,
  FiFilm,
  FiHash,
  FiImage,
  FiInstagram,
  FiLink,
  FiLoader,
  FiSave,
  FiSend,
  FiUpload,
  FiX,
  FiZap,
} from 'react-icons/fi';
import { authFetch } from '@/lib/auth/clientFetch';
import { PostPreview } from '@/components/dashboard/PostPreview';
import { fitImageToFeed, prepareMedia, type PreparedMedia } from '@/lib/igMediaPrep';
import {
  IG_LIMITS,
  extractHashtags,
  hasBlockingIssues,
  isFeedRatioOk,
  moveHashtagsToComment,
  parseCollaborators,
  quickSlots,
  ratioLabel,
  suggestFormat,
  validateIgDraft,
  type IgFormat,
} from '@/lib/instagramRules';

export interface ComposerAccount {
  id: string;
  name: string;
  identifier: string;
  picture?: string;
  profile?: string;
}

interface UploadedRef {
  id: string;
  path: string;
}

interface MediaItem {
  key: string;
  kind: 'image' | 'video';
  width: number;
  height: number;
  bytes: number;
  previewUrl: string;
  file?: File;
  uploaded?: UploadedRef;
  status: 'preparing' | 'uploading' | 'ready' | 'error';
  error?: string;
}

type When = 'now' | 'schedule' | 'draft';

interface PublishResult {
  account: string;
  ok: boolean;
  error?: string;
}

const STORAGE_KEY = 'sf_ig_composer_v1';

const FORMATS: { id: IgFormat; label: string; hint: string }[] = [
  { id: 'feed', label: 'Feed / Carrossel', hint: '1 a 10 fotos ou vídeos' },
  { id: 'reel', label: 'Reel', hint: '1 vídeo vertical 9:16' },
  { id: 'story', label: 'Story', hint: '1 mídia · some em 24h' },
];

function newKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScheduleLocal(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalInputValue(d);
}

function guessKindFromUrl(url: string): 'image' | 'video' {
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url) ? 'video' : 'image';
}

function formatWhen(local: string): string {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function InstagramComposer({
  accounts,
  defaultAccountId,
  onPublished,
}: {
  accounts: ComposerAccount[];
  defaultAccountId?: string;
  onPublished?: () => void;
}) {
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [format, setFormat] = useState<IgFormat>('feed');
  const [formatTouched, setFormatTouched] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [collaboratorsRaw, setCollaboratorsRaw] = useState('');
  const [when, setWhen] = useState<When>('schedule');
  const [scheduledLocal, setScheduledLocal] = useState(defaultScheduleLocal);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [slotLoading, setSlotLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<PublishResult[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (accounts.length === 0) return;
    setAccountIds((prev) => {
      const valid = prev.filter((id) => accounts.some((a) => a.id === id));
      if (valid.length > 0) return valid;
      const first = accounts.find((a) => a.id === defaultAccountId) || accounts[0];
      return [first.id];
    });
  }, [accounts, defaultAccountId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          caption?: string;
          firstComment?: string;
          collaboratorsRaw?: string;
          format?: IgFormat;
          media?: { kind: 'image' | 'video'; width: number; height: number; uploaded: UploadedRef }[];
        };
        if (saved.caption) setCaption(saved.caption);
        if (saved.firstComment) {
          setFirstComment(saved.firstComment);
          setShowComment(true);
        }
        if (saved.collaboratorsRaw) setCollaboratorsRaw(saved.collaboratorsRaw);
        if (saved.format) {
          setFormat(saved.format);
          setFormatTouched(true);
        }
        if (saved.media?.length) {
          setItems(
            saved.media.map((m) => ({
              key: newKey(),
              kind: m.kind,
              width: m.width,
              height: m.height,
              bytes: 0,
              previewUrl: m.uploaded.path,
              uploaded: m.uploaded,
              status: 'ready',
            }))
          );
        }
        if (saved.caption || saved.media?.length) toast('Rascunho anterior restaurado', { icon: '📝' });
      }
    } catch {
      // rascunho corrompido — começa limpo
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const media = items
      .filter((i) => i.uploaded)
      .map((i) => ({ kind: i.kind, width: i.width, height: i.height, uploaded: i.uploaded as UploadedRef }));
    const empty = !caption && !firstComment && !collaboratorsRaw && media.length === 0;
    try {
      if (empty) localStorage.removeItem(STORAGE_KEY);
      else
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ caption, firstComment, collaboratorsRaw, format: formatTouched ? format : undefined, media })
        );
    } catch {
      // cota do localStorage — ignora
    }
  }, [hydrated, caption, firstComment, collaboratorsRaw, format, formatTouched, items]);

  useEffect(() => {
    if (formatTouched || items.length === 0) return;
    setFormat(suggestFormat(items));
  }, [items, formatTouched]);

  const patchItem = useCallback((key: string, patch: Partial<MediaItem>) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }, []);

  const uploadPrepared = useCallback(
    async (key: string, prepared: PreparedMedia) => {
      if (prepared.file.size > IG_LIMITS.directUploadMaxBytes) {
        patchItem(key, {
          status: 'error',
          error: `${(prepared.file.size / 1048576).toFixed(1)}MB passa do limite de envio direto (4.4MB). Use "Enviar por link".`,
        });
        return;
      }
      patchItem(key, { status: 'uploading', error: undefined });
      try {
        const form = new FormData();
        form.append('file', prepared.file, prepared.file.name);
        const res = await authFetch('/api/content-studio/upload-media', { method: 'POST', body: form });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) throw new Error(json?.error || `Falha no envio (${res.status})`);
        patchItem(key, { status: 'ready', uploaded: json.data });
      } catch (err) {
        patchItem(key, { status: 'error', error: err instanceof Error ? err.message : 'Falha no envio' });
      }
    },
    [patchItem]
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      const accepted = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
      if (accepted.length === 0) {
        toast.error('Use foto (JPG/PNG/WebP) ou vídeo (MP4/MOV).');
        return;
      }
      const room = IG_LIMITS.carouselMax - items.length;
      if (room <= 0) {
        toast.error(`Máximo de ${IG_LIMITS.carouselMax} itens por post.`);
        return;
      }
      if (accepted.length > room) toast(`Só cabem mais ${room} itens — o resto foi ignorado.`);

      for (const file of accepted.slice(0, room)) {
        const key = newKey();
        setItems((prev) => [
          ...prev,
          {
            key,
            kind: file.type.startsWith('video/') ? 'video' : 'image',
            width: 0,
            height: 0,
            bytes: file.size,
            previewUrl: '',
            status: 'preparing',
          },
        ]);
        try {
          const prepared = await prepareMedia(file);
          patchItem(key, {
            kind: prepared.kind,
            width: prepared.width,
            height: prepared.height,
            bytes: prepared.file.size,
            previewUrl: prepared.previewUrl,
            file: prepared.file,
          });
          void uploadPrepared(key, prepared);
        } catch (err) {
          patchItem(key, { status: 'error', error: err instanceof Error ? err.message : 'Arquivo inválido' });
        }
      }
    },
    [items.length, patchItem, uploadPrepared]
  );

  const addFromLink = async () => {
    const url = linkUrl.trim();
    if (!url) return;
    if (items.length >= IG_LIMITS.carouselMax) {
      toast.error(`Máximo de ${IG_LIMITS.carouselMax} itens por post.`);
      return;
    }
    setLinkLoading(true);
    try {
      const res = await authFetch('/api/content-studio/upload-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json?.error || 'O Postiz não conseguiu baixar o link.');
      const uploaded = json.data as UploadedRef;
      setItems((prev) => [
        ...prev,
        {
          key: newKey(),
          kind: guessKindFromUrl(uploaded.path || url),
          width: 0,
          height: 0,
          bytes: 0,
          previewUrl: uploaded.path,
          uploaded,
          status: 'ready',
        },
      ]);
      setLinkUrl('');
      setShowLink(false);
      toast.success('Mídia importada pelo link');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao importar link');
    } finally {
      setLinkLoading(false);
    }
  };

  const removeItem = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key));

  const moveItem = (key: string, dir: -1 | 1) =>
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.key === key);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });

  const fitItem = async (item: MediaItem) => {
    if (!item.file) return;
    patchItem(item.key, { status: 'preparing' });
    try {
      const fitted = await fitImageToFeed({
        file: item.file,
        kind: 'image',
        width: item.width,
        height: item.height,
        previewUrl: item.previewUrl,
      });
      patchItem(item.key, {
        width: fitted.width,
        height: fitted.height,
        bytes: fitted.file.size,
        previewUrl: fitted.previewUrl,
        file: fitted.file,
        uploaded: undefined,
      });
      await uploadPrepared(item.key, fitted);
    } catch (err) {
      patchItem(item.key, { status: 'error', error: err instanceof Error ? err.message : 'Falha ao ajustar' });
    }
  };

  const retryItem = (item: MediaItem) => {
    if (!item.file) return;
    void uploadPrepared(item.key, {
      file: item.file,
      kind: item.kind,
      width: item.width,
      height: item.height,
      previewUrl: item.previewUrl,
    });
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files || []);
    if (files.length > 0) {
      e.preventDefault();
      void addFiles(files);
    }
  };

  const collaborators = useMemo(() => parseCollaborators(collaboratorsRaw), [collaboratorsRaw]);

  const issues = useMemo(
    () =>
      validateIgDraft({
        format,
        caption,
        firstComment: showComment ? firstComment : '',
        collaborators,
        media: items.map((i) => ({ kind: i.kind, width: i.width, height: i.height, bytes: i.bytes })),
      }),
    [format, caption, firstComment, showComment, collaborators, items]
  );

  const pending = items.some((i) => i.status === 'preparing' || i.status === 'uploading');
  const failed = items.some((i) => i.status === 'error');
  const blocking = hasBlockingIssues(issues);
  const hashtagCount = extractHashtags(caption).length + (showComment ? extractHashtags(firstComment).length : 0);
  const selectedAccounts = accounts.filter((a) => accountIds.includes(a.id));
  const handle =
    selectedAccounts[0]?.profile?.replace(/^@/, '') || selectedAccounts[0]?.name || 'seu_perfil';
  const slots = useMemo(() => quickSlots(), []);

  const canSubmit =
    !publishing && !pending && !failed && !blocking && items.length > 0 && selectedAccounts.length > 0;

  const generateCaption = async () => {
    const topic = aiTopic.trim();
    if (!topic) {
      toast.error('Diga em poucas palavras do que é o post.');
      return;
    }
    setAiLoading(true);
    try {
      let nicho = 'geral';
      try {
        nicho = (JSON.parse(localStorage.getItem('sf_brand_settings') || '{}') as { nicho?: string }).nicho || 'geral';
      } catch {
        // sem configurações de marca
      }
      const res = await authFetch('/api/content-studio/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: format === 'feed' ? (items.length > 1 ? 'carrossel' : 'post') : format,
          title: topic,
          objetivo: 'engajamento',
          nicho,
          estrutura: ['Gancho na 1ª linha', 'Benefício', 'Prova ou detalhe', 'CTA'],
          platforms: ['instagram'],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json?.error || 'IA indisponível');
      setCaption(String(json.caption || ''));
      toast.success('Legenda gerada — revise antes de publicar');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao gerar legenda');
    } finally {
      setAiLoading(false);
    }
  };

  const pickNextFreeSlot = async () => {
    const target = selectedAccounts[0];
    if (!target) return;
    setSlotLoading(true);
    try {
      const res = await authFetch(`/api/content-studio/find-slot?integrationId=${encodeURIComponent(target.id)}`);
      const json = await res.json().catch(() => ({}));
      if (!json.success || !json.data?.date) throw new Error(json?.error || 'Sem horário livre');
      const d = new Date(json.data.date);
      if (d.getTime() < Date.now() + 5 * 60_000) d.setTime(Date.now() + 60 * 60_000);
      setWhen('schedule');
      setScheduledLocal(toLocalInputValue(d));
      toast.success(`Próximo horário livre: ${formatWhen(toLocalInputValue(d))}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao buscar horário');
    } finally {
      setSlotLoading(false);
    }
  };

  const resetComposer = () => {
    items.forEach((i) => {
      if (i.previewUrl.startsWith('blob:')) URL.revokeObjectURL(i.previewUrl);
    });
    setItems([]);
    setCaption('');
    setFirstComment('');
    setShowComment(false);
    setCollaboratorsRaw('');
    setFormatTouched(false);
    setFormat('feed');
    setAiTopic('');
    setScheduledLocal(defaultScheduleLocal());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const submit = async () => {
    if (!canSubmit) return;

    let scheduledFor: string | undefined;
    if (when === 'schedule') {
      const d = new Date(scheduledLocal);
      if (Number.isNaN(d.getTime())) {
        toast.error('Data/hora inválida');
        return;
      }
      if (d.getTime() < Date.now() + 60_000) {
        toast.error('Escolha um horário no futuro');
        return;
      }
      scheduledFor = d.toISOString();
    }

    const media = items.map((i) => i.uploaded as UploadedRef);
    const out: PublishResult[] = [];
    setPublishing(true);
    setResults(null);
    try {
      for (const account of selectedAccounts) {
        try {
          const res = await authFetch('/api/content-studio/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              integrationId: account.id,
              integrationType: account.identifier,
              content: format === 'story' ? '' : caption,
              media,
              postType: format === 'story' ? 'story' : 'post',
              scheduledFor,
              draft: when === 'draft',
              firstComment: showComment ? firstComment : undefined,
              collaborators: format === 'story' ? undefined : collaborators,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.success) throw new Error(json?.error || `Falha (${res.status})`);
          out.push({ account: account.name, ok: true });
        } catch (err) {
          out.push({ account: account.name, ok: false, error: err instanceof Error ? err.message : 'Falha' });
        }
      }
    } finally {
      setPublishing(false);
    }

    setResults(out);
    const okCount = out.filter((r) => r.ok).length;
    if (okCount === out.length) {
      const verb = when === 'draft' ? 'Rascunho salvo' : when === 'schedule' ? 'Agendado' : 'Enviado para publicação';
      toast.success(`${verb} em ${out.map((r) => r.account).join(', ')}`);
      resetComposer();
      onPublished?.();
    } else if (okCount > 0) {
      toast.error('Algumas contas falharam — veja os detalhes abaixo.');
      onPublished?.();
    } else {
      toast.error('Nada foi publicado — veja o erro abaixo.');
    }
  };

  const submitLabel =
    when === 'draft'
      ? 'Salvar rascunho'
      : when === 'schedule'
        ? `Agendar · ${formatWhen(scheduledLocal)}`
        : 'Publicar agora';

  const previewItems = items.filter((i) => i.previewUrl);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start" onPaste={onPaste}>
      <div className="space-y-5">
        {accounts.length > 1 && (
          <section className="card-surface p-5">
            <h3 className="text-sm font-semibold text-ink-950">Publicar em</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {accounts.map((acc) => {
                const active = accountIds.includes(acc.id);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() =>
                      setAccountIds((prev) =>
                        prev.includes(acc.id) ? prev.filter((x) => x !== acc.id) : [...prev, acc.id]
                      )
                    }
                    className={clsx(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-signal-500 bg-signal-50 text-signal-700'
                        : 'border-ink-950/10 bg-white text-ink-950/70 hover:border-signal-500/40'
                    )}
                  >
                    {acc.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={acc.picture} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <FiInstagram size={14} />
                    )}
                    {acc.name}
                    {active && <FiCheck size={14} />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="card-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink-950">Formato</h3>
            {!formatTouched && items.length > 0 && (
              <span className="text-xs text-flow-700">sugerido pela mídia</span>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFormat(f.id);
                  setFormatTouched(true);
                }}
                className={clsx(
                  'rounded-lg border px-3 py-2.5 text-left transition-colors',
                  format === f.id
                    ? 'border-signal-500 bg-signal-50'
                    : 'border-ink-950/10 bg-white hover:border-signal-500/40'
                )}
              >
                <p className={clsx('text-sm font-semibold', format === f.id ? 'text-signal-700' : 'text-ink-950')}>
                  {f.label}
                </p>
                <p className="text-xs text-ink-950/50">{f.hint}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="card-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink-950">
              Mídia <span className="font-normal text-ink-950/45">({items.length}/{IG_LIMITS.carouselMax})</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowLink((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-flow-700 hover:text-flow-800"
            >
              <FiLink size={13} /> Enviar por link (vídeo grande)
            </button>
          </div>

          {showLink && (
            <div className="mt-3 rounded-lg border border-flow-500/30 bg-flow-50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addFromLink()}
                  placeholder="https://drive.google.com/file/d/... ou link direto .mp4"
                  className="input-dark !py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addFromLink}
                  disabled={linkLoading || !linkUrl.trim()}
                  className="btn-primary !px-4 !py-2 text-sm disabled:opacity-50"
                >
                  {linkLoading ? <FiLoader className="animate-spin" /> : <FiLink />} Importar
                </button>
              </div>
              <p className="mt-2 text-xs text-flow-800/80">
                Sem limite de 4.4MB: o Postiz baixa direto do link. Google Drive e Dropbox funcionam se o
                arquivo estiver como &quot;qualquer pessoa com o link&quot;.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((item, idx) => {
                const badRatio = item.kind === 'image' && format === 'feed' && !isFeedRatioOk(item.width, item.height);
                return (
                  <li
                    key={item.key}
                    className={clsx(
                      'group relative overflow-hidden rounded-lg border bg-stone-100',
                      item.status === 'error' || badRatio ? 'border-danger-500/50' : 'border-ink-950/10'
                    )}
                  >
                    <div className="relative aspect-square">
                      {item.previewUrl ? (
                        item.kind === 'video' ? (
                          <video src={item.previewUrl} muted playsInline className="h-full w-full object-cover" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.previewUrl} alt={`item ${idx + 1}`} className="h-full w-full object-cover" />
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center text-ink-950/30">
                          {item.kind === 'video' ? <FiFilm size={24} /> : <FiImage size={24} />}
                        </div>
                      )}

                      <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {idx + 1}
                        {item.kind === 'video' ? ' · vídeo' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                        aria-label="Remover"
                      >
                        <FiX size={12} />
                      </button>

                      {(item.status === 'preparing' || item.status === 'uploading') && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/70 text-xs font-medium text-ink-950/70">
                          <FiLoader className="animate-spin" size={18} />
                          {item.status === 'preparing' ? 'Otimizando…' : 'Enviando…'}
                        </div>
                      )}
                      {item.status === 'ready' && (
                        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-flow-600 p-1 text-white" title="Enviado ao Postiz">
                          <FiCheck size={10} />
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 px-2 py-1.5 text-[11px]">
                      <div className="flex items-center justify-between gap-1 text-ink-950/55">
                        <span className="truncate">
                          {ratioLabel(item.width, item.height) || (item.kind === 'video' ? 'vídeo' : 'foto')}
                          {item.bytes ? ` · ${(item.bytes / 1048576).toFixed(1)}MB` : ''}
                        </span>
                        {items.length > 1 && (
                          <span className="flex shrink-0 gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveItem(item.key, -1)}
                              disabled={idx === 0}
                              className="rounded p-0.5 hover:bg-stone-200 disabled:opacity-30"
                              aria-label="Mover para a esquerda"
                            >
                              <FiArrowLeft size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(item.key, 1)}
                              disabled={idx === items.length - 1}
                              className="rounded p-0.5 hover:bg-stone-200 disabled:opacity-30"
                              aria-label="Mover para a direita"
                            >
                              <FiArrowRight size={12} />
                            </button>
                          </span>
                        )}
                      </div>
                      {badRatio && item.file && item.status !== 'preparing' && (
                        <button
                          type="button"
                          onClick={() => fitItem(item)}
                          className="inline-flex items-center gap-1 font-semibold text-signal-700 hover:text-signal-800"
                        >
                          <FiCrop size={11} /> Ajustar ao feed
                        </button>
                      )}
                      {item.status === 'error' && (
                        <div className="text-danger-700">
                          <p className="line-clamp-3">{item.error}</p>
                          {item.file && item.file.size <= IG_LIMITS.directUploadMaxBytes && (
                            <button type="button" onClick={() => retryItem(item)} className="mt-0.5 font-semibold underline">
                              Tentar de novo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {items.length < IG_LIMITS.carouselMax && (
            <label
              className={clsx(
                'mt-3 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 text-center text-sm transition-colors',
                items.length ? 'py-5' : 'py-10',
                dragOver
                  ? 'border-signal-500 bg-signal-50 text-signal-700'
                  : 'border-ink-950/15 text-ink-950/60 hover:border-signal-500/50 hover:text-ink-950'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void addFiles(Array.from(e.dataTransfer.files || []));
              }}
            >
              <FiUpload size={20} />
              <span className="font-medium">
                {items.length ? 'Adicionar mais' : 'Arraste fotos/vídeos, clique ou cole (Ctrl+V)'}
              </span>
              <span className="text-xs text-ink-950/45">
                Várias de uma vez viram carrossel · fotos são convertidas para JPEG 1440px automaticamente
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void addFiles(Array.from(e.target.files || []));
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </section>

        {format !== 'story' && (
          <section className="card-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink-950">Legenda</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className={clsx(caption.length > IG_LIMITS.captionMax ? 'font-semibold text-danger-700' : 'text-ink-950/45')}>
                  {caption.length}/{IG_LIMITS.captionMax}
                </span>
                <span className={clsx(hashtagCount > IG_LIMITS.hashtagsMax ? 'font-semibold text-danger-700' : 'text-ink-950/45')}>
                  # {hashtagCount}/{IG_LIMITS.hashtagsMax}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateCaption()}
                placeholder="Sobre o que é o post? (ex: bolo de pote de ninho, promoção de sexta)"
                className="input-dark !py-2 text-sm"
              />
              <button
                type="button"
                onClick={generateCaption}
                disabled={aiLoading}
                className="btn-secondary shrink-0 !px-4 !py-2 text-sm disabled:opacity-50"
              >
                {aiLoading ? <FiLoader className="animate-spin" /> : <FiZap />} Gerar com IA
              </button>
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={7}
              placeholder="Escreva a legenda. A 1ª linha é o gancho — é o que aparece antes do “mais”."
              className="input-dark mt-3 resize-y text-sm"
            />

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {extractHashtags(caption).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const r = moveHashtagsToComment(caption, firstComment);
                    setCaption(r.caption);
                    setFirstComment(r.firstComment);
                    setShowComment(true);
                    toast.success('Hashtags movidas para o 1º comentário');
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-ink-950/10 px-3 py-1 font-medium text-ink-950/70 hover:border-signal-500/40"
                >
                  <FiHash size={12} /> Mover hashtags para o 1º comentário
                </button>
              )}
              {!showComment && (
                <button
                  type="button"
                  onClick={() => setShowComment(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-ink-950/10 px-3 py-1 font-medium text-ink-950/70 hover:border-signal-500/40"
                >
                  + 1º comentário automático
                </button>
              )}
            </div>

            {showComment && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink-950/70">1º comentário (publicado logo após o post)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowComment(false);
                      setFirstComment('');
                    }}
                    className="text-xs text-ink-950/45 hover:text-ink-950"
                  >
                    remover
                  </button>
                </div>
                <textarea
                  value={firstComment}
                  onChange={(e) => setFirstComment(e.target.value)}
                  rows={2}
                  placeholder="#hashtags ou link/CTA extra"
                  className="input-dark mt-1.5 resize-y text-sm"
                />
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs font-semibold text-ink-950/70">Colaboradores (opcional, até 3)</label>
              <input
                type="text"
                value={collaboratorsRaw}
                onChange={(e) => setCollaboratorsRaw(e.target.value)}
                placeholder="@parceiro, @fornecedor"
                className="input-dark mt-1.5 !py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-ink-950/45">
                O post aparece também no perfil de quem aceitar o convite.
              </p>
            </div>
          </section>
        )}

        <section className="card-surface p-5">
          <h3 className="text-sm font-semibold text-ink-950">Quando</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { id: 'schedule', label: 'Agendar', icon: FiClock },
                { id: 'now', label: 'Publicar agora', icon: FiSend },
                { id: 'draft', label: 'Rascunho no Postiz', icon: FiSave },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setWhen(opt.id)}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
                  when === opt.id
                    ? 'border-signal-500 bg-signal-50 text-signal-700'
                    : 'border-ink-950/10 bg-white text-ink-950/70 hover:border-signal-500/40'
                )}
              >
                <opt.icon size={14} /> {opt.label}
              </button>
            ))}
          </div>

          {when === 'schedule' && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={pickNextFreeSlot}
                  disabled={slotLoading || selectedAccounts.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-full border border-flow-500/40 bg-flow-50 px-3 py-1 text-xs font-semibold text-flow-800 hover:bg-flow-100 disabled:opacity-50"
                >
                  {slotLoading ? <FiLoader className="animate-spin" size={12} /> : <FiZap size={12} />}
                  Próximo horário livre
                </button>
                {slots.map((s) => {
                  const value = toLocalInputValue(s.date);
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setScheduledLocal(value)}
                      className={clsx(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        scheduledLocal === value
                          ? 'border-signal-500 bg-signal-50 text-signal-700'
                          : 'border-ink-950/10 text-ink-950/70 hover:border-signal-500/40'
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="datetime-local"
                value={scheduledLocal}
                min={toLocalInputValue(new Date())}
                onChange={(e) => setScheduledLocal(e.target.value)}
                className="input-dark max-w-xs !py-2 text-sm"
              />
            </div>
          )}
          {when === 'draft' && (
            <p className="mt-3 text-xs text-ink-950/55">
              Fica salvo no calendário do Postiz sem data — dá para revisar e agendar depois.
            </p>
          )}
        </section>

        {issues.length > 0 && (
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li
                key={issue.message}
                className={clsx(
                  'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                  issue.level === 'error'
                    ? 'border-danger-500/30 bg-danger-50 text-danger-700'
                    : 'border-gold-500/30 bg-gold-50 text-ink-950/75'
                )}
              >
                {issue.level === 'error' ? (
                  <FiAlertCircle className="mt-0.5 shrink-0" />
                ) : (
                  <FiAlertTriangle className="mt-0.5 shrink-0 text-gold-600" />
                )}
                {issue.message}
              </li>
            ))}
          </ul>
        )}

        {results && results.some((r) => !r.ok) && (
          <ul className="space-y-2 rounded-lg border border-danger-500/30 bg-danger-50 p-3 text-sm">
            {results.map((r) => (
              <li key={r.account} className={r.ok ? 'text-flow-800' : 'text-danger-700'}>
                {r.ok ? <FiCheckCircle className="mr-1 inline" /> : <FiAlertCircle className="mr-1 inline" />}
                <strong>{r.account}:</strong> {r.ok ? 'ok' : r.error}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={submit} disabled={!canSubmit} className="btn-primary disabled:opacity-50">
            {publishing ? <FiLoader className="animate-spin" /> : when === 'now' ? <FiSend /> : when === 'draft' ? <FiSave /> : <FiClock />}
            {publishing ? 'Enviando…' : submitLabel}
          </button>
          {(items.length > 0 || caption) && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Limpar o post atual?')) resetComposer();
              }}
              className="btn-secondary !py-2.5 text-sm"
            >
              Limpar
            </button>
          )}
          <p className="text-xs text-ink-950/50">
            {selectedAccounts.length === 0
              ? 'Selecione uma conta.'
              : pending
                ? 'Aguardando o envio da mídia…'
                : failed
                  ? 'Resolva os itens com erro.'
                  : blocking
                    ? 'Corrija os pontos em vermelho.'
                    : 'Rascunho salvo automaticamente neste navegador.'}
          </p>
        </div>
      </div>

      <PostPreview
        className="lg:sticky lg:top-4"
        images={previewItems.map((i) => i.previewUrl)}
        kinds={previewItems.map((i) => i.kind)}
        caption={format === 'story' ? '' : caption}
        firstComment={format !== 'story' && showComment ? firstComment : ''}
        handle={handle}
        variant={format === 'story' ? 'story' : 'feed'}
        showBadge={false}
      />
    </div>
  );
}
