export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen bg-ink-950 pb-20">
      <div className="relative mx-auto max-w-3xl px-4 py-16 text-ink-200">
        <h1 className="font-display text-3xl font-bold text-white">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-ink-400">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="mt-8 space-y-6 leading-relaxed">
          <p>
            Esta Política de Privacidade descreve como a <strong>Social Flow</strong> (&quot;nós&quot;, &quot;nosso&quot; ou &quot;Plataforma&quot;),
            acessível em <strong>socialflow.site</strong> e <strong>trust-flix88.vercel.app</strong>, coleta, usa e
            protege as informações dos usuários que utilizam nossos serviços de automação, agendamento e publicação
            de conteúdo em redes sociais (Instagram, TikTok e outras plataformas suportadas).
          </p>

          <h2 className="text-xl font-semibold text-white">1. Quais dados coletamos</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Dados de cadastro: nome, e-mail e informações da conta criada na Plataforma.</li>
            <li>
              Dados de contas conectadas do Instagram/TikTok: quando você autoriza a Plataforma via login oficial
              (OAuth) da Meta/TikTok, recebemos informações básicas do perfil (nome de usuário, foto, tipo de conta),
              tokens de acesso necessários para publicar conteúdo em seu nome, e métricas/insights disponibilizados
              pela API oficial da plataforma conectada.
            </li>
            <li>Conteúdo que você cria ou agenda através da Plataforma (legendas, imagens, vídeos, templates escolhidos).</li>
            <li>Dados de uso: como você interage com a Plataforma, para fins de melhoria do produto.</li>
          </ul>

          <h2 className="text-xl font-semibold text-white">2. Como usamos seus dados</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Para publicar, agendar e gerenciar conteúdo nas contas que você conectou e autorizou explicitamente.</li>
            <li>Para gerar sugestões de legenda por inteligência artificial, com base no template e nicho que você informar.</li>
            <li>Para exibir métricas e relatórios de desempenho das suas publicações.</li>
            <li>Para comunicação relacionada à sua conta e ao suporte da Plataforma.</li>
          </ul>
          <p>
            <strong>Nós não vendemos seus dados</strong> nem os dados das contas de redes sociais conectadas a
            terceiros para fins de marketing.
          </p>

          <h2 className="text-xl font-semibold text-white">3. Compartilhamento com terceiros (subprocessadores)</h2>
          <p>Para operar a Plataforma, utilizamos os seguintes serviços de terceiros, estritamente para prestar a
            funcionalidade contratada:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li><strong>Meta (Instagram) e TikTok</strong> — APIs oficiais usadas para publicação e leitura de métricas, mediante sua autorização.</li>
            <li><strong>Postiz</strong> (motor de agendamento self-hosted, operado por nós) — processa e executa a publicação/agendamento de conteúdo.</li>
            <li><strong>Provedores de IA</strong> (ex: DeepSeek) — usados apenas para gerar sugestões de texto/legenda, sem compartilhar dados de identificação pessoal além do necessário para a geração do texto.</li>
            <li><strong>Vercel</strong> — hospedagem da aplicação.</li>
          </ul>

          <h2 className="text-xl font-semibold text-white">4. Retenção e exclusão de dados</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para cumprir obrigações
            legais. Você pode solicitar a exclusão dos seus dados a qualquer momento:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Revogando o acesso da Plataforma diretamente nas configurações da sua conta Instagram/TikTok; ou</li>
            <li>
              Enviando uma solicitação para <strong>{'suporte@socialflow.site'}</strong>; ou
            </li>
            <li>
              Através do endpoint de exclusão de dados exigido pela Meta:{' '}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm">/api/meta/data-deletion</code>
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-white">5. Segurança</h2>
          <p>
            Adotamos medidas técnicas razoáveis para proteger os dados armazenados, incluindo transmissão
            criptografada (HTTPS/TLS) e controle de acesso às credenciais e tokens de API.
          </p>

          <h2 className="text-xl font-semibold text-white">6. Seus direitos</h2>
          <p>
            Você pode, a qualquer momento, solicitar acesso, correção, portabilidade ou exclusão dos seus dados
            pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD).
          </p>

          <h2 className="text-xl font-semibold text-white">7. Contato</h2>
          <p>
            Dúvidas sobre esta Política de Privacidade podem ser enviadas para{' '}
            <strong>suporte@socialflow.site</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
