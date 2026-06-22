import type { Metadata } from 'next';
import { Providers } from './providers';
import { Layout } from '@/components/common/Layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustFlix - Plataforma de Vendas Automática',
  description: 'Venda e gerencie seus produtos com automação via WhatsApp',
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
    <html lang="pt-BR">
      <body>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
