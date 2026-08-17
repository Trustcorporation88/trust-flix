/**
 * Monta o "TESTE" visual de cada skill do Copilot.
 * Isolado de axios/Postiz para os scripts de teste rodarem sem node_modules completo.
 */

import { extractCaption } from './textClean';

export type PreviewKind =
  | 'feed'
  | 'captions'
  | 'reels'
  | 'hashtags'
  | 'plan'
  | 'trends'
  | 'improve'
  | 'ideas'
  | 'schedule'
  | 'text';

export const PREVIEW_LABEL: Record<PreviewKind, string> = {
  feed: 'Post Instagram',
  captions: 'Legendas',
  reels: 'Reels',
  hashtags: 'Hashtags',
  plan: 'Plano da semana',
  trends: 'Reels em alta',
  improve: 'Texto melhorado',
  ideas: 'Ideias',
  schedule: 'Agendamento',
  text: 'Resultado',
};

export function previewKindFromRoute(kind?: string, id?: string): PreviewKind {
  if (kind === 'skill') {
    switch (id) {
      case 'post':
        return 'feed';
      case 'caption':
        return 'captions';
      case 'reels':
      case 'reels-pipeline':
        return 'reels';
      case 'hashtags':
        return 'hashtags';
      case 'plan':
        return 'plan';
      case 'trends':
        return 'trends';
      case 'improve':
        return 'improve';
      case 'profile-ideas':
        return 'ideas';
      case 'agendar':
        return 'schedule';
      default:
        return 'text';
    }
  }
  return 'text';
}

export function extractHashtags(text: string): string[] {
  const raw = text.match(/#[^\s#]+/g) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const h of raw) {
    const tag = h.replace(/[.,;:!?)"']+$/g, '');
    const key = tag.toLowerCase();
    if (tag.length > 1 && !seen.has(key)) {
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
}

/** Quebra respostas numeradas (1. / 2) / Legenda 1:). */
export function extractNumberedItems(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  const parts = clean.split(
    /^\s*(?:\d+[\).:\]]\s+|legenda\s+\d+\s*[:.\-–—]\s*|ideia\s+\d+\s*[:.\-–—]\s*|formato\s+\d+\s*[:.\-–—]\s*)/gim
  );
  const items = parts
    .slice(1)
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length >= 2) return items;
  return [clean];
}

export function extractPlanDays(text: string): { day: string; body: string }[] {
  const lines = text.replace(/\r\n/g, '\n');
  const re =
    /^(segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[aá]bado|domingo|dia\s*\d+)\b[^\n]*/gim;
  const matches = [...lines.matchAll(re)];
  if (matches.length >= 2) {
    return matches.map((m, i) => {
      const start = m.index ?? 0;
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? lines.length) : lines.length;
      const block = lines.slice(start, end).trim();
      return { day: block.split('\n')[0].trim().slice(0, 48), body: block };
    });
  }
  const items = extractNumberedItems(text);
  if (items.length >= 3) {
    return items.map((body, i) => ({ day: `Dia ${i + 1}`, body }));
  }
  return [];
}

function extractSection(text: string, titles: string[], stop: string[]): string {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = titles.map(esc).join('|');
  const end = stop.map(esc).join('|');
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:${start})\\s*:?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:${end})\\s*:?|$)`,
    'i'
  );
  return text.match(re)?.[1]?.trim() ?? '';
}

export function extractImprove(text: string): {
  diagnosis: string;
  rewrite: string;
  changes: string;
} {
  const diagnosis = extractSection(
    text,
    ['Diagnóstico', 'Diagnostico'],
    ['Versão reescrita', 'Versao reescrita', 'Texto reescrito', 'O que mudei']
  );
  const rewrite = extractSection(
    text,
    ['Versão reescrita', 'Versao reescrita', 'Texto reescrito'],
    ['O que mudei e por quê', 'O que mudei e por que', 'O que mudei', 'Diagnóstico']
  );
  const changes = extractSection(
    text,
    ['O que mudei e por quê', 'O que mudei e por que', 'O que mudei'],
    ['Diagnóstico', 'Versão reescrita', 'Versao reescrita']
  );
  return {
    diagnosis,
    rewrite: rewrite || extractCaption(text),
    changes,
  };
}

export function extractIdeaCards(text: string): { title: string; body: string }[] {
  const named = text.replace(/\r\n/g, '\n').split(/(?=^\s*\[[^\]]+\]\s*·)/m);
  const namedItems = named
    .map((s) => s.trim())
    .filter((s) => /^\s*\[[^\]]+\]/.test(s));
  if (namedItems.length >= 2) {
    return namedItems.map((body) => ({
      title: (body.match(/^\s*\[([^\]]+)\]/)?.[1] || body.split('\n')[0]).slice(0, 80),
      body,
    }));
  }
  const items = extractNumberedItems(text);
  return items.map((body, i) => ({
    title: body.split('\n')[0].replace(/^\[|\]$/g, '').slice(0, 80) || `Ideia ${i + 1}`,
    body,
  }));
}

export function extractVideoLinks(text: string): { url: string; title: string }[] {
  const urls = text.match(/https?:\/\/[^\s)>\]]+/g) ?? [];
  const out: { url: string; title: string }[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const url = raw.replace(/[.,;:!?)]+$/g, '');
    if (seen.has(url)) continue;
    const video =
      /instagram\.com\/(reel|p|tv)\//i.test(url) ||
      /tiktok\.com\//i.test(url) ||
      /youtube\.com\/shorts\//i.test(url) ||
      /youtu\.be\//i.test(url);
    if (!video) continue;
    seen.add(url);
    out.push({ url, title: url });
  }
  return out;
}

export type PreviewVideo = { url: string; title: string };

export interface SkillPreviewModel {
  kind: PreviewKind;
  label: string;
  captions: string[];
  hashtags: string[];
  days: { day: string; body: string }[];
  videos: PreviewVideo[];
  diagnosis: string;
  rewrite: string;
  changes: string;
  ideas: { title: string; body: string }[];
  feedCaption: string;
}

export function buildSkillPreview(input: {
  routeKind?: string;
  skillId?: string;
  content: string;
  videoSources?: PreviewVideo[];
}): SkillPreviewModel {
  const kind = previewKindFromRoute(input.routeKind, input.skillId);
  const content = input.content || '';
  const improve = extractImprove(content);
  const numbered = extractNumberedItems(content);
  const fromContent = extractVideoLinks(content);
  const extra = input.videoSources ?? [];
  const videos: PreviewVideo[] = [];
  const seen = new Set<string>();
  for (const v of [...extra, ...fromContent]) {
    if (!v.url || seen.has(v.url)) continue;
    seen.add(v.url);
    videos.push(v);
  }

  return {
    kind,
    label: PREVIEW_LABEL[kind],
    captions: kind === 'captions' ? numbered : numbered.slice(0, 1),
    hashtags: extractHashtags(content),
    days: extractPlanDays(content),
    videos,
    diagnosis: improve.diagnosis,
    rewrite: improve.rewrite,
    changes: improve.changes,
    ideas: extractIdeaCards(content),
    feedCaption: extractCaption(content),
  };
}
