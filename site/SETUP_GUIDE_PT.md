# 🎯 GUIA COMPLETO - SETUP AUTOMATIZADO

## 🚀 OPÇÃO MAIS RÁPIDA (Recomendado para Windows)

### 1️⃣ Abra PowerShell como Administrador

```powershell
# Clique com botão direito no PowerShell → "Executar como Administrador"
```

### 2️⃣ Navegue até a pasta do projeto

```powershell
cd C:\JetFlix\site
```

### 3️⃣ Execute o script de setup

```powershell
.\setup-instagram.ps1
```

**Pronto!** O script vai fazer tudo automaticamente:
- ✅ Verificar Node.js
- ✅ Pedir seus tokens Meta
- ✅ Criar `.env.local`
- ✅ Instalar dependências
- ✅ Validar tudo
- ✅ Iniciar servidor (você escolhe)

---

## 📱 ONDE PEGAR SEUS TOKENS

### ⏱️ Tempo estimado: 5 minutos

#### 1. Ir para Facebook Developers

```
https://developers.facebook.com
```

#### 2. Criar uma Nova App

```
Clique em "Meus Apps" (topo direito)
    ↓
Clique em "Criar App"
    ↓
Selecione "Business"
    ↓
Preencha:
  - App Name: "Instagram Automation"
  - Email: seu@email.com
  - Finalidade: "Automação de Instagram"
    ↓
Clique "Criar App"
```

#### 3. Adicionar Instagram Graph API

```
No painel da app:
  
Clique em "Produtos" (coluna esquerda)
    ↓
Clique em "Adicionar Produto"
    ↓
Procure por "Instagram Graph API"
    ↓
Clique em "Configurar"
```

#### 4. Configurar Permissões

```
Na página de configuração:

Clique em "Roles" (esquerda)
    ↓
Clique em "Funções"
    ↓
Encontre seu usuário
    ↓
Dê permissão de "Desenvolvedor"
```

#### 5. Copiar App ID e App Secret

```
Vá para "Settings → Basic"
    ↓
Copie o "App ID" (número grande)
    ↓
Copie o "App Secret" (código)
```

#### 6. Gerar Access Token

```
Vá para "Tools → Graph API Explorer"
    ↓
No topo, selecione sua App
    ↓
Clique no dropdown de permissões
    ↓
Selecione estas permissões:
  ✓ instagram_basic
  ✓ instagram_content_publishing
  ✓ pages_read_engagement
  ✓ pages_manage_metadata
    ↓
Clique "Generate Access Token"
    ↓
Copie o token (número/letras longos)
```

#### 7. Pegar Business Account ID

```
No Graph API Explorer:
    ↓
Na query box, coloque: /me?fields=id
    ↓
Clique "Submit"
    ↓
Copie o "id" que aparecer
```

---

## 📋 PASSO A PASSO DO SCRIPT

Quando você rodar `.\setup-instagram.ps1`, vai ver isso:

```
╔════════════════════════════════════════════════════════════════╗
║   📱 SETUP INSTAGRAM AUTOMATION - AUTOMÁTICO               ║
╚════════════════════════════════════════════════════════════════╝

🔍 Verificando Node.js...
✅ Node.js instalado: v18.17.0

📋 Verificando configurações...

📝 Insira suas credenciais Meta App

   App ID: █  (cole seu App ID aqui)
   App Secret: █  (cole seu App Secret)
   Access Token: █  (cole seu Access Token)
   Business Account ID: █  (cole seu ID)

💾 Salvando configurações...
✅ Configurações salvas em .env.local

📦 Instalando dependências...
...muita coisa de npm...

✅ Dependências instaladas

🧪 Testando configurações...
✅ Configurações validadas

╔════════════════════════════════════════════════════════════════╗
║   ✅ SETUP CONCLUÍDO COM SUCESSO!                           ║
╚════════════════════════════════════════════════════════════════╝

🚀 PRÓXIMOS PASSOS:

   1. Iniciar servidor de desenvolvimento:
      $ npm run dev

   2. Abrir painel Instagram:
      → http://localhost:3000/dashboard/instagram

   3. Começar a agendar posts!

❓ Quer iniciar o servidor agora? (s/n):
```

---

## 🔍 ALTERNATIVAS

### Se não quiser usar PowerShell:

**Opção 2: CLI Node.js (qualquer sistema)**
```bash
node setup-instagram-cli.js
```

**Opção 3: Script Bash (Linux/Mac)**
```bash
chmod +x setup-instagram.sh
./setup-instagram.sh
```

**Opção 4: Manual (se nada funcionar)**
```bash
# 1. Copie .env.example para .env.local
cp .env.example .env.local

# 2. Edite .env.local e adicione seus tokens
# (use qualquer editor de texto)

# 3. Instale dependências
npm install

# 4. Inicie servidor
npm run dev
```

---

## ✅ DEPOIS DO SETUP

### 1. Servidor rodando?

Você deve ver:
```
▲ Next.js 14.2.0
- Local:        http://localhost:3000
```

### 2. Acessar o painel

```
http://localhost:3000/dashboard/instagram
```

### 3. Configure (se necessário)

Vá para aba "Configurações" e valide seus tokens.

### 4. Começar a usar!

- Clique em "Agendador"
- Cole uma imagem URL
- Escreva a legenda
- Escolha data/hora
- Clique "Agendar Post"

---

## 🐛 TROUBLESHOOTING

### ❌ "Erro: Node.js não encontrado"
```
Solução: Baixe em https://nodejs.org
Reinstale e tente novamente
```

### ❌ "npm: command not found"
```
Solução: Node.js não foi instalado corretamente
Desinstale e reinstale
```

### ❌ "Access Denied" (Windows)
```
Solução: Rode PowerShell como Administrador
Clique direito → "Executar como Administrador"
```

### ❌ "Script não pode ser carregado"
```
Solução (PowerShell): Execute isto uma vez:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ❌ "Port 3000 already in use"
```
Solução: Outra aplicação usa porta 3000
Mude em package.json: "dev": "next dev -p 3001"
Ou: Feche a aplicação que usa a porta 3000
```

### ❌ "ENOENT: no such file or directory"
```
Solução: Está na pasta certa?
cd C:\JetFlix\site
```

---

## 🔐 SEGURANÇA

⚠️ **IMPORTANTE:**

1. **Nunca compartilhe seu .env.local**
   - Contém tokens sensíveis
   - Está no .gitignore (não comita)

2. **Tokens expirarem?**
   - Gere um novo em Graph API Explorer
   - Atualize no .env.local
   - Reinicie o servidor

3. **Em Produção:**
   - Mude o JWT_SECRET
   - Use variáveis de ambiente seguras
   - Considere usar httpOnly cookies
   - Implante com HTTPS

---

## 📞 PRECISA DE AJUDA?

Consulte:
- **QUICKSTART.md** - Guia rápido
- **INSTAGRAM_PANEL_GUIDE.md** - Guia completo
- **INSTAGRAM_SETUP.md** - Detalhes técnicos
- **ARCHITECTURE.md** - Como funciona

---

## 🎉 PRONTO!

**Agora é só executar:**

```powershell
.\setup-instagram.ps1
```

**E pronto! Seu painel Instagram estará funcionando em menos de 5 minutos!**

✨ Aproveite! 🚀
