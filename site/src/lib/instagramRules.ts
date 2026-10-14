/**
 * Regras de publicação do Instagram (Graph API / Content Publishing) usadas
 * para validar o post ANTES de mandar ao Postiz — o Instagram recusa em
 * silêncio no horário agendado e o post aparece como "erro" horas depois.
 *
 * Seguro para client e server (sem DOM).
 */

export const IG_LIMITS = {
  captionMax: 2200,
  hashtagsMax: 30,
  mentionsMax: 20,
  carouselMin: 2,
  carouselMax: 10,
  /** Feed aceita de 4:5 (retrato) até 1.91:1 (paisagem). */
  feedRatioMin: 0.8,
  feedRatioMax: 1.91,
  /** Instagram exibe no máximo 1440px de largura — acima disso é peso à toa. */
  imageMaxEdge: 1440,
  /** Content Publishing API só aceita JPEG até 8MB. */
  imageMaxBytes: 8 * 1024 * 1024,
  /** Limite de corpo de requisição das funções da Vercel. */
  directUploadMaxBytes: 4.4 * 1024 * 1024,
  firstCommentMax: 2200,
  collaboratorsMax: 3,
} as const;

export type IgFormat = 'feed' | 'reel' | 'story';

export interface IgMediaInfo {
  kind: 'image' | 'video';
  width?: number;
  height?: number;
  bytes?: number;
}

export interface IgIssue {
  level: 'error' | 'warning';
  message: string;
}

export interface IgDraft {
  format: IgFormat;
  caption: string;
  firstComment?: string;
  collaborators?: string[];
  media: IgMediaInfo[];
}

const HASHTAG_RE = /(^|[^\wÀ-ÖØ-öø-ÿ&])#([\wÀ-ÖØ-öø-ÿ]+)/g;
const MENTION_RE = /(^|[^\wÀ-ÖØ-öø-ÿ.])@([A-Za-z0-9_.]{1,30})/g;

export function extractHashtags(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(HASHTAG_RE)) out.push(`#${m[2]}`);
  return out;
}

export function extractMentions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(MENTION_RE)) out.push(`@${m[2]}`);
  return out;
}

/** Normaliza "@fulano, ciclana" → ["fulano", "ciclana"] (sem duplicados). */
export function parseCollaborators(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[\s,;]+/)) {
    const handle = part.trim().replace(/^@+/, '').toLowerCase();
    if (/^[a-z0-9_.]{1,30}$/.test(handle)) seen.add(handle);
  }
  return Array.from(seen);
}

/**
 * Tira as hashtags da legenda e devolve-as num bloco para o 1º comentário,
 * deixando a legenda limpa (prática comum para não poluir o texto).
 */
export function moveHashtagsToComment(caption: string, existingComment = ''): {
  caption: string;
  firstComment: string;
} {
  const tags = extractHashtags(caption);
  if (tags.length === 0) return { caption, firstComment: existingComment };

  const cleaned = caption
    .replace(HASHTAG_RE, '$1')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, '').replace(/[ \t]{2,}/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const already = new Set(extractHashtags(existingComment).map((t) => t.toLowerCase()));
  const fresh = tags.filter((t) => {
    const k = t.toLowerCase();
    if (already.has(k)) return false;
    already.add(k);
    return true;
  });

  const firstComment = [existingComment.trim(), fresh.join(' ')].filter(Boolean).join('\n');
  return { caption: cleaned, firstComment };
}

export function ratioLabel(width?: number, height?: number): string {
  if (!width || !height) return '';
  const r = width / height;
  if (Math.abs(r - 9 / 16) < 0.03) return '9:16';
  if (Math.abs(r - 0.8) < 0.02) return '4:5';
  if (Math.abs(r - 1) < 0.02) return '1:1';
  if (Math.abs(r - 1.91) < 0.03) return '1.91:1';
  if (Math.abs(r - 16 / 9) < 0.03) return '16:9';
  return r < 1 ? `retrato ${r.toFixed(2)}` : `paisagem ${r.toFixed(2)}`;
}

export function isFeedRatioOk(width?: number, height?: number): boolean {
  if (!width || !height) return true;
  const r = width / height;
  return r >= IG_LIMITS.feedRatioMin - 0.01 && r <= IG_LIMITS.feedRatioMax + 0.01;
}

/** Formato sugerido a partir da mídia escolhida. */
export function suggestFormat(media: IgMediaInfo[]): IgFormat {
  if (media.length === 1 && media[0].kind === 'video') return 'reel';
  return 'feed';
}

export function validateIgDraft(draft: IgDraft): IgIssue[] {
  const issues: IgIssue[] = [];
  const { format, media } = draft;
  const caption = draft.caption || '';
  const firstComment = draft.firstComment || '';
  const err = (message: string) => issues.push({ level: 'error', message });
  const warn = (message: string) => issues.push({ level: 'warning', message });

  if (media.length === 0) {
    err('Adicione ao menos uma foto ou vídeo — o Instagram não aceita post só de texto.');
  }

  if (format === 'story') {
    if (media.length > 1) err('Story aceita 1 mídia por vez. Remova as extras ou mude para Feed (carrossel).');
    if (caption.trim()) warn('Stories não mostram legenda — o texto será ignorado pelo Instagram.');
  }

  if (format === 'reel') {
    if (media.length !== 1 || media[0]?.kind !== 'video') {
      err('Reel precisa de exatamente 1 vídeo.');
    } else {
      const v = media[0];
      if (v.width && v.height && v.width / v.height > 0.6) {
        warn('Reels rendem mais em vertical 9:16 (1080×1920). Este vídeo vai aparecer com bordas.');
      }
    }
  }

  if (format === 'feed') {
    if (media.length > IG_LIMITS.carouselMax) {
      err(`Carrossel aceita no máximo ${IG_LIMITS.carouselMax} itens (você tem ${media.length}).`);
    }
    if (media.length === 1 && media[0].kind === 'video') {
      warn('Vídeo único no feed é publicado como Reel pelo Instagram.');
    }
    media.forEach((m, i) => {
      if (m.kind === 'image' && !isFeedRatioOk(m.width, m.height)) {
        err(
          `${media.length > 1 ? `Item ${i + 1}: ` : ''}proporção ${ratioLabel(m.width, m.height)} fora do feed (aceita de 4:5 a 1.91:1). Use "Ajustar ao feed".`
        );
      }
    });
    if (media.length > 1) {
      const ratios = media
        .filter((m) => m.width && m.height)
        .map((m) => ratioLabel(m.width, m.height));
      if (new Set(ratios).size > 1) {
        warn('Fotos com proporções diferentes no carrossel — o Instagram corta todas pela primeira.');
      }
    }
  }

  media.forEach((m, i) => {
    if (m.kind === 'image' && m.bytes && m.bytes > IG_LIMITS.imageMaxBytes) {
      err(`Foto ${i + 1} passa de 8MB — o Instagram recusa.`);
    }
  });

  if (format !== 'story') {
    if (caption.length > IG_LIMITS.captionMax) {
      err(`Legenda com ${caption.length} caracteres — o máximo é ${IG_LIMITS.captionMax}.`);
    }
    const tags = extractHashtags(caption).length + extractHashtags(firstComment).length;
    if (tags > IG_LIMITS.hashtagsMax) {
      err(`${tags} hashtags — o Instagram aceita no máximo ${IG_LIMITS.hashtagsMax} (legenda + 1º comentário).`);
    } else if (tags > 15) {
      warn(`${tags} hashtags: o Instagram hoje recomenda de 3 a 5 bem específicas.`);
    }
    const mentions = extractMentions(caption).length;
    if (mentions > IG_LIMITS.mentionsMax) {
      err(`${mentions} menções — o máximo por legenda é ${IG_LIMITS.mentionsMax}.`);
    }
    if (!caption.trim()) warn('Post sem legenda: uma frase + chamada para ação aumenta o alcance.');
  }

  if (firstComment.length > IG_LIMITS.firstCommentMax) {
    err(`1º comentário com ${firstComment.length} caracteres — máximo ${IG_LIMITS.firstCommentMax}.`);
  }

  const collabs = draft.collaborators || [];
  if (collabs.length > IG_LIMITS.collaboratorsMax) {
    err(`Máximo de ${IG_LIMITS.collaboratorsMax} colaboradores por post.`);
  }
  if (collabs.length > 0 && format === 'story') {
    err('Colaboradores não funcionam em Stories.');
  }

  return issues;
}

export function hasBlockingIssues(issues: IgIssue[]): boolean {
  return issues.some((i) => i.level === 'error');
}

export interface QuickSlot {
  label: string;
  date: Date;
}

/**
 * Atalhos de horário com bom alcance no Brasil (almoço, fim de tarde, noite).
 * Só devolve horários pelo menos 15 min no futuro.
 */
export function quickSlots(now: Date = new Date()): QuickSlot[] {
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const candidates: QuickSlot[] = [
    { label: 'Hoje 12h', date: at(0, 12) },
    { label: 'Hoje 18h', date: at(0, 18) },
    { label: 'Hoje 20h', date: at(0, 20) },
    { label: 'Amanhã 9h', date: at(1, 9) },
    { label: 'Amanhã 12h', date: at(1, 12) },
    { label: 'Amanhã 19h', date: at(1, 19) },
  ];
  const minTime = now.getTime() + 15 * 60_000;
  return candidates.filter((s) => s.date.getTime() >= minTime).slice(0, 4);
}
