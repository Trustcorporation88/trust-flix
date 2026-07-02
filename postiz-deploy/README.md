# Deploy do Postiz (motor de publicação)

Este diretório não contém uma cópia do Postiz — ele é usado como serviço externo, via API,
sem modificar o código-fonte (mantém a licença AGPL simples e facilita atualizações).

## Passo a passo

1. Clone o compose oficial (já vem com Postgres + Redis + Temporal configurados):
   ```bash
   git clone https://github.com/gitroomhq/postiz-docker-compose.git
   cd postiz-docker-compose
   ```

2. Copie `.env.example` para `.env` e configure:
   - `MAIN_URL` / `FRONTEND_URL` / `NEXT_PUBLIC_BACKEND_URL` — domínio onde o Postiz vai rodar (ex: `https://engine.trustflix.com`)
   - Credenciais do app Meta (Instagram): `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`
   - Credenciais do app TikTok: `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET`
   - `STORAGE_PROVIDER=local` (ou `cloudflare` com credenciais R2)

3. Suba os containers:
   ```bash
   docker compose up -d
   ```

4. Acesse o painel do Postiz, crie sua organização, e em **Settings → API** gere uma API Key.

5. No TrustFlix, configure as variáveis de ambiente (via secrets do Gumloop ou `.env` do site):
   - `POSTIZ_API_URL=https://engine.trustflix.com/api/public/v1`
   - `POSTIZ_API_KEY=<chave gerada no passo 4>`

## Onde hospedar
O Postiz precisa de um host com Docker de verdade (não roda em serverless como Vercel):
- VPS (Hetzner, DigitalOcean, Contabo) — mais barato, você administra.
- Railway / Render — deploy de Docker Compose gerenciado, menos configuração.

## Requisitos mínimos
- 2 vCPU / 4 GB RAM / 20 GB disco (recomendado para múltiplos clientes).
- Rede de saída liberada para `graph.facebook.com`, `graph.instagram.com`, `open.tiktokapis.com`.

## Apps necessários (você precisa criar e submeter para aprovação)
- **Meta for Developers**: app com permissões `instagram_content_publish`, `instagram_manage_insights`,
  `pages_read_engagement`. Requer conta Business/Creator do Instagram vinculada a uma Página do Facebook.
- **TikTok for Developers**: app com acesso à Content Posting API.

Isso não pode ser feito por mim — depende da sua conta de desenvolvedor e passa por revisão manual
das plataformas (pode levar dias/semanas).
