# 🚀 ÍNDICE DE SCRIPTS - AUTOMAÇÃO 100%

## 🎯 Qual Script Usar?

### 📊 Comparação Rápida

| Situação | Script | Comando |
|----------|--------|---------|
| **Primeira vez no Windows** | 🥇 `setup-instagram.ps1` | `.\setup-instagram.ps1` |
| **Primeira vez (qualquer SO)** | 🥇 `setup-instagram-cli.js` | `node setup-instagram-cli.js` |
| **Verificar problemas** | 🔍 `verify-setup.js` | `node verify-setup.js` |
| **Gerenciar tudo via menu** | 🎭 `maestro.js` | `node maestro.js` |
| **Reiniciar servidor** | ▶️ npm | `npm run dev` |
| **Limpar tudo e reinstalar** | 🧹 Package Manager | `npm install` |

---

## 📋 SCRIPTS DISPONÍVEIS

### 1️⃣ **setup-instagram.ps1** ⭐ RECOMENDADO PARA WINDOWS

**O que faz:**
- Verifica Node.js
- Coleta credenciais Meta (interativo)
- Valida cada entrada
- Cria `.env.local`
- Instala dependências
- Testa tudo
- Inicia servidor (opcional)

**Como usar:**
```powershell
# Abra PowerShell como Administrador
cd C:\JetFlix\site
.\setup-instagram.ps1
```

**Tempo:** ~5-10 minutos

**Melhor para:** Windows, primeira vez

---

### 2️⃣ **setup-instagram.sh** 🐧 PARA LINUX/MAC

**O que faz:**
- Mesmo que o PowerShell, mas em Bash
- Compatível com Linux e macOS
- Interativo com validação

**Como usar:**
```bash
cd site
chmod +x setup-instagram.sh
./setup-instagram.sh
```

**Tempo:** ~5-10 minutos

**Melhor para:** Linux, Mac, Bash lovers

---

### 3️⃣ **setup-instagram-cli.js** 🤖 UNIVERSAL

**O que faz:**
- Setup interativo em Node.js
- Funciona em Windows, Mac, Linux
- Interface colorida
- Validação robusta
- Resumo visual

**Como usar:**
```bash
node setup-instagram-cli.js
```

**Tempo:** ~5-10 minutos

**Melhor para:** Qualquer sistema operacional

---

### 4️⃣ **verify-setup.js** 🔍 DIAGNOSTICADOR

**O que faz:**
- Verifica Node.js e npm
- Checa todos os arquivos necessários
- Valida `.env.local`
- Procura por problemas
- Dá sugestões de solução

**Como usar:**
```bash
node verify-setup.js
```

**Tempo:** ~30 segundos

**Melhor para:** Diagnosticar problemas, antes de começar

---

### 5️⃣ **maestro.js** 🎭 MENU GERENCIADOR

**O que faz:**
- Menu interativo com opções
- Acesso a todos os scripts
- Limpeza de cache
- Visualização de docs
- Iniciar servidor

**Como usar:**
```bash
node maestro.js
```

**Opções:**
```
1. Novo Setup
2. Verificar Setup
3. Iniciar Servidor
4. Ver Documentação
5. Limpar Cache e Reinstalar
0. Sair
```

**Melhor para:** Gerenciamento completo

---

## 🎯 GUIAS DE INÍCIO

### 🟢 PRIMEIRA VEZ? SIGA ISTO:

#### **Passo 1: Pegar Credenciais (5 min)**
1. Ir para https://developers.facebook.com
2. Criar app "Business"
3. Adicionar Instagram Graph API
4. Gerar tokens em Graph API Explorer
5. Copiar: App ID, App Secret, Access Token, Business Account ID

#### **Passo 2: Executar Setup (5 min)**

**Opção A (Windows):**
```powershell
cd C:\JetFlix\site
.\setup-instagram.ps1
```

**Opção B (Qualquer Sistema):**
```bash
cd C:\JetFlix\site
node setup-instagram-cli.js
```

#### **Passo 3: Verificar (30 seg)**
```bash
node verify-setup.js
```

#### **Passo 4: Iniciar Servidor (1 min)**
```bash
npm run dev
```

#### **Passo 5: Usar Painel**
```
http://localhost:3000/dashboard/instagram
```

---

### 🟡 TEVE PROBLEMA? TENTE ISTO:

#### **1. Diagnosticar:**
```bash
node verify-setup.js
```

#### **2. Se .env.local não existe:**
```bash
node setup-instagram-cli.js
```

#### **3. Se npm install falhou:**
```bash
npm install --force
```

#### **4. Se tudo falhou:**
```bash
# Limpar tudo
rm -rf node_modules package-lock.json

# Reinstalar
npm install

# Rodar setup novamente
node setup-instagram-cli.js
```

#### **5. Último recurso:**
```bash
# Use o maestro para tudo
node maestro.js
# Escolha opção 5 para limpar e reinstalar
```

---

### 🔴 ERROS COMUNS

#### ❌ "Node.js não encontrado"
```
Solução: Baixe em https://nodejs.org
Reinstale e tente novamente
```

#### ❌ "Access Denied" (Windows)
```
Solução: Execute PowerShell como Administrador
Clique direito no PowerShell → "Executar como Administrador"
```

#### ❌ "Script não pode ser carregado" (PowerShell)
```
Solução: Execute APENAS UMA VEZ:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

Depois pode executar scripts normalmente
```

#### ❌ "Permission denied" (Linux/Mac)
```
Solução: Dê permissão
chmod +x setup-instagram.sh
./setup-instagram.sh
```

#### ❌ "npm: command not found"
```
Solução: Node.js/npm não instalado corretamente
Desinstale Node.js completamente
Reinstale de https://nodejs.org
```

#### ❌ "Port 3000 already in use"
```
Solução A: Mude a porta em package.json:
"dev": "next dev -p 3001"

Solução B: Mate o processo na porta 3000
Windows:
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  
Linux/Mac:
  lsof -ti:3000 | xargs kill -9
```

---

## 📚 DOCUMENTAÇÃO

| Arquivo | Descrição | Use Quando |
|---------|-----------|-----------|
| **SETUP_GUIDE_PT.md** | Guia passo-a-passo em português | Primeira vez |
| **QUICKSTART.md** | Início rápido | Quer começar logo |
| **INSTAGRAM_PANEL_GUIDE.md** | Guia completo do painel | Quer saber usar |
| **INSTAGRAM_SETUP.md** | Detalhes técnicos | Desenvolvedor |
| **ARCHITECTURE.md** | Como funciona tudo | Quer entender |
| **README.md** | Visão geral do projeto | Contexto geral |

---

## ✨ FLUXO RECOMENDADO

```
1. Abra Terminal/PowerShell
         ↓
2. Verifique Node.js: node --version
         ↓
3. Navegue para: cd C:\JetFlix\site
         ↓
4. Coletar credenciais em developers.facebook.com (5 min)
         ↓
5. Execute setup: .\setup-instagram.ps1  (ou outro script)
         ↓
6. Pressione 's' para iniciar servidor
         ↓
7. Abra: http://localhost:3000
         ↓
8. Clique em Dashboard → Instagram
         ↓
9. Configure credenciais na aba Configurações
         ↓
10. Comece a agendar posts! 🎉
```

---

## 🚨 IMPORTANTE

### Segurança

⚠️ **NUNCA:**
- ❌ Compartilhe seu `.env.local`
- ❌ Faça commit do `.env.local` (está em .gitignore)
- ❌ Compartilhe seus tokens
- ❌ Publique credenciais no GitHub

### Se Tokens Expirarem

1. Gere novo token em Graph API Explorer
2. Atualize em `.env.local`
3. Reinicie servidor: `npm run dev`

### Em Produção

- Mude o JWT_SECRET
- Use HTTPS obrigatório
- Configure variáveis de ambiente seguras
- Considere usar httpOnly cookies
- Não use tokens em localStorage

---

## 🎁 BÔNUS

Todos os scripts fazem validação automática de:
- ✅ Node.js instalado
- ✅ npm funcionando
- ✅ Arquivos necessários
- ✅ Variáveis de ambiente
- ✅ Permissões de arquivo
- ✅ Porta 3000 disponível

---

## 📞 SUPORTE

Se preso:

1. **Leia:** SETUP_GUIDE_PT.md (em português)
2. **Rode:** `node verify-setup.js` (diagnóstico)
3. **Use:** `node maestro.js` (menu de ajuda)
4. **Limpe:** Opção 5 do maestro (limpar cache)

---

## 🎯 TL;DR (Muito Longo; Didn't Read)

```bash
# Windows:
cd C:\JetFlix\site
.\setup-instagram.ps1

# Qualquer coisa:
cd C:\JetFlix\site
node setup-instagram-cli.js
```

**Pronto! Em 5-10 minutos seu painel está rodando.** ✨

---

**Última atualização:** 2024
**Status:** ✅ Pronto para Produção
**Suporte:** Completo
