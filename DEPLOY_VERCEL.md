# 🚀 Deploy do JetFlix na Vercel

Este repositório contém **dois projetos**:

| Pasta | O que é | Onde hospedar |
|-------|---------|---------------|
| `site/` | **Site JetFlix** (Next.js 14) — loja, dashboard, Arsenal IA, Creator Studio, Instagram | **Vercel** ✅ |
| raiz (`main.js`, `src/`) | **Bot JETBOT V7** (Node.js + WhatsApp) | Square Cloud / VPS (não é Vercel) |

> A Vercel hospeda **apenas o site** (`site/`). O bot WhatsApp roda separado, num servidor Node que fica sempre ativo.

---

## ✅ Passo a passo (importar do GitHub)

1. Acesse <https://vercel.com/new> e clique em **Import Git Repository**.
2. Selecione **`Trustcorporation88/trust-flix`**.
3. **MUITO IMPORTANTE** — em **Root Directory**, clique em **Edit** e selecione a pasta **`site`**.
   - Sem isso o build falha, pois o `package.json` do Next.js está em `site/`, não na raiz.
4. **Framework Preset**: a Vercel detecta **Next.js** automaticamente. Deixe como está.
   - Build Command: `npm run build` (padrão)
   - Output: gerenciado pela Vercel (não precisa mexer)
5. Em **Environment Variables**, adicione (veja `site/.env.example`):

   | Nome | Valor | Obrigatório |
   |------|-------|-------------|
   | `JWT_SECRET` | um segredo forte (ex.: `openssl rand -base64 32`) | ✅ Sim |
   | `NEXT_PUBLIC_API_URL` | deixe **vazio** (usa as rotas internas `/api`) | Não |
   | `NEXT_PUBLIC_JETBOT_API` | URL pública do bot, se já estiver hospedado | Não |

6. Clique em **Deploy**. Em ~2 min você recebe uma URL `https://trust-flix.vercel.app`.

---

## 🌐 Domínio próprio

Em **Project → Settings → Domains**, adicione seu domínio e aponte o DNS conforme as instruções da Vercel (CNAME para `cname.vercel-dns.com` ou os registros A indicados).

## 🔁 Deploy contínuo

Após o primeiro deploy, **todo `git push` na branch `main`** dispara um novo deploy automático na Vercel. Nenhuma ação manual necessária.

## 🧪 Rodar localmente antes

```bash
cd site
npm install
npm run dev      # http://localhost:3000
npm run build    # valida o build de produção
```

## ⚠️ Observações

- O site usa **dados mock** (`site/src/lib/mockData.ts`) e **modo demo** (auto-login). Para produção real, conecte um backend/banco e ative autenticação verdadeira.
- As rotas `/api/products` e `/api/orders` fazem proxy para o bot via `NEXT_PUBLIC_JETBOT_API`. Sem o bot no ar, elas usam fallback local.
