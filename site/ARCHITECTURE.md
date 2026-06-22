# ARQUITETURA - JetFlix Site Professional

## 🏗️ Visão Geral da Arquitetura

O JetFlix Site é uma aplicação Next.js 14 que se integra com a API do JETBOT V7 para criar uma plataforma de vendas e atendimento completa.

```
┌─────────────────────────────────────────────────────┐
│              Cliente (Browser/Mobile)               │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│    Next.js 14 (Frontend + BFF)                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  Pages (App Router)                         │   │
│  │  - Shop (Catálogo)                          │   │
│  │  - Cart (Carrinho)                          │   │
│  │  - Auth (Login/Register)                    │   │
│  │  - Dashboard (Admin)                        │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │  API Routes (Backend for Frontend)          │   │
│  │  - /api/products → JETBOT API               │   │
│  │  - /api/orders → JETBOT API                 │   │
│  │  - /api/auth → JWT Local                    │   │
│  │  - /api/leads → JETBOT API                  │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │  Services (Client-side)                     │   │
│  │  - productService                           │   │
│  │  - orderService                             │   │
│  │  - leadService                              │   │
│  │  - campaignService                          │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │  State Management (Zustand)                 │   │
│  │  - useCart (carrinho)                       │   │
│  │  - useAuth (autenticação)                   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│    JETBOT V7 API (Backend Principal)                │
│  - Produtos                                         │
│  - Pedidos                                          │
│  - Pagamentos                                       │
│  - CRM/Leads                                        │
│  - Automações                                       │
│  - WhatsApp Bot                                     │
└─────────────────────────────────────────────────────┘
```

## 📂 Estrutura de Diretórios

```
site/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes (BFF)
│   │   │   ├── auth/                 # Autenticação
│   │   │   ├── products/             # Produtos
│   │   │   ├── orders/               # Pedidos
│   │   │   └── ...
│   │   ├── dashboard/                # Painel Admin
│   │   │   ├── layout.tsx            # Layout protegido
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── orders/
│   │   │   ├── customers/
│   │   │   └── ...
│   │   ├── shop/                     # Loja E-commerce
│   │   │   ├── page.tsx              # Listagem
│   │   │   ├── [slug]/               # Produto detalhe
│   │   │   └── page.tsx
│   │   ├── cart/                     # Carrinho
│   │   │   └── page.tsx
│   │   ├── login/                    # Autenticação
│   │   │   └── page.tsx
│   │   ├── layout.tsx                # Layout principal
│   │   ├── globals.css               # Estilos globais
│   │   ├── providers.tsx             # Providers
│   │   └── page.tsx                  # Home
│   ├── components/                   # Componentes React
│   │   ├── common/                   # Reutilizáveis
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── Toast.tsx
│   │   ├── shop/                     # E-commerce
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   └── Filter.tsx
│   │   └── dashboard/                # Admin
│   │       ├── OrderTable.tsx
│   │       ├── CustomerStats.tsx
│   │       └── ...
│   ├── lib/                          # Utilidades
│   │   ├── hooks/                    # React Hooks
│   │   │   ├── useAuthInit.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   └── ...
│   │   ├── store/                    # Zustand Stores
│   │   │   ├── cartStore.ts
│   │   │   ├── authStore.ts
│   │   │   └── ...
│   │   └── utils/                    # Funções utilitárias
│   │       ├── formatters.ts
│   │       └── ...
│   ├── services/                     # API Client Services
│   │   ├── apiClient.ts              # Cliente HTTP
│   │   ├── productService.ts
│   │   ├── orderService.ts
│   │   ├── leadService.ts
│   │   └── campaignService.ts
│   └── types/                        # TypeScript Interfaces
│       └── index.ts
├── public/                           # Assets estáticos
├── .env.example                      # Variáveis de exemplo
├── .prettierrc                       # Prettier config
├── .eslintrc.json                    # ESLint config
├── next.config.js                    # Next.js config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
├── Dockerfile                        # Container image
├── docker-compose.yml                # Docker compose
├── package.json                      # Dependências
└── README.md                         # Documentação
```

## 🔄 Fluxo de Dados

### 1. Autenticação

```
User Input → Page (login/page.tsx)
    ↓
Form Submit → apiClient.post('/api/auth/login')
    ↓
API Route (/api/auth/login) → Generate JWT
    ↓
Response: { token, user }
    ↓
localStorage.setItem('token')
    ↓
useAuth().setUser() → Zustand Store
    ↓
Redirect to /dashboard
```

### 2. Carrinho de Compras

```
Product Page → Click "Add to Cart"
    ↓
useCart.addItem({ productId, quantity, price })
    ↓
Zustand Store atualiza items[]
    ↓
UI atualiza (badge de quantidade)
    ↓
localStorage persiste automaticamente
    ↓
Checkout → POST /api/orders
```

### 3. Fluxo de Compra

```
Shop Page → View Product
    ↓
ProductCard → Add to Cart
    ↓
Cart Page → Review Items
    ↓
Checkout → Select Delivery Address
    ↓
Select Payment Method (PIX/MercadoPago)
    ↓
API Call → POST /api/orders/initialize-payment
    ↓
JETBOT API → Create Payment (Mercado Pago/PIX)
    ↓
Show Payment QR/Link
    ↓
Poll /api/payment-status until paid
    ↓
Order Confirmation
```

## 🔐 Segurança

### JWT Authentication

- Token gerado no `/api/auth/login` ou `/api/auth/register`
- Token armazenado em `localStorage` (considere usar HttpOnly cookies em produção)
- Token incluído no header `Authorization: Bearer {token}` em todas as requisições
- Middleware verifica token na API

### API Route Protection

```typescript
// Padrão usado nas API Routes
const token = request.headers.get('Authorization')?.replace('Bearer ', '');
if (!token) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Validação de Entrada

- Zod para validação de schemas
- Sanitização de inputs
- CORS headers configurados

## 🔌 Integração com JETBOT V7

O site se integra com JETBOT através de:

1. **Variável de Ambiente**: `NEXT_PUBLIC_JETBOT_API`
2. **API Routes**: fazem proxy das requisições
3. **Services**: encapsulam a lógica

### Exemplo: Listar Produtos

```typescript
// Frontend → Browser
fetch('/api/products')

// API Route: src/app/api/products/route.ts
const jetbotApi = process.env.NEXT_PUBLIC_JETBOT_API
fetch(`${jetbotApi}/api/products`)

// JETBOT V7 Backend
JETBOT responde com lista de produtos
```

## 📊 Estado da Aplicação

### Zustand Stores

#### useAuth Store
```typescript
{
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser(user)
  logout()
  setLoading(bool)
}
```

#### useCart Store
```typescript
{
  items: CartItem[]
  addItem(item)
  removeItem(productId)
  updateQuantity(productId, qty)
  clearCart()
  getTotal()
  getItemCount()
}
```

## 🚀 Performance

- **Code Splitting**: Páginas são lazy-loaded automaticamente
- **Image Optimization**: Next.js Image component
- **CSS-in-JS**: Tailwind CSS com tree-shaking
- **Caching**: SWR para API calls com revalidação
- **Compression**: gzip/brotli em produção

## 📈 Escalabilidade

### Current Stack
- Single Next.js instance
- Stateless API Routes (fácil de escalar)
- Frontend: Vercel (auto-scaling)
- Backend: JETBOT V7 (em outro servidor)

### Future Improvements
- Separar API para micro-serviços
- Cache layer (Redis)
- Database com read replicas
- CDN para assets estáticos
- Message queue para jobs assíncronos

## 🔧 Deployment

### Vercel (Recomendado)

```bash
# 1. Push para GitHub
git push origin main

# 2. Conectar no Vercel
# Vercel detecta Next.js automaticamente

# 3. Adicionar variáveis de ambiente
NEXT_PUBLIC_JETBOT_API=https://jetbot.seu-dominio.com
JWT_SECRET=seu-secret-super-seguro
```

### Docker

```bash
docker-compose up -d
```

### Self-hosted

```bash
npm run build
npm start
```

## 📝 Convenções de Código

- **Nomes de arquivos**: kebab-case (my-component.tsx)
- **Componentes**: PascalCase (MyComponent)
- **Funções**: camelCase (myFunction)
- **Constantes**: SCREAMING_SNAKE_CASE (MY_CONSTANT)
- **Tipos**: PascalCase (MyType)

## 🧪 Testing

Estrutura pronta para:
- Jest + React Testing Library
- Testes unitários
- Testes de integração
- E2E com Playwright

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [TypeScript](https://www.typescriptlang.org)

---

**Última atualização**: Junho 2026
