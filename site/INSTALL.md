# 🚀 INSTRUÇÕES - JetFlix Site Professional

## ⚡ Quick Start

### 1️⃣ Instalação (5 minutos)

```bash
# Entrar na pasta do site
cd C:\JetFlix\site

# Instalar dependências
npm install

# Criar arquivo de variáveis
cp .env.example .env.local

# IMPORTANTE: Editar .env.local
# Mude a variável JWT_SECRET para algo mais seguro
```

### 2️⃣ Arquivo .env.local

```env
# OBRIGATÓRIO
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_JETBOT_API=http://localhost:3001
JWT_SECRET=sua-chave-secreta-super-segura-aqui-12345

# OPCIONAL (para depois)
MERCADO_PAGO_ACCESS_TOKEN=
STRIPE_SECRET_KEY=
```

### 3️⃣ Iniciar em Desenvolvimento

```bash
npm run dev

# Acessa em:
# - Frontend: http://localhost:3000
# - Dashboard: http://localhost:3000/dashboard
```

## 📋 O que foi criado

✅ **Estrutura Profissional**
- Next.js 14 com App Router
- TypeScript totalmente configurado
- Tailwind CSS com design system
- Pasta de componentes organizada

✅ **Páginas Prontas**
- Homepage com hero section
- Loja com produtos e filtros
- Carrinho de compras funcional
- Login/Register com JWT
- Dashboard admin com sidebar

✅ **Componentes**
- Navbar com carrinho em tempo real
- Footer com links
- ProductCard reutilizável
- ProtectedRoute para autenticação
- Toast para notificações

✅ **API Routes**
- `/api/auth/login` - Fazer login
- `/api/auth/register` - Criar conta
- `/api/auth/me` - Pegar usuário atual
- `/api/products` - Listar produtos
- `/api/orders` - Gerenciar pedidos

✅ **State Management**
- `useCart` - Zustand store para carrinho
- `useAuth` - Zustand store para autenticação
- `useLocalStorage` - Hook customizado
- `useAuthInit` - Inicializar autenticação

✅ **Serviços de API**
- `productService.ts` - Comunicação com produtos
- `orderService.ts` - Comunicação com pedidos
- `leadService.ts` - Comunicação com leads
- `campaignService.ts` - Comunicação com campanhas
- `apiClient.ts` - Cliente HTTP base

## 🔗 Próximos Passos

### Fase 1: Integração com JETBOT (2-3 dias)

1. **Conectar com JETBOT API**
   ```bash
   # Garantir que JETBOT está rodando na porta 3001
   cd C:\JetFlix
   npm start
   ```

2. **Atualizar as API Routes**
   - `/api/products/route.ts` - Listar produtos reais do JETBOT
   - `/api/orders/route.ts` - Criar pedidos reais
   - `/api/auth/` - Usar usuários do JETBOT

3. **Testar Endpoints**
   ```bash
   curl http://localhost:3000/api/products
   curl http://localhost:3000/api/auth/me
   ```

### Fase 2: Página de Produto (1 dia)

Criar `src/app/shop/[slug]/page.tsx`:
- Mostrar detalhes completos
- Imagens gallery
- FAQ e benefícios
- Reviews/testimonials
- Botão "Comprar"

### Fase 3: Checkout e Pagamentos (2-3 dias)

1. Integrar com Mercado Pago
2. Integrar com PIX
3. Fluxo de checkout completo
4. Confirmação de pedido
5. Email de confirmação

### Fase 4: Dashboard Completo (3-4 dias)

1. **Página de Pedidos**
   - Listar, filtrar, buscar
   - Mudança de status
   - Tracking de entrega

2. **Página de Clientes**
   - CRM completo
   - Histórico de compras
   - Tags e segmentação

3. **Relatórios**
   - Gráficos de vendas
   - Top produtos
   - Análise de leads

4. **Configurações**
   - Dados da loja
   - Formas de pagamento
   - Integrações

### Fase 5: Automações & Marketing (2-3 dias)

1. Campanhas de email
2. SMS/WhatsApp
3. Funil de vendas
4. Abandoned cart recovery
5. Upsell automático

### Fase 6: Mobile & Performance (2 dias)

1. Testar responsividade
2. Otimizar imagens
3. Lazy loading
4. PWA (Progressive Web App)
5. Performance audit

## 📱 Rotas Disponíveis

**Públicas:**
- `/` - Home
- `/shop` - Loja
- `/login` - Login/Register
- `/contact` - Contato

**Autenticadas:**
- `/dashboard` - Painel principal
- `/dashboard/orders` - Pedidos
- `/dashboard/customers` - Clientes
- `/dashboard/reports` - Relatórios
- `/dashboard/settings` - Configurações

## 🎨 Customizar Visual

### Cores Primárias

Editar `src/tailwind.config.ts`:

```typescript
colors: {
  primary: {
    50: '#f0f9ff',
    600: '#0284c7',    // ← Mude aqui
    700: '#0369a1',
  }
}
```

### Logo

Substituir:
1. Favicon: `public/favicon.ico`
2. Logo em Navbar: `src/components/common/Navbar.tsx`

### Fontes

Editar `src/app/layout.tsx`:
```typescript
import { Inter, Poppins } from 'next/font/google';
const font = Poppins({ subsets: ['latin'] });
```

## 🧪 Testes Rápidos

### 1. Teste a Homepage
```bash
http://localhost:3000
# Deve mostrar hero section com botões
```

### 2. Teste a Shop
```bash
http://localhost:3000/shop
# Deve listar produtos (inicialmente vazio)
```

### 3. Teste Login
```bash
http://localhost:3000/login
# Crie uma conta com email/senha
```

### 4. Teste Dashboard
```bash
http://localhost:3000/dashboard
# Deve mostrar painel admin (após login)
```

### 5. Teste Carrinho
```bash
http://localhost:3000/cart
# Deve estar vazio inicialmente
```

## 🚢 Deploy em Produção

### Opção 1: Vercel (Recomendado)

```bash
# 1. Instalar CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod

# 4. Adicionar variáveis de ambiente no painel Vercel
NEXT_PUBLIC_JETBOT_API=https://seu-jetbot.com
JWT_SECRET=sua-chave-secreta
```

### Opção 2: Docker

```bash
# Build
docker build -t jetflix-site .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_JETBOT_API=http://jetbot:3001 \
  -e JWT_SECRET=sua-chave \
  jetflix-site

# Ou com docker-compose
docker-compose up -d
```

### Opção 3: Self-hosted

```bash
# Build
npm run build

# Start
npm start
```

## ⚙️ Variáveis de Ambiente

**Desenvolvimento:**
```env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_JETBOT_API=http://localhost:3001
```

**Produção:**
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://seu-dominio.com
NEXT_PUBLIC_JETBOT_API=https://jetbot-seu-dominio.com
JWT_SECRET=gere-com-algo-como: openssl rand -hex 32
```

## 🐛 Troubleshooting

### "Cannot find module 'bcryptjs'"
```bash
npm install bcryptjs jsonwebtoken
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

### "NEXT_PUBLIC_JETBOT_API is undefined"
```bash
# Certifique-se que está em .env.local, não .env
# Reinicie o dev server: npm run dev
```

### Port 3000 já está em uso
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou rodar em porta diferente
PORT=3001 npm run dev
```

### Erro de CORS
```bash
# Adicione headers em next.config.js
headers: {
  'Access-Control-Allow-Origin': '*'
}
```

## 📊 Checklist de Implementação

- [ ] npm install e .env.local configurado
- [ ] Dev server rodando em localhost:3000
- [ ] Homepage carregando sem erros
- [ ] Páginas de shop e cart funcionando
- [ ] Login/Register criando conta
- [ ] Dashboard mostrando após login
- [ ] JETBOT API conectada em /api/products
- [ ] Produtos listando na loja
- [ ] Carrinho persistindo em localStorage
- [ ] Checkout funcional
- [ ] Pagamentos integrados
- [ ] Email de confirmação
- [ ] Mobile responsivo
- [ ] Deploy em produção

## 📞 Suporte

Dúvidas sobre:
- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev
- **Tailwind**: https://tailwindcss.com
- **Zustand**: https://github.com/pmndrs/zustand

## 📝 Próximas Tarefas

```
PRÓ INSTALAÇÃO:
☐ Instalar dependências com npm install
☐ Configurar .env.local
☐ Rodar npm run dev
☐ Testar em http://localhost:3000

PÓS INSTALAÇÃO:
☐ Integrar com JETBOT API
☐ Adicionar produtos reais
☐ Implementar checkout
☐ Conectar pagamentos
☐ Customizar visual/logo
☐ Deploy em produção
```

---

**Desenvolvido com ❤️ por APX**
**Versão**: 1.0.0
**Data**: Junho 2026
