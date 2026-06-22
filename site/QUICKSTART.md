# 🚀 QUICK START - Instagram Automation Setup

## ⚡ Início Rápido em 3 Passos

### 🖥️ **Windows (PowerShell)**

```powershell
# 1. Abra PowerShell como Administrador
# 2. Navegue até o diretório do projeto
cd C:\JetFlix\site

# 3. Execute o script de setup
.\setup-instagram.ps1
```

**Pronto!** O script vai:
- ✅ Verificar Node.js
- ✅ Pedir suas credenciais Meta
- ✅ Criar `.env.local` automaticamente
- ✅ Instalar dependências
- ✅ Iniciar o servidor

---

### 🐧 **Linux / Mac (Bash)**

```bash
# 1. Navegue até o diretório do projeto
cd site

# 2. Dê permissão de execução
chmod +x setup-instagram.sh

# 3. Execute o script
./setup-instagram.sh
```

---

### 🤖 **Qualquer Sistema (Node.js CLI)**

```bash
# Funciona em Windows, Linux e Mac
node setup-instagram-cli.js
```

---

## 📋 O Que Você Precisa

Antes de rodar o script, tenha à mão:

1. **App ID** - Encontre em: `developers.facebook.com → Meus Apps → Configurações Básicas`
2. **App Secret** - Mesmo lugar (Configurações Básicas)
3. **Access Token** - Gerar em: `Tools → Graph API Explorer`
4. **Business Account ID** - Rodar query `/me?fields=id` no Graph API Explorer

### 📖 Tutorial Completo Para Pegar Credenciais

Se não tem os dados, siga este passo a passo de **5 minutos**:

```
1. Acesse: https://developers.facebook.com
2. Clique em "Meus Apps"
3. Clique em "Criar App"
4. Escolha "Business" como tipo
5. Complete o formulário
6. Adicione o produto "Instagram Graph API"
7. Configure as permissões:
   - instagram_basic
   - instagram_content_publishing
   - pages_read_engagement
   - pages_manage_metadata
8. Vá para "Tools → Graph API Explorer"
9. Selecione sua app no topo
10. Clique "Generate Access Token"
11. Copie o token (será solicitado pelo script)
```

---

## 🎯 O Que o Script Faz

### Passo 1: Verificação
```
✅ Verifica se Node.js está instalado
✅ Verifica se os arquivos necessários existem
✅ Valida versões de dependências
```

### Passo 2: Coleta de Credenciais
```
Pede para você inserir:
  - App ID (valida se é numérico)
  - App Secret (valida tamanho)
  - Access Token (valida tamanho mínimo)
  - Business Account ID (valida se é numérico)
```

### Passo 3: Configuração
```
✅ Cria arquivo .env.local
✅ Adiciona todas as variáveis de ambiente
✅ Gera JWT_SECRET automático
```

### Passo 4: Instalação
```
✅ Instala npm install se necessário
✅ Verifica todas as dependências
✅ Valida a instalação
```

### Passo 5: Inicialização
```
✅ Mostra resumo das configurações
✅ Oferece iniciar servidor automaticamente
✅ Pronto para acessar o painel!
```

---

## 🔍 Possíveis Erros

### ❌ "Node.js não encontrado"
**Solução:** Instale Node.js em https://nodejs.org

### ❌ "Permission denied" (Linux/Mac)
**Solução:** Execute `chmod +x setup-instagram.sh`

### ❌ "npm: command not found"
**Solução:** Reinstale Node.js com npm incluído

### ❌ "Campos obrigatórios"
**Solução:** Certifique-se de preencher todas as credenciais

### ❌ "EACCES: permission denied"
**Solução:** Rode com `sudo` ou mude permissões: `chmod 755 setup-instagram.sh`

---

## ✅ Verificar Se Tudo Funcionou

Após rodar o script, verifique:

```bash
# 1. .env.local foi criado?
ls -la .env.local  # (Linux/Mac)
dir .env.local     # (Windows)

# 2. Dependências instaladas?
ls -la node_modules  # deve ter muitas pastas

# 3. Servidor rodando?
npm run dev
# Deve mostrar:
# ▲ Next.js 14.2.0
# - Local:        http://localhost:3000
```

---

## 🚀 Após o Setup

```
1. Abra seu navegador
2. Vá para: http://localhost:3000
3. Clique em "Dashboard"
4. Clique em "Instagram"
5. Vá para aba "Configurações"
6. Cole seus tokens (já devem estar preenchidos)
7. Clique em "Salvar"
8. Começar a usar!
```

---

## 📊 Estrutura de Arquivos Criados

```
site/
├── setup-instagram.ps1        ← Script PowerShell (Windows)
├── setup-instagram.sh         ← Script Bash (Linux/Mac)
├── setup-instagram-cli.js     ← Script Node.js (Universal)
├── .env.local                 ← Criado automaticamente
├── node_modules/              ← Criado automaticamente
└── src/
    └── app/
        └── dashboard/
            └── instagram/page.tsx  ← Seu painel
```

---

## 🎯 Próximas Etapas

Após setup bem-sucedido:

- [ ] Acessar painel Instagram
- [ ] Validar credenciais na aba Configurações
- [ ] Testar agendamento de post
- [ ] Verificar analytics
- [ ] Customizar painel conforme necessário

---

## 📞 Precisa de Ajuda?

Consulte os arquivos de documentação:

- **INSTAGRAM_PANEL_GUIDE.md** - Guia completo de uso
- **INSTAGRAM_SETUP.md** - Detalhes técnicos
- **ARCHITECTURE.md** - Como o sistema funciona
- **README.md** - Visão geral do projeto

---

## 🔐 Segurança

⚠️ **IMPORTANTE:**

1. **NUNCA compartilhe seu .env.local**
   - Contém tokens e credenciais sensíveis
   - Está no .gitignore por padrão

2. **Em Produção:**
   - Mude o JWT_SECRET
   - Use variáveis de ambiente seguras
   - Considere usar httpOnly cookies

3. **Proteção do Token:**
   - O token é armazenado de forma segura
   - Expira automaticamente após tempo definido
   - Use HTTPS em produção

---

**✨ Pronto para começar? Execute um dos scripts acima!**
