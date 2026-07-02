import Link from 'next/link';
import { FiArrowRight, FiCpu, FiEdit3, FiInstagram, FiCheck } from 'react-icons/fi';

const modules = [
  {
    icon: FiCpu,
    badge: '18 Agentes',
    title: 'Arsenal de Agentes IA',
    description:
      'Sistema DOUG.EXE com 18 agentes de copy, estratégia e vendas. Funciona com OpenAI, Anthropic (Claude) e Google (Gemini). Fluxo guiado em 5 fases.',
    href: '/dashboard/agents',
    cta: 'Abrir Arsenal',
    color: 'from-accent-500 to-accent-700',
    features: ['Workflow em 5 fases', 'Multi-API (GPT/Claude/Gemini)', 'Cheat sheet de uso'],
  },
  {
    icon: FiEdit3,
    badge: 'Design',
    title: 'Creator Studio',
    description:
      'Editor de criativos com templates, biblioteca de assets, shapes, ícones, fitas e stickers. Crie posts e stories profissionais para o Instagram.',
    href: '/dashboard/creator',
    cta: 'Criar Designs',
    color: 'from-gold-400 to-gold-600',
    features: ['Templates prontos', 'Biblioteca de assets', 'Editor de canvas'],
  },
  {
    icon: FiInstagram,
    badge: 'Automação',
    title: 'Painel Instagram',
    description:
      'Agende posts, automatize respostas e acompanhe métricas via API oficial do Meta. Tudo dentro das regras da plataforma, sem risco de banimento.',
    href: '/dashboard/instagram',
    cta: 'Abrir Painel',
    color: 'from-ink-500 to-ink-700',
    features: ['Agendamento de posts', 'Insights e métricas', 'API oficial Meta'],
  },
];

const extraFeatures = [
  { emoji: '🏪', title: 'Loja Online', description: 'Catálogo de produtos com carrinho e checkout', href: '/shop' },
  { emoji: '💳', title: 'Pagamentos', description: 'PIX, Mercado Pago e PushinPay integrados', href: '/dashboard/integrations' },
  { emoji: '📱', title: 'WhatsApp Bot', description: 'Atendimento automático integrado ao JETBOT', href: '/dashboard/whatsapp' },
  { emoji: '📊', title: 'Dashboard', description: 'Gestão de pedidos, clientes e vendas', href: '/dashboard' },
  { emoji: '🤖', title: 'Automações', description: 'Workflows inteligentes de vendas', href: '/dashboard/automations' },
  { emoji: '📧', title: 'Marketing', description: 'Campanhas, leads e funil de vendas', href: '/dashboard/campaigns' },
];

const stats = [
  { value: '18', label: 'Agentes de IA' },
  { value: '3', label: 'APIs de IA integradas' },
  { value: '24/7', label: 'Automação ativa' },
  { value: '100%', label: 'Dentro das regras da Meta' },
];

export default function Home() {
  return (
    <div className="w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-ink-950 px-4 pb-24 pt-24 text-white sm:pt-28">
        <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-gold-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-5xl text-center">
          <span className="section-badge">
            <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-accent-400" />
            Plataforma completa de vendas, IA e conteúdo
          </span>

          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.1] tracking-tight md:text-7xl">
            Venda, crie e automatize
            <br className="hidden md:block" />
            <span className="gradient-text">em uma única plataforma</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-300 md:text-xl">
            Arsenal de 18 agentes de IA, Creator Studio para designs e automação oficial do
            Instagram — tudo integrado ao seu WhatsApp Bot.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/dashboard/agents" className="btn-primary">
              Explorar Agentes IA
              <FiArrowRight />
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              Acessar Painel
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] py-5">
                <p className="font-display text-2xl font-bold text-white sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs text-ink-400 sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flagship Modules */}
      <section className="relative bg-ink-950 px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="section-badge">Superpoderes</span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              Seus 3 superpoderes
            </h2>
            <p className="mt-3 text-ink-300">Cada módulo é uma ferramenta completa, pronta para uso.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {modules.map((mod) => (
              <div
                key={mod.href}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-white/20 hover:shadow-glow"
              >
                <div className={`bg-gradient-to-br ${mod.color} p-6 text-white`}>
                  <div className="mb-4 flex items-center justify-between">
                    <mod.icon size={32} />
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                      {mod.badge}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-bold">{mod.title}</h3>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="mb-4 text-sm text-ink-300">{mod.description}</p>
                  <ul className="mb-6 space-y-2">
                    {mod.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-ink-200">
                        <FiCheck className="flex-shrink-0 text-accent-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={mod.href}
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3 font-semibold text-white transition-all group-hover:bg-white/[0.08]"
                  >
                    {mod.cta}
                    <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extra Features Section */}
      <section className="bg-ink-950 px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="section-badge">Ecossistema</span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              Recursos da Plataforma
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {extraFeatures.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition-all hover:-translate-y-1 hover:border-accent-400/40 hover:bg-white/[0.06]"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-2xl">{feature.emoji}</span>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white transition-colors group-hover:text-accent-300">
                    {feature.title}
                    <span className="text-accent-400 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                      →
                    </span>
                  </h3>
                </div>
                <p className="text-sm text-ink-300">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden px-4 py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-700 via-ink-900 to-gold-800" />
        <div className="pointer-events-none absolute inset-0 bg-grid-glow opacity-60" />
        <div className="relative mx-auto max-w-4xl text-center text-white">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Tudo pronto para usar</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Comece pelo Arsenal de Agentes para estruturar sua oferta, crie os criativos no Studio e
            publique automaticamente no Instagram.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/dashboard/agents" className="btn-gold">
              Começar pelos Agentes
            </Link>
            <Link href="/shop" className="btn-secondary">
              Ver a Loja
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
