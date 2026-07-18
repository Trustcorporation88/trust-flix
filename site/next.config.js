/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  },
  images: {
    domains: ['localhost', 'vercel.app', 'socialflow.site', 'www.socialflow.site'],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Não force localhost aqui: na Vercel isso faz o browser chamar http://localhost:3000
  // e o axios devolve "Network Error". Deixe vazio para usar rotas relativas /api.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    NEXT_PUBLIC_JETBOT_API: process.env.NEXT_PUBLIC_JETBOT_API || '',
  },
};

module.exports = nextConfig;
