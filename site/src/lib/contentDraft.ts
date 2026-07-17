const DRAFT_KEY = 'sf_content_draft';

export interface ContentDraft {
  caption?: string;
  source?: string;
  savedAt?: number;
}

export function saveContentDraft(draft: ContentDraft): void {
  if (typeof window === 'undefined') return;
  const payload: ContentDraft = {
    ...draft,
    savedAt: Date.now(),
  };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
}

export function loadContentDraft(): ContentDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ContentDraft;
  } catch {
    return null;
  }
}

export function clearContentDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(DRAFT_KEY);
}
