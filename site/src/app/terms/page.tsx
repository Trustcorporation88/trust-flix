export default function TermsOfServicePage() {
  return (
    <div className="relative min-h-screen bg-ink-950 pb-20">
      <div className="relative mx-auto max-w-3xl px-4 py-16 text-ink-200">
        <h1 className="font-display text-3xl font-bold text-white">Termos de Uso</h1>
        <p className="mt-2 text-sm text-ink-400">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="mt-8 space-y-6 leading-relaxed">
          <p>
            Estes Termos de Uso regem o acesso e uso da plataforma <strong>Trust Insta</strong>, acessível em{' '}
            <strong>socialflow.site</strong> ("Plataforma"). Ao criar uma conta ou utilizar a Plataforma, você
            concorda com estes termos.
          </p>

          <h2 className="text-xl font-semibold text-white">1. Descrição do serviço</h2>
          <p>
            A Plataforma oferece ferramentas para criação, agendamento e publicação de conteúdo em redes sociais
            (Instagram, TikTok e outras), geração de legendas assistida por inteligência artificial, e métricas de
            desempenho, mediante conexão oficial e autorizada das suas contas via login OAuth das respectivas
            plataformas.
          </p>

          <h2 className="text-xl font-semibold text-white">2. Uso permitido</h2>
          <p>Ao usar a Plataforma, você concorda em:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Conectar apenas contas de redes sociais que você possui ou está autorizado a gerenciar.</li>
            <li>Não utilizar a Plataforma para publicar conteúdo ilegal, enganoso, spam ou que viole os Termos de
              Uso do Instagram, TikTok, Meta ou de qualquer plataforma conectada.</li>
            <li>Não utilizar a Plataforma para automação de seguidores/curtidas falsas, extração não autorizada de
              dados de terceiros, ou qualquer prática que viole as políticas de uso das plataformas conectadas.</li>
            <li>Ser o único responsável pelo conteúdo publicado através da sua conta.</li>
          </ul>

          <h2 className="text-xl font-semibold text-white">3. Contas conectadas via API oficial</h2>
          <p>
            Todas as publicações e leituras de dados são realizadas exclusivamente através das APIs públicas e
            oficiais das plataformas suportadas (Meta Graph API, TikTok Content Posting API), mediante autorização
            explícita do usuário. A Plataforma não realiza engenharia reversa, scraping não autorizado, nem
            automação por métodos não homologados por essas plataformas.
          </p>

          <h2 className="text-xl font-semibold text-white">4. Cancelamento e suspensão</h2>
          <p>
            Você pode desconectar suas contas e encerrar o uso da Plataforma a qualquer momento. Reservamo-nos o
            direito de suspender contas que violem estes Termos ou as políticas das plataformas conectadas.
          </p>

          <h2 className="text-xl font-semibold text-white">5. Limitação de responsabilidade</h2>
          <p>
            A Plataforma depende da disponibilidade e das regras das APIs de terceiros (Meta, TikTok). Não nos
            responsabilizamos por indisponibilidades, alterações de política ou suspensão de contas realizadas
            pelas próprias plataformas de terceiros.
          </p>

          <h2 className="text-xl font-semibold text-white">6. Alterações nestes Termos</h2>
          <p>
            Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas através da
            Plataforma ou por e-mail.
          </p>

          <h2 className="text-xl font-semibold text-white">7. Contato</h2>
          <p>
            Dúvidas sobre estes Termos podem ser enviadas para <strong>suporte@socialflow.site</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
