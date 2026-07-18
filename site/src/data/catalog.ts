import { Product } from '@/types';

export type CatalogProduct = Product & {
  /** Página de vendas no SocialFlow */
  href?: string;
  /** Checkout externo (Hotmart/Kiwify/site original) */
  checkoutUrl?: string;
  kind?: 'course' | 'product';
};

const now = new Date('2026-01-01T00:00:00.000Z');

/** Catálogo local — funciona sem o backend JETBOT. */
export const catalogProducts: CatalogProduct[] = [
  {
    id: 'curso-do-zero-ao-lucro-ml',
    name: 'Do Zero ao Lucro no Mercado Livre',
    slug: 'do-zero-ao-lucro',
    description:
      'Curso completo com Gabriel Abrão para criar um negócio lucrativo no Mercado Livre do zero — nicho, anúncios, ads, logística e fornecedores.',
    price: 197,
    cost: 264,
    category: 'cursos',
    image: '/courses/do-zero-ao-lucro.svg',
    images: ['/courses/do-zero-ao-lucro.svg'],
    stock: 999,
    sku: 'CURSO-ML-DZAL',
    benefits: [
      '+30 videoaulas com Gabriel Abrão',
      'Atualizações vitalícias do conteúdo',
      'Suporte no grupo VIP',
      'Garantia incondicional de 7 dias',
      'Bônus: modelos de descrição, IAs e contatos de fornecedores',
    ],
    faqs: [
      {
        question: 'Preciso ter CNPJ para começar?',
        answer:
          'Não. O curso ensina para CPF e CNPJ. Você pode começar como pessoa física e migrar depois.',
      },
      {
        question: 'Preciso investir muito em estoque?',
        answer:
          'Não. Mostramos como começar com baixo investimento e validar produtos antes de grandes aportes.',
      },
      {
        question: 'O curso serve para iniciantes?',
        answer:
          'Sim. Foi feito do zero, passo a passo, sem exigir experiência prévia em e-commerce.',
      },
      {
        question: 'Quanto tempo tenho de acesso?',
        answer: 'Acesso vitalício, incluindo atualizações futuras do conteúdo.',
      },
      {
        question: 'Existe suporte se eu tiver dúvidas?',
        answer: 'Sim. Suporte no grupo VIP no Telegram, com respostas diretas.',
      },
      {
        question: 'Como funciona a garantia?',
        answer:
          '7 dias de garantia incondicional. Se não for para você, devolvemos 100% do valor.',
      },
    ],
    socialProof: {
      testimonials: [
        {
          name: 'Aluno ML',
          text: 'Método claro do zero ao primeiro faturamento no Mercado Livre.',
          rating: 5,
        },
      ],
      reviews: 1000,
      rating: 4.9,
      customers: 1000,
    },
    warranty: '7 dias de garantia incondicional',
    idealFor: 'Iniciantes e empreendedores que querem vender no Mercado Livre',
    conditions: ['Acesso digital imediato após confirmação do pagamento'],
    active: true,
    createdAt: now,
    updatedAt: now,
    href: '/cursos/do-zero-ao-lucro',
    checkoutUrl: 'https://dozeroaolucroml.com.br/',
    kind: 'course',
  },
];

export function getCatalogProduct(slug: string): CatalogProduct | undefined {
  return catalogProducts.find((p) => p.slug === slug && p.active);
}

export function listCatalogProducts(category?: string): CatalogProduct[] {
  return catalogProducts.filter(
    (p) => p.active && (!category || category === 'all' || p.category === category)
  );
}
