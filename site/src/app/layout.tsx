import type { Metadata } from 'next';
import { Providers } from './providers';
import { Layout } from '@/components/common/Layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'JetFlix - Plataforma de Vendas Automática',
  description: 'Venda e gerencie seus produtos com automação via WhatsApp',
  icons: {
    icon: '/favicon.ico',
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
