# 🚀 SETUP MASTER - Tudo Automatizado

## ⚡ TL;DR (Muito Longo, Não Leu)

```bash
# Windows PowerShell (Administrador):
cd C:\JetFlix\site
.\setup-instagram.ps1

# Qualquer coisa:
node setup-instagram-cli.js
```

**Pronto em ~6 minutos!** ✨

---

## 🎯 O QUE FOI CRIADO

### 5️⃣ Scripts Automáticos

| Script | Sistema | Uso | Tempo |
|--------|---------|-----|-------|
| `setup-instagram.ps1` | Windows | 🥇 Recomendado | 5-10 min |
| `setup-instagram-cli.js` | Todos | 🥈 Universal | 5-10 min |
| `setup-instagram.sh` | Linux/Mac | 🥉 Bash | 5-10 min |
| `verify-setup.js` | Todos | 🔍 Diagnóstico | 30 seg |
| `maestro.js` | Todos | 🎭 Menu | Ilimitado |

### 3️⃣ Guias de Documentação

| Arquivo | Para Quem | Tamanho |
|---------|-----------|--------|
| `SETUP_GUIDE_PT.md` | Iniciantes (PT) | 6.8 KB |
| `QUICKSTART.md` | Quick starters | 5.4 KB |
| `SCRIPTS_INDEX.md` | Referência | 7.5 KB |

---

## 🚀 COMECE AGORA

### 1️⃣ Pré-requisitos

✅ Node.js instalado (https://nodejs.org)  
✅ Credenciais Meta (pegar em ~5 min)  
✅ Terminal/PowerShell  

### 2️⃣ Pegar Credenciais (5 minutos)

**Local:** https://developers.facebook.com

**O que pegar:**
1. **App ID** → Settings → Basic
2. **App Secret** → Settings → Basic
3. **Access Token** → Tools → Graph API Explorer
4. **Business Account ID** → Query `/me?fields=id`

### 3️⃣ Executar Setup (Escolha Uma)

#### 🟢 Opção 1: Windows PowerShell (MELHOR)

```powershell
# Abra PowerShell como Administrador
cd C:\JetFlix\site
.\setup-instagram.ps1
```

#### 🟢 Opção 2: Node.js CLI (UNIVERSAL)

```bash
cd C:\JetFlix\site
node setup-instagram-cli.js
```

#### 🟢 Opção 3: Menu Gerenciador

```bash
node maestro.js
# Escolha opção 1
```

### 4️⃣ Seguir as Instruções

O script vai:
- ✅ Pedir seus tokens
- ✅ Validar tudo
- ✅ Criar `.env.local`
- ✅ Instalar dependências
- ✅ Testar tudo
- ✅ Oferece iniciar servidor

### 5️⃣ Aproveite o Painel

```
http://localhost:3000/dashboard/instagram
```

---

## 📊 O QUE CADA SCRIPT FAZ

### 🔧 setup-instagram.ps1

**PowerShell exclusivo para Windows**

```
Fluxo:
1. Verifica Node.js
2. Coleta credenciais (com validação)
3. Cria .env.local
4. npm install
5. Valida tudo
6. Inicia servidor (opcional)
```

**Use quando:**
- Está no Windows
- Quer setup automático completo
- Quer iniciar servidor após setup

**Comando:**
```powershell
.\setup-instagram.ps1
```

---

### 🤖 setup-instagram-cli.js

**Node.js universal (Windows/Mac/Linux)**

```
Fluxo:
1. Verifica Node.js
2. Coleta credenciais (com UI colorida)
3. Valida cada entrada
4. Cria .env.local
5. npm install
6. Testa tudo
7. Mostra resumo
```

**Use quando:**
- Quer compatibilidade total
- Prefere interface interativa
- Está em qualquer SO

**Comando:**
```bash
node setup-instagram-cli.js
```

---

### 🐧 setup-instagram.sh

**Bash para Linux/Mac**

```
Fluxo:
Igual ao PowerShell, mas em Bash
```

**Use quando:**
- Está em Linux/Mac
- Quer setup automático

**Comando:**
```bash
chmod +x setup-instagram.sh
./setup-instagram.sh
```

---

### 🔍 verify-setup.js

**Diagnosticador de problemas**

```
Verifica:
- Node.js e npm
- Todos os arquivos necessários
- .env.local e variáveis
- node_modules
- Dependências críticas
```

**Use quando:**
- Quer diagnosticar problemas
- Antes de começar (verificação)
- Se algo deu errado

**Comando:**
```bash
node verify-setup.js
```

---

### 🎭 maestro.js

**Menu interativo para tudo**

```
Menu:
1. Novo Setup
2. Verificar Setup
3. Iniciar Servidor
4. Ver Documentação
5. Limpar Cache e Reinstalar
0. Sair
```

**Use quando:**
- Quer um menu central
- Quer acessar tudo de um lugar
- Quer gerenciamento simples

**Comando:**
```bash
node maestro.js
```

---

## ❓ PERGUNTAS FREQUENTES

### P: Qual script devo usar?

**R:** Depende:
- **Windows?** → `.\setup-instagram.ps1` ⭐
- **Mac/Linux?** → `./setup-instagram.sh` ou `node setup-instagram-cli.js`
- **Qualquer coisa?** → `node setup-instagram-cli.js`
- **Com dúvida?** → `node verify-setup.js` primeiro

### P: Quanto tempo demora?

**R:** ~6-10 minutos total:
- Pegar credenciais: 3-5 min
- Rodar script: 1-2 min
- npm install: 2-3 min

### P: Preciso de conta de desenvolvedor?

**R:** Sim, em developers.facebook.com (é grátis)

### P: Os scripts são seguros?

**R:** Sim! Eles:
- Validam todos os inputs
- Não compartilham dados
- Criam apenas .env.local local
- Validam tudo antes de usar

### P: E se der erro?

**R:** Execute: `node verify-setup.js`

Ele vai te mostrar o que tá errado.

### P: Meu token expirou?

**R:** Gere um novo em Graph API Explorer e atualize em .env.local

### P: Posso rodar script de novo?

**R:** Sim! Ele pergunta se quer sobrescrever .env.local

### P: Como resetar tudo?

**R:** Use maestro.js, opção 5 (limpar cache e reinstalar)

---

## 🔒 SEGURANÇA

⚠️ **IMPORTANTE:**

1. **Nunca compartilhe .env.local**
   - Contém tokens sensíveis
   - Está no .gitignore

2. **Em Produção:**
   - Mude JWT_SECRET
   - Use HTTPS obrigatório
   - Configure variáveis de ambiente

3. **Se Token Vazar:**
   - Gere novo imediatamente
   - Atualize em .env.local
   - Monitore atividade

---

## 📚 DOCUMENTAÇÃO

| Arquivo | Conteúdo | Leia Quando |
|---------|----------|------------|
| **SETUP_GUIDE_PT.md** | Guia completo | Primeira vez |
| **QUICKSTART.md** | Início rápido | Quer começar logo |
| **SCRIPTS_INDEX.md** | Referência scripts | Quer saber mais |
| **INSTAGRAM_PANEL_GUIDE.md** | Como usar painel | Já tem rodando |
| **ARCHITECTURE.md** | Técnico | Dev avançado |

---

## 🐛 ERROS COMUNS

### ❌ "Node.js não encontrado"
```
Solução: Instale em https://nodejs.org
```

### ❌ "Access Denied" (Windows)
```
Solução: Execute PowerShell como Administrador
```

### ❌ "Script não pode ser carregado" (PowerShell)
```
Solução: Execute UMA VEZ:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ❌ "Port 3000 already in use"
```
Solução: Mude em package.json:
"dev": "next dev -p 3001"
```

### ❌ "npm install falhou"
```
Solução:
rm -rf node_modules
npm cache clean --force
npm install
```

---

## ✨ FLUXO RECOMENDADO

```
1. Abra Terminal/PowerShell
    ↓
2. Verifique Node.js: node --version
    ↓
3. Navegue para: cd C:\JetFlix\site
    ↓
4. (Opcional) Verifique: node verify-setup.js
    ↓
5. Pega credenciais em developers.facebook.com (5 min)
    ↓
6. Execute setup:
   .\setup-instagram.ps1
   (ou node setup-instagram-cli.js)
    ↓
7. Responda as perguntas do script
    ↓
8. Espere npm install terminar
    ↓
9. Pressione 's' para iniciar servidor
    ↓
10. Abra: http://localhost:3000
    ↓
11. Clique Dashboard → Instagram
    ↓
12. 🎉 Pronto! Comece a usar!
```

---

## 🎯 CHECKLIST FINAL

- [ ] Node.js instalado (`node --version`)
- [ ] Credenciais Meta coletadas
- [ ] Na pasta correta (`cd C:\JetFlix\site`)
- [ ] Executou script de setup
- [ ] Respondeu todas as perguntas
- [ ] npm install terminou sem erros
- [ ] Servidor iniciou
- [ ] Acessou `http://localhost:3000`
- [ ] Painel Instagram abre
- [ ] Configurações validadas
- [ ] Pronto para usar! ✨

---

## 🚀 PRONTO?

Escolha seu script e comece:

### Windows:
```powershell
.\setup-instagram.ps1
```

### Qualquer SO:
```bash
node setup-instagram-cli.js
```

### Sair do dúvida:
```bash
node verify-setup.js
```

---

**Boa sorte! Seu painel estará rodando em ~6 minutos! 🎉**

---

**Última atualização:** 2024  
**Status:** ✅ Pronto para Produção  
**Versão:** 1.0.0
