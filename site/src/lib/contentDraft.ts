const DRAFT_KEY = 'sf_content_draft';

/** Referência de mídia já enviada ao Postiz (POST /upload). */
export interface DraftMedia {
  id: string;
  path: string;
}

export interface ContentDraft {
  caption?: string;
  /** Título curto para TikTok (máx 90 chars). */
  tiktokTitle?: string;
  /**
   * Mídia JÁ ENVIADA ao Postiz. Guardamos a referência {id, path} em vez do
   * arquivo/base64 porque sessionStorage tem limite de poucos MB — uma foto de
   * celular em data URL estouraria a cota e o draft seria perdido em silêncio.
   */
  media?: DraftMedia[];
  source?: string;
  savedAt?: number;
}

export function saveContentDraft(draft: ContentDraft): void {
  if (typeof window === 'undefined') return;
  const payload: ContentDraft = {
    ...draft,
    savedAt: Date.now(),
  };
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // Cota estourada: tenta de novo sem a mídia, preservando ao menos o texto.
    try {
      const { media, ...withoutMedia } = payload;
      void media;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(withoutMedia));
    } catch {
      /* desiste silenciosamente — o usuário ainda pode copiar o texto */
    }
  }
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
