# JetFlix Site

Site profissional integrado com JETBOT V7 - Plataforma de vendas e atendimento automático.

## 🚀 Features

- ✅ **Loja Online** - Catálogo de produtos com imagens, descrições e avaliações
- ✅ **Carrinho de Compras** - Gerenciamento completo de itens
- ✅ **Autenticação** - Login/Registro de usuários com JWT
- ✅ **Dashboard Admin** - Gestão de pedidos, clientes e vendas
- ✅ **Pagamentos** - Integração com Mercado Pago, PIX e PushinPay
- ✅ **Responsivo** - Design mobile-first
- ✅ **API** - Endpoints RESTful prontos para integração
- ✅ **TypeScript** - Code com tipagem forte
- ✅ **Tailwind CSS** - Design system moderno

## 📋 Pré-requisitos

- Node.js >= 18
- npm ou yarn

## 🛠️ Instalação

```bash
# Instalar dependências
npm install

# Copiar .env.example para .env.local
cp .env.example .env.local

# Editar .env.local com suas variáveis
nano .env.local
```

## 🚀 Desenvolvimento

```bash
# Iniciar dev server
npm run dev

# Acessar http://localhost:3000
```

## 📦 Build

```bash
# Build para produção
npm run build

# Iniciar servidor de produção
npm start
```

## 📁 Estrutura

```
src/
├── app/                    # Pages e layout (App Router)
│   ├── api/               # API Routes
│   ├── dashboard/         # Painel administrativo
│   ├── shop/              # Loja
│   ├── cart/              # Carrinho
│   ├── login/             # Autenticação
│   └── page.tsx           # Homepage
├── components/            # Componentes React reutilizáveis
│   ├── common/            # Navbar, Footer, Layout
│   ├── shop/              # Componentes de loja
│   └── dashboard/         # Componentes de dashboard
├── lib/                   # Utilitários
│   ├── hooks/             # React Hooks customizados
│   ├── store/             # Zustand stores (cart, auth)
│   └── utils/             # Funções utilitárias
├── services/              # Serviços API
│   ├── apiClient.ts       # Cliente HTTP
│   ├── productService.ts  # Produtos
│   ├── orderService.ts    # Pedidos
│   ├── leadService.ts     # Leads
│   └── campaignService.ts # Campanhas
├── types/                 # TypeScript interfaces
└── styles/                # CSS global
```

## 🔗 Integrações

### Com JETBOT V7

O site se integra com a API do JETBOT V7 através de:

1. **Variável de Ambiente** `NEXT_PUBLIC_JETBOT_API`
2. **API Routes** que fazem proxy das requisições
3. **Serviços** que encapsulam a lógica de negócio

### Endpoints JETBOT

```
GET  /api/products          # Listar produtos
POST /api/admin/products    # Criar produto
GET  /api/orders            # Listar pedidos
POST /api/orders            # Criar pedido
GET  /api/leads             # Listar leads
```

## 🔐 Segurança

- JWT para autenticação
- CORS headers configurados
- Validação de entrada
- Proteção contra XSS
- Rate limiting recomendado

## 📊 Dashboard

- **Início**: Overview com KPIs
- **Pedidos**: Gestão completa de vendas
- **Clientes**: CRM e contatos
- **Relatórios**: Analytics e métricas
- **Configurações**: Setup do sistema

## 🎨 Customização

### Cores

Editar `tailwind.config.ts` na seção `theme.colors`:

```typescript
colors: {
  primary: { ... }
  success: { ... }
  danger: { ... }
}
```

### Fontes

Usar variável CSS `--font-sans` em `globals.css`

## 🚢 Deploy

### Vercel (Recomendado)

```bash
# Conectar repositório no Vercel
# Adicionar variáveis de ambiente no painel
# Deploy automático
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 API Documentation

### Authentication

```bash
# Login
POST /api/auth/login
{ "email": "...", "password": "..." }

# Register
POST /api/auth/register
{ "email": "...", "password": "...", "name": "..." }

# Get Current User
GET /api/auth/me
Headers: Authorization: Bearer {token}
```

### Products

```bash
# List
GET /api/products?page=1&limit=10

# Get Single
GET /api/products/{id}

# Create (Admin)
POST /api/admin/products
{ "name": "...", "price": "...", ... }
```

### Orders

```bash
# List User Orders
GET /api/orders/user
Headers: Authorization: Bearer {token}

# Get Single Order
GET /api/orders/{id}

# Create Order
POST /api/orders
{ "items": [...], "deliveryAddress": {...} }
```

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit seus changes (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

ISC

## 🆘 Suporte

- Documentação: [/docs](../00_COMECE_AQUI_JETBOT_V7.txt)
- Issues: GitHub Issues
- Email: suporte@jetbot.com

---

**Desenvolvido com ❤️ por APX**
