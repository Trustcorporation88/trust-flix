import Link from 'next/link';

const pillars = [
  {
    title: 'Content Studio',
    text: 'Planeje o dia, gere legendas e publique no Instagram pelo Postiz — sem sair do fluxo.',
    href: '/dashboard/content-studio',
  },
  {
    title: 'Agentes de IA',
    text: 'Estruture oferta, copy e estratégia com um arsenal de agentes em fases claras.',
    href: '/dashboard/agents',
  },
  {
    title: 'Vendas no WhatsApp',
    text: 'Atenda, cobre e entregue com o bot JETBOT conectado à mesma operação.',
    href: '/dashboard/whatsapp',
  },
];

function FlowCanvas() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(226,61,18,0.16),transparent_55%),radial-gradient(ellipse_at_15%_80%,rgba(47,118,111,0.18),transparent_50%),linear-gradient(160deg,#f4f4f2_0%,#e8ebe9_48%,#ddd9d2_100%)]" />
      <div className="sf-grain absolute inset-0" />
      <svg
        className="animate-flow-drift absolute -right-[12%] top-[-8%] h-[120%] w-[90%] opacity-90"
        viewBox="0 0 900 900"
        fill="none"
      >
        <path
          d="M80 620 C220 480, 320 720, 480 540 C640 360, 700 220, 860 160"
          stroke="#e23d12"
          strokeWidth="54"
          strokeLinecap="round"
          opacity="0.22"
        />
        <path
          d="M40 480 C200 360, 280 560, 460 400 C640 240, 720 180, 880 120"
          stroke="#245e59"
          strokeWidth="34"
          strokeLinecap="round"
          opacity="0.28"
        />
        <path
          d="M120 760 C280 620, 360 820, 540 660 C700 520, 760 420, 880 360"
          stroke="#101114"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.12"
        />
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <div className="w-full overflow-hidden">
      <section className="relative min-h-[100svh] px-4 pb-16 pt-28 sm:pt-32">
        <FlowCanvas />
        <div className="relative mx-auto flex min-h-[calc(100svh-8rem)] max-w-6xl flex-col justify-end sm:justify-center">
          <p className="animate-rise font-display text-5xl font-extrabold tracking-tight text-ink-950 sm:text-7xl md:text-8xl">
            SocialFlow
          </p>
          <h1 className="animate-rise-delay mt-5 max-w-2xl font-display text-2xl font-semibold leading-tight tracking-tight text-ink-950 sm:text-4xl">
            Crie, publique e venda no mesmo ritmo.
          </h1>
          <p className="animate-rise-delay-2 mt-4 max-w-xl text-base leading-relaxed text-ink-950/70 sm:text-lg">
            Conteúdo, IA e WhatsApp em um fluxo contínuo — menos abas, mais execução.
          </p>
          <div className="animate-rise-delay-2 mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="btn-primary">
              Entrar na plataforma
            </Link>
            <Link href="/dashboard/content-studio" className="btn-secondary">
              Ver Content Studio
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-ink-950/10 bg-stone-50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="section-badge">O fluxo</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
            Uma operação. Três motores.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {pillars.map((item, index) => (
              <div key={item.title} className="border-t border-ink-950/15 pt-6">
                <p className="font-display text-sm font-semibold text-signal-500">0{index + 1}</p>
                <h3 className="mt-3 font-display text-xl font-bold text-ink-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-950/65">{item.text}</p>
                <Link
                  href={item.href}
                  className="mt-5 inline-flex text-sm font-semibold text-flow-700 transition-colors hover:text-signal-600"
                >
                  Abrir →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-24">
        <div className="absolute inset-0 bg-ink-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(226,61,18,0.25),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(47,118,111,0.22),transparent_40%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Pronto para colocar sua marca em movimento?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
            Acesse o painel, conecte suas contas e publique o próximo conteúdo ainda hoje.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className="btn-primary">
              Começar agora
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white transition-all hover:bg-white/10"
            >
              Ver loja
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
