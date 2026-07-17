const STORAGE_KEY = 'sf_custom_templates';
const EXPORT_VERSION = 1;

export interface CustomTemplateInput {
  format: 'reel' | 'story' | 'post';
  title: string;
  objetivo: string;
  descricao: string;
  estrutura: string[];
  duracaoSugerida: string;
  tags: string[];
  sourceNote?: string;
}

export interface CustomTemplate extends CustomTemplateInput {
  id: string;
  trendScore: number;
  custom: true;
  createdAt: string;
}

export interface CustomTemplatesExport {
  version: number;
  exportedAt: string;
  templates: CustomTemplate[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function isValidTemplate(item: unknown): item is CustomTemplate {
  if (!item || typeof item !== 'object') return false;
  const t = item as Partial<CustomTemplate>;
  return (
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    Array.isArray(t.estrutura) &&
    (t.format === 'reel' || t.format === 'story' || t.format === 'post')
  );
}

/** Quebra texto colado (do Instagram / anotações) em passos de estrutura. */
export function parseEstruturaFromText(raw: string): string[] {
  return String(raw || '')
    .split(/\r?\n|•|->|→|;/)
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function listCustomTemplates(): CustomTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidTemplate) : [];
  } catch {
    return [];
  }
}

function persist(list: CustomTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 80)));
}

export function saveCustomTemplate(input: CustomTemplateInput): CustomTemplate {
  const list = listCustomTemplates();
  const template: CustomTemplate = {
    ...input,
    id: `custom-${slugify(input.title) || 'modelo'}-${Date.now().toString(36)}`,
    trendScore: 99,
    custom: true,
    createdAt: new Date().toISOString(),
  };
  persist([template, ...list]);
  return template;
}

export function deleteCustomTemplate(id: string): void {
  persist(listCustomTemplates().filter((t) => t.id !== id));
}

/** Gera JSON baixável com todos os modelos personalizados. */
export function exportCustomTemplatesJson(): string {
  const payload: CustomTemplatesExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    templates: listCustomTemplates(),
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadCustomTemplates(): number {
  const list = listCustomTemplates();
  const blob = new Blob([exportCustomTemplatesJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `socialflow-modelos-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return list.length;
}

/**
 * Importa modelos de um JSON (export SocialFlow ou array puro).
 * mode=merge: adiciona sem duplicar por id; mode=replace: substitui tudo.
 */
export function importCustomTemplatesJson(
  raw: string,
  mode: 'merge' | 'replace' = 'merge'
): { imported: number; total: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('JSON inválido');
  }

  let incoming: unknown[] = [];
  if (Array.isArray(parsed)) {
    incoming = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as CustomTemplatesExport).templates)) {
    incoming = (parsed as CustomTemplatesExport).templates;
  } else {
    throw new Error('Formato esperado: { templates: [...] } ou um array de modelos');
  }

  const valid = incoming
    .filter(isValidTemplate)
    .map((t) => ({
      ...t,
      custom: true as const,
      trendScore: typeof t.trendScore === 'number' ? t.trendScore : 99,
      createdAt: t.createdAt || new Date().toISOString(),
      estrutura: t.estrutura.filter(Boolean).slice(0, 12),
      tags: Array.isArray(t.tags) ? t.tags : [],
    }));

  if (valid.length === 0) {
    throw new Error('Nenhum modelo válido encontrado no arquivo');
  }

  if (mode === 'replace') {
    persist(valid);
    return { imported: valid.length, total: valid.length };
  }

  const existing = listCustomTemplates();
  const ids = new Set(existing.map((t) => t.id));
  const fresh = valid.filter((t) => !ids.has(t.id));
  // Se o id já existe, gera novo id para não perder o import
  const renamed = valid
    .filter((t) => ids.has(t.id))
    .map((t) => ({
      ...t,
      id: `custom-${slugify(t.title) || 'modelo'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    }));
  const next = [...renamed, ...fresh, ...existing];
  persist(next);
  return { imported: fresh.length + renamed.length, total: next.length };
}
