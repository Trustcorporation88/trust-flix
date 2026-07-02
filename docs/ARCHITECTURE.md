# Arquitetura — Trust Insta Content Engine

## Objetivo
Cliente conecta a conta do Instagram e/ou TikTok. O sistema mostra modelos de post/reel/story
comprovadamente eficazes, filtrados pelo momento de tendência, o cliente escolhe (modo assistido),
a IA gera a legenda/roteiro, e o post é agendado/publicado via API oficial da plataforma.

Modo de operação definido: **Assistido** (mostra opções → cliente aprova → publica).
Modelo de negócio: **SaaS multi-cliente** (cada cliente final conecta sua própria conta).
Prioridade de plataforma: **Instagram + TikTok em paralelo**.

## Componentes

### 1. Motor de publicação — Postiz (self-hosted)
- Repositório oficial: https://github.com/gitroomhq/postiz-app (AGPL-3.0, 32k+ estrelas)
- Deploy recomendado: https://github.com/gitroomhq/postiz-docker-compose (Postgres + Redis + Temporal já configurados)
- Usado **sem modificar o código-fonte** — apenas via sua Public API (`/public/v1`).
- Recursos usados:
  - `GET /groups` — lista de clientes/tenants (multi-tenant nativo)
  - Connect Channel (OAuth) — gera URL de conexão para o cliente autorizar Instagram/TikTok
  - `POST /posts` — cria/agenda publicações
  - Analytics — métricas de performance por post/conta
- **Não roda no Vercel.** Precisa de VPS/Railway/Render com Docker (mín. 2 vCPU / 4GB RAM recomendado).

### 2. Sinal de tendência — trendsmcp (tiktok-trends-api)
- https://github.com/trendsmcp/tiktok-trends-api — dados de volume/crescimento de hashtags via API paga/gratuita, **sem scraping**.
- Usado para pontuar quais categorias de template estão "quentes" agora.

### 3. Biblioteca de "Modelos Vencedores"
- Catálogo curado por formato (Reel / Story / Post) × objetivo (vendas, engajamento, oferta, autoridade).
- Fonte: Creator Studio já existente + assets legítimos do Drive do cliente (packs de design, ícones, fontes).
- **Não** clona posts de terceiros — usa formatos/estruturas comprovadas, não conteúdo alheio (evita risco de direitos autorais).
- Arquivo: `site/src/data/templates.json`

### 4. Geração de conteúdo — Arsenal de Agentes IA (já existente)
- Endpoint existente `/api/agents/execute` gera legenda/roteiro a partir do template + nicho do cliente.

### 5. Fluxo assistido (Content Studio)
1. Cliente seleciona a conta conectada (Instagram/TikTok) via `postizService.getGroups/getIntegrations`.
2. Sistema lista templates ranqueados por `trendsService` + relevância ao nicho.
3. Cliente escolhe um template.
4. IA gera legenda/roteiro para aquele template.
5. Cliente revisa e aprova (ou edita).
6. Sistema chama `postizService.createPost` para agendar/publicar.
7. Analytics retroalimentam o ranking dos templates (fase 2).

## O que NÃO foi usado (motivo)
- Bots de automação/seguidores (Jarvee, "robô de seguidores"), extratores de contato do Instagram,
  painéis SMM de curtidas/seguidores falsos, software crackeado/nulled encontrados na pasta do Drive:
  violam Termos de Uso das plataformas e/ou leis de proteção de dados, e resultam em banimento das contas dos clientes.
- `ii-content-engine` (usa cookies de navegador para postar): não é API oficial, alto risco de bloqueio.

## Bloqueios que dependem de ação do cliente (fora do meu controle)
1. **App Meta (Facebook Developers)** com permissões `instagram_content_publish`, `instagram_manage_insights` —
   requer conta Business/Creator do Instagram vinculada a uma Página do Facebook, e passar por App Review do Meta.
2. **App TikTok for Developers** com acesso à Content Posting API — requer aprovação da TikTok.
3. **Hospedagem do Postiz** (VPS/Railway/Render) — decidir onde rodar Docker Compose.
4. **Chave de API do trendsmcp.ai** para dados de tendência.
5. **Chave de API do Postiz** (gerada após deploy, em Settings → API).

## Roadmap
- **Fase 1 (feito nesta etapa):** scaffold de código (`postizService`, `trendsService`, catálogo de
  templates, tela "Content Studio" no dashboard), documentação, config de deploy do Postiz.
- **Fase 2:** deploy real do Postiz, registro dos apps Meta/TikTok, conexão de contas reais.
- **Fase 3:** loop de feedback com analytics reais re-ranqueando os templates por cliente.
- **Fase 4:** modo 100% automático opcional (hoje o padrão é assistido, conforme decisão do cliente).
