# 🚀 Guia Completo de Deployment - VERCEL + DOMÍNIO

## PASSO 1: Preparar o Código ✅

```bash
cd C:\JetFlix\site

# Build de produção
npm run build

# Verificar se compilou sem erros
npm run start
```

---

## PASSO 2: Versionar no GitHub (obrigatório para Vercel)

```bash
# Se ainda não tem repo git
git init
git add .
git commit -m "feat: Arsenal de Agentes completo - Ready for production"

# Criar repo no GitHub
# 1. Acesse https://github.com/new
# 2. Nome: jetflix-site (ou seu nome preferido)
# 3. Descrição: "Plataforma de vendas com Arsenal de Agentes DOUG.EXE"
# 4. Public ou Private (Private recomendado)
# 5. Clique "Create repository"

# Conectar ao GitHub
git remote add origin https://github.com/SEU_USUARIO/jetflix-site.git
git branch -M main
git push -u origin main
```

---

## PASSO 3: Deploy no Vercel (5 MINUTOS)

### Opção A: CLI Vercel (Mais rápido)

```bash
# 1. Instalar CLI
npm i -g vercel

# 2. Fazer login
vercel login

# 3. Deploy
vercel deploy --prod
```

**Responder a perguntas:**
- `? Set up and deploy "~/jetflix"?` → Y
- `? Which scope do you want to deploy to?` → Your account
- `? Link to existing project?` → N
- `? What's your project's name?` → jetflix-site
- `? In which directory is your code located?` → ./
- `? Want to modify these settings before deploying?` → Y
- `? NEXT_PUBLIC_API_URL:` → https://seu-dominio.com/api (depois você muda)
- `? JWT_SECRET:` → gere uma senha forte (32+ caracteres)

**Resultado:** `https://jetflix-site.vercel.app`

---

### Opção B: Via Interface Vercel (Recomendado para iniciantes)

1. **Acesse:** https://vercel.com/new
2. **Clique:** "Import Git Repository"
3. **Cole:** Link do seu repo GitHub
   ```
   https://github.com/SEU_USUARIO/jetflix-site
   ```
4. **Autorize:** Vercel no GitHub (permissões básicas)
5. **Configure:**
   - Project Name: `jetflix-site`
   - Framework: `Next.js` (auto-detectado)
   - Root Directory: `./` (default)
6. **Environment Variables:**
   ```
   JWT_SECRET = gere_aqui: https://www.uuidgenerator.net/ (copie 3x)
   NEXT_PUBLIC_API_URL = https://jetflix-site.vercel.app/api
   ```
7. **Deploy!** Clique "Deploy"

**Pronto!** Seu site estará em: `https://jetflix-site.vercel.app`

---

## PASSO 4: Comprar Domínio Profissional

### Opção 1: Godaddy (Mais conhecido)
1. Acesse: https://br.godaddy.com
2. Digite seu domínio: `meujetsellsite.com.br`
3. Escolha `.com.br` (R$ 50-80/ano)
4. Adicionar ao carrinho
5. Checkout (cartão de crédito)

### Opção 2: Namecheap (Mais barato)
1. Acesse: https://www.namecheap.com
2. Busque seu domínio
3. `.com` por ~$8/ano
4. Checkout

### Opção 3: Registro.br (Brasileiras)
1. Acesse: https://registro.br
2. Busque `.com.br` disponível
3. Criar account com CPF/CNPJ
4. Pagar e registrar

---

## PASSO 5: Conectar Domínio ao Vercel ⚡

**No Painel Vercel:**

1. Acesse seu projeto: https://vercel.com/dashboard
2. Selecione `jetflix-site`
3. Vá em **Settings** → **Domains**
4. Clique **Add Domain**
5. Cole seu domínio: `meujetsellsite.com.br`
6. **Copiar nameservers que aparecerem**

**No seu registrador (Godaddy/Namecheap):**

1. Acesse sua conta
2. Vá para **Domains** → seu domínio
3. Clique **Manage DNS** ou **Nameservers**
4. **Cole os nameservers do Vercel:**
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
5. **Salvar**

**Esperar 24-48h** para DNS propagar.

---

## PASSO 6: Usar seu Domínio no Código ✨

Depois que o domínio propagar:

```bash
cd C:\JetFlix\site

# Atualizar variáveis de ambiente
# 1. No Vercel Dashboard → Settings → Environment Variables
# 2. Editar NEXT_PUBLIC_API_URL para seu domínio:
NEXT_PUBLIC_API_URL = https://meujetsellsite.com.br/api
```

---

## ✅ Verificação Final

```
✅ Site rodando em https://meujetsellsite.com.br
✅ HTTPS automático (Vercel fornece)
✅ CDN global (velocidade em qualquer país)
✅ Backups automáticos
✅ SSL renovado automaticamente
✅ Domínio apontando corretamente
```

---

## 🔐 Segurança em Produção

Adicionar no **Vercel → Settings → Environment Variables:**

```
JWT_SECRET=seu_secret_muito_longo_32_caracteres_aqui
NEXT_PUBLIC_INSTAGRAM_ACCESS_TOKEN=seu_token_instagram
NODE_ENV=production
```

---

## 📊 Monitorar Performance

1. **Vercel Analytics:** https://vercel.com/dashboard → seu projeto → Analytics
2. **Speed Insights:** Veja velocidade em tempo real
3. **Logs:** Debugar erros em produção

---

## 🆘 Se Algo der Errado

### Site retorna 404
```bash
# Fazer novo build
git add .
git commit -m "fix: deploy"
git push origin main

# Vercel faz redeploy automático
```

### Domínio não resolve
```bash
# Verificar DNS propagação
# 1. https://dnschecker.org/
# 2. Cole seu domínio
# 3. Aguarde 24-48h
```

### Erro de SSL
```bash
# Vercel resolve automaticamente
# Se persistir, contate: support@vercel.com
```

---

## 🎉 PRONTO!

Seu site profissional está no ar com:
- ✅ Domínio próprio
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Performance otimizada
- ✅ Escalabilidade automática
- ✅ Arsenal de Agentes integrado

**Acesse:** `https://meujetsellsite.com.br`

---

## Próximos Passos (Opcional)

- [ ] Adicionar analytics (Google Analytics 4)
- [ ] Configurar Email (SendGrid, Mailgun)
- [ ] Backup do banco de dados
- [ ] Monitoramento contínuo
- [ ] Custom domain email (seu-email@meujetsellsite.com.br)
