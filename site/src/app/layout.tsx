import type { Metadata } from 'next';
import { Figtree, Syne } from 'next/font/google';
import { Providers } from './providers';
import { Layout } from '@/components/common/Layout';
import './globals.css';

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'SocialFlow — Conteúdo, vendas e automação em um fluxo',
  description:
    'SocialFlow une Content Studio, agentes de IA, Instagram e WhatsApp para criar, publicar e vender sem trocar de ferramenta.',
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
    <html lang="pt-BR" className={`${figtree.variable} ${syne.variable}`}>
      <body className="bg-stone-50 font-sans text-ink-950 antialiased">
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
