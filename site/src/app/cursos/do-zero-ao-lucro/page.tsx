import Link from 'next/link';
import type { Metadata } from 'next';
import { catalogProducts } from '@/data/catalog';

const course = catalogProducts.find((p) => p.slug === 'do-zero-ao-lucro')!;
const checkoutUrl = course.checkoutUrl || 'https://dozeroaolucroml.com.br/';

export const metadata: Metadata = {
  title: 'Do Zero ao Lucro no Mercado Livre | SocialFlow',
  description: course.description,
};

const modules = [
  'Introdução e Preparação',
  'Desbravando o Mercado Livre',
  'Criando Anúncios Irresistíveis',
  'Marketing e Estratégia',
  'Experiência do Cliente e Embalagem',
  'Importação simplificada',
  'Bônus: Contato do Fornecedor',
];

const learn = [
  { title: 'Fundamentos do Mercado Livre', text: 'Como a plataforma funciona e onde estão as oportunidades.' },
  { title: 'Nicho e produto', text: 'Métodos validados para encontrar o que realmente lucra.' },
  { title: 'Anúncios que vendem', text: 'Copy e estrutura de anúncio que convertem.' },
  { title: 'Precificação e lucro', text: 'Margem saudável sem perder competitividade.' },
  { title: 'Ads e escala', text: 'Campanhas para acelerar vendas com controle.' },
  { title: 'Logística e envio', text: 'Operação limpa para avaliação e recompra.' },
  { title: 'Ferramentas e IA', text: 'Automações que economizam tempo no dia a dia.' },
  { title: 'Fornecedores', text: 'Contatos nacionais e internacionais verificados.' },
];

const bonuses = [
  { title: 'Modelos de descrição prontos', value: 67 },
  { title: 'Ferramentas e IA para automatizar', value: 197 },
  { title: 'Contato de fornecedor nacional', value: 147 },
  { title: 'Contato de fornecedor internacional', value: 247 },
];

function money(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DoZeroAoLucroPage() {
  return (
    <div className="bg-stone-50 text-ink-950">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:pt-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(226,61,18,0.18),transparent_50%),radial-gradient(ellipse_at_10%_80%,rgba(47,118,111,0.16),transparent_45%),linear-gradient(165deg,#f4f4f2,#e8ebe9_55%,#ddd9d2)]" />
        <div className="sf-grain pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="section-badge">Curso · Mercado Livre</p>
            <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
              Do Zero ao Lucro
              <span className="block text-signal-500">no Mercado Livre</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-950/70">
              Aprenda com Gabriel Abrão o passo a passo para criar um negócio lucrativo do zero —
              anúncios, ads, logística e fornecedores.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Quero começar agora
              </a>
              <a href="#modulos" className="btn-secondary">
                Ver módulos
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-950/55">
              +1.000 alunos · 4.9/5 · garantia de 7 dias
            </p>
          </div>

          <div className="rounded-2xl border border-ink-950/10 bg-ink-950 p-6 text-white shadow-[0_24px_60px_-30px_rgba(16,17,20,0.55)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-400">
              Oferta
            </p>
            <p className="mt-3 text-sm text-white/50 line-through">{money(course.cost || 264)}</p>
            <p className="font-display text-5xl font-bold">{money(course.price)}</p>
            <ul className="mt-5 space-y-2 text-sm text-white/75">
              {course.benefits.slice(0, 5).map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-flow-400">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-6 w-full text-center"
            >
              Garantir acesso
            </a>
            <p className="mt-3 text-center text-xs text-white/45">
              Checkout seguro no site oficial do curso
            </p>
          </div>
        </div>
      </section>

      {/* Learn */}
      <section className="border-t border-ink-950/10 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="section-badge">O método</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            O que você vai aprender
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {learn.map((item, i) => (
              <div key={item.title} className="border-t border-ink-950/15 pt-5">
                <p className="font-display text-sm font-semibold text-signal-500">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-950/60">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instructor */}
      <section className="bg-ink-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-400">
            Instrutor
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Gabriel Abrão</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
            Empreendedor digital especializado em Mercado Livre. Transformou e-commerce em um
            negócio de 6 dígitos e hoje ensina o método para outros replicarem.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              ['R$ 100K+', 'Faturamento acumulado'],
              ['1000+', 'Alunos'],
              ['4.9★', 'Avaliação'],
            ].map(([v, l]) => (
              <div key={l} className="border-t border-white/15 pt-4">
                <p className="font-display text-3xl font-bold">{v}</p>
                <p className="mt-1 text-sm text-white/55">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modulos" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="section-badge">Conteúdo</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Módulos do curso
          </h2>
          <ol className="mt-10 space-y-3">
            {modules.map((name, i) => (
              <li
                key={name}
                className="flex items-center gap-4 rounded-xl border border-ink-950/10 bg-white px-5 py-4"
              >
                <span className="font-display text-lg font-bold text-signal-500">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-medium">{name}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bonuses */}
      <section className="border-t border-ink-950/10 bg-stone-100 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="section-badge">Bônus</p>
          <h2 className="mt-3 font-display text-3xl font-bold">Comprando hoje você leva</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {bonuses.map((b) => (
              <div
                key={b.title}
                className="flex items-center justify-between rounded-xl border border-ink-950/10 bg-white px-5 py-4"
              >
                <p className="font-medium">{b.title}</p>
                <p className="text-sm font-semibold text-ink-950/45">{money(b.value)}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-ink-950/60">
            Valor dos bônus: {money(658)} · você investe {money(course.price)} no curso completo.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="section-badge">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-bold">Perguntas frequentes</h2>
          <div className="mt-10 space-y-4">
            {course.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-ink-950/10 bg-white px-5 py-4"
              >
                <summary className="cursor-pointer list-none font-semibold marker:content-none">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-950/65">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden px-4 py-24">
        <div className="absolute inset-0 bg-ink-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(226,61,18,0.25),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(47,118,111,0.22),transparent_40%)]" />
        <div className="relative mx-auto max-w-3xl text-center text-white">
          <h2 className="font-display text-3xl font-bold sm:text-5xl">
            Invista no seu negócio no Mercado Livre
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            De {money(course.cost || 264)} por {money(course.price)} · acesso imediato · garantia de
            7 dias
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Quero começar agora
            </a>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Voltar à loja
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
