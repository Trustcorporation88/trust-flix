import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SocialFlow — Postar no Instagram',
    short_name: 'SocialFlow',
    description: 'Crie, agende e publique no Instagram pelo celular.',
    start_url: '/dashboard/instagram?tab=publish',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f4f2',
    theme_color: '#101114',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
