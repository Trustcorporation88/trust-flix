# AGENTS.md

## Cursor Cloud specific instructions

This repository contains **two independent Node.js apps**:

1. **JETBOT V7** (repo root) — an Express web admin panel + WhatsApp seller bot (`main.js`). Data is stored in JSON files (`data/`, `database/database.json`), so there is no external database. This is the primary product.
2. **SocialFlow site** (`site/`) — a Next.js 14 (App Router) marketing site + dashboard. Separate `package.json`/deps.

Dependencies for both are installed by the startup update script (`npm install` at the root and in `site/`). Node 22 is available and satisfies both apps' `engines` (`>=18`).

### JETBOT V7 (root)

- Run dev: `npm start` (= `node main.js`). Lint/validate: `npm run check`. Tests: `npm test`. (See `README.md` / `package.json`.)
- `.env` is **gitignored**, so create one before running. Non-obvious: the default `PORT` is **80** (privileged and will fail to bind as a normal user) — set `PORT` to something like `8080`. Also set `PANEL_USERNAME` / `PANEL_PASSWORD` (login), `SESSION_SECRET`, `APP_SECRET`. Copy `.env.example` as a starting point. Login uses `PANEL_USERNAME`/`PANEL_PASSWORD`.
- `npm start` boots the web panel **and** the WhatsApp client, which immediately prints a QR code to the terminal. Fully connecting WhatsApp requires scanning that QR with a real WhatsApp account, but the **web panel works fine without connecting WhatsApp** — the QR/connection is not needed to develop or test the panel/API/storefront.
- Chromium (for the WhatsApp `whatsapp-web.js` client) is auto-downloaded by puppeteer into `~/.cache/puppeteer` during `npm install`; no separate install step is needed and it launches headless with `--no-sandbox`.
- Non-obvious API detail: all non-GET panel API calls require the header `x-requested-with: jetbot-panel` (CSRF guard), in addition to an authenticated session cookie (`POST /api/auth/login`). The browser UI sends this automatically; scripted/`curl` calls must add it.
- Public customer storefront is served at `/catalogo` and reads active products via `/api/public/catalog`.
- The tracked JSON data files (`data/*.json`, `database/database.json`) are the app's datastore. Creating products/leads/etc. mutates them; revert with `git checkout -- data/ database/database.json` to avoid committing test data.
- Known pre-existing UI bug (not an environment issue): the panel's **product / lead / stock save** forms don't submit, because those forms contain a hidden `<input name="id">` that shadows the form's `.id` property in `src/web/public/app.js`. Creating those entities still works via the backend API. The category form and settings forms are unaffected.

### SocialFlow site (`site/`)

- Run dev: `npm run dev` (Next.js on `http://localhost:3000`). Lint: `npm run lint`. Types: `npm run type-check`. Build: `npm run build`. (See `site/package.json` / `site/README.md`.)
- Auth is JWT-based (no DB). Env lives in `site/.env.local` (gitignored); set `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (login credentials), and `ALLOW_REGISTER=true` for dev. Copy `site/.env.example`.
- Optional integrations (Postiz/Instagram/TikTok publishing, Content Studio AI, Stripe/Mercado Pago) require external API keys and are not needed to run the site locally.

### Not runnable services

`postiz-deploy/` is documentation only (external Postiz service), and `extension/JetLeads_Connector/` is a static Chrome extension — neither is a service to start during setup.
