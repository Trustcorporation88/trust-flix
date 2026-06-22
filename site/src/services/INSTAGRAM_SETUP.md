# Instagram Automation Panel - Official Setup

## 📋 Pré-requisitos

1. **Meta App** (Conta de desenvolvedor)
   - App ID
   - App Secret
   - Access Token

2. **Instagram Business Account**
   - Conectado ao Facebook
   - Acesso de desenvolvedor

3. **Node.js & npm**

## 🔐 Como Configurar Meta App (5 minutos)

### 1. Criar Meta App
```
1. Acesse: developers.facebook.com
2. Apps → Create App
3. App Name: "Instagram Scheduler"
4. App Type: "Business"
```

### 2. Adicionar Instagram Graph API
```
1. Produtos → Adicionar → Instagram Graph API
2. Configure Permissions:
   - instagram_basic
   - instagram_content_publishing
   - pages_read_engagement
   - pages_manage_metadata
```

### 3. Gerar Access Token
```
1. Tools → Graph Explorer
2. Selecione sua app
3. Gere token com permissões acima
4. Copie e coloque em .env
```

## 📊 Documentação Oficial
- https://developers.facebook.com/docs/instagram-api
- https://developers.facebook.com/docs/instagram-api/guides/content-publishing

## 🚀 Próximo Passo
→ Vou criar toda a integração pronta para você!
