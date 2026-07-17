/** Helpers de plataforma Postiz — seguros para client e server. */

const INSTAGRAM_TYPES = new Set(['instagram', 'instagram-standalone']);

export function isInstagramIntegration(identifier: string): boolean {
  const id = String(identifier || '').toLowerCase();
  return INSTAGRAM_TYPES.has(id) || id.includes('instagram');
}

export function isTikTokIntegration(identifier: string): boolean {
  const id = String(identifier || '').toLowerCase();
  return id === 'tiktok' || id.includes('tiktok');
}

export function platformLabel(identifier: string): string {
  if (isTikTokIntegration(identifier)) return 'TikTok';
  if (isInstagramIntegration(identifier)) return 'Instagram';
  return identifier || 'Canal';
}
