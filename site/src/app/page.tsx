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
    color: 'from-purple-600 to-indigo-700',
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
    color: 'from-pink-600 to-rose-700',
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
    color: 'from-blue-600 to-cyan-700',
    features: ['Agendamento de posts', 'Insights e métricas', 'API oficial Meta'],
  },
];

const extraFeatures = [
  { title: '🏪 Loja Online', description: 'Catálogo de produtos com carrinho e checkout' },
  { title: '💳 Pagamentos', description: 'PIX, Mercado Pago e PushinPay integrados' },
  { title: '📱 WhatsApp Bot', description: 'Atendimento automático integrado ao JETBOT' },
  { title: '📊 Dashboard', description: 'Gestão de pedidos, clientes e vendas' },
  { title: '🤖 Automações', description: 'Workflows inteligentes de vendas' },
  { title: '📧 Marketing', description: 'Campanhas, leads e funil de vendas' },
];

export default function Home() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-block bg-white/10 border border-white/20 rounded-full px-4 py-1 text-sm mb-6">
            Plataforma completa de vendas, IA e conteúdo
          </span>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Venda, crie e automatize <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              em uma única plataforma
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Arsenal de 18 agentes de IA, Creator Studio para designs e automação oficial do
            Instagram — tudo integrado ao seu WhatsApp Bot.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard/agents"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 flex items-center justify-center gap-2"
            >
              Explorar Agentes IA
              <FiArrowRight />
            </Link>
            <Link
              href="/dashboard"
              className="border-2 border-white/30 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10"
            >
              Acessar Painel
            </Link>
          </div>
        </div>
      </section>

      {/* Flagship Modules */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Seus 3 superpoderes</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Cada módulo é uma ferramenta completa, pronta para uso.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {modules.map((mod) => (
              <div
                key={mod.href}
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-shadow overflow-hidden flex flex-col"
              >
                <div className={`bg-gradient-to-r ${mod.color} p-6 text-white`}>
                  <div className="flex items-center justify-between mb-4">
                    <mod.icon size={36} />
                    <span className="bg-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                      {mod.badge}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold">{mod.title}</h3>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-gray-600 mb-4">{mod.description}</p>
                  <ul className="space-y-2 mb-6">
                    {mod.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                        <FiCheck className="text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={mod.href}
                    className="mt-auto inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800"
                  >
                    {mod.cta}
                    <FiArrowRight />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extra Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Recursos da Plataforma</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {extraFeatures.map((feature, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Tudo pronto para usar</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Comece pelo Arsenal de Agentes para estruturar sua oferta, crie os criativos no Studio e
            publique automaticamente no Instagram.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard/agents"
              className="inline-block bg-white text-purple-700 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100"
            >
              Começar pelos Agentes
            </Link>
            <Link
              href="/shop"
              className="inline-block border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10"
            >
              Ver a Loja
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
