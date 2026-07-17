const STORAGE_KEY = 'sf_custom_templates';

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  const next = [template, ...list].slice(0, 80);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return template;
}

export function deleteCustomTemplate(id: string): void {
  const next = listCustomTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
