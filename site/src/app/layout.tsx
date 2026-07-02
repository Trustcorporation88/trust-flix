import type { Metadata } from 'next';
import { Manrope, Sora } from 'next/font/google';
import { Providers } from './providers';
import { Layout } from '@/components/common/Layout';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TrustFlix — Vendas Automatizadas com IA',
  description:
    'Agentes de IA, criativos e automação de Instagram e WhatsApp em uma única plataforma. Venda mais, com menos esforço.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${sora.variable} dark`}>
      <body className="bg-ink-950 font-sans">
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
