#!/bin/bash

# ========================================
# 🚀 INSTAGRAM AUTOMATION SETUP - AUTOMATIZADO
# ========================================
# Para usuários Linux/Mac

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   📱 SETUP INSTAGRAM AUTOMATION - AUTOMÁTICO               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar Node.js
echo "🔍 Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js instalado: $NODE_VERSION"
else
    echo "❌ Node.js não encontrado! Baixe em: https://nodejs.org"
    exit 1
fi

# 2. Verificar se .env.local existe
echo ""
echo "📋 Verificando configurações..."

if [ -f ".env.local" ]; then
    echo "⚠️  .env.local já existe"
    read -p "Deseja sobrescrever? (s/n): " OVERWRITE
    if [ "$OVERWRITE" != "s" ]; then
        echo "⏭️  Pulando configuração de ambiente"
        SKIP_ENV=true
    fi
fi

# 3. Coletar credenciais
if [ "$SKIP_ENV" != "true" ]; then
    echo ""
    echo "📝 Insira suas credenciais Meta App"
    echo "   (Se não tiver, acesse: https://developers.facebook.com)"
    echo ""
    
    read -p "   App ID: " APP_ID
    read -p "   App Secret: " APP_SECRET
    read -p "   Access Token: " ACCESS_TOKEN
    read -p "   Business Account ID: " BUSINESS_ACCOUNT_ID
    
    # Validar inputs
    if [ -z "$APP_ID" ] || [ -z "$ACCESS_TOKEN" ]; then
        echo "❌ Campos obrigatórios não preenchidos!"
        exit 1
    fi
    
    # 4. Criar .env.local
    echo ""
    echo "💾 Salvando configurações..."
    
    cat > .env.local << EOF
# ========================================
# META INSTAGRAM API CREDENTIALS
# ========================================
NEXT_PUBLIC_INSTAGRAM_APP_ID=$APP_ID
NEXT_PUBLIC_INSTAGRAM_APP_SECRET=$APP_SECRET
NEXT_PUBLIC_INSTAGRAM_ACCESS_TOKEN=$ACCESS_TOKEN
NEXT_PUBLIC_INSTAGRAM_BUSINESS_ACCOUNT_ID=$BUSINESS_ACCOUNT_ID

# ========================================
# JETBOT API (opcional)
# ========================================
NEXT_PUBLIC_JETBOT_API=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000

# ========================================
# JWT SECRET (mudar em produção!)
# ========================================
JWT_SECRET=your-secret-key-change-this-in-production-$(date +%s)
EOF
    
    echo "✅ Configurações salvas em .env.local"
fi

# 5. Instalar dependências
echo ""
echo "📦 Instalando dependências..."

if [ -d "node_modules" ]; then
    echo "⚠️  node_modules já existe"
    read -p "Executar npm install novamente? (s/n): " REINSTALL
    if [ "$REINSTALL" = "s" ]; then
        npm install
    fi
else
    npm install
fi

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências!"
    exit 1
fi

echo "✅ Dependências instaladas"

# 6. Testar configuração
echo ""
echo "🧪 Testando configurações..."

if [ -f ".env.local" ]; then
    if grep -q "NEXT_PUBLIC_INSTAGRAM_APP_ID" .env.local; then
        echo "✅ Configurações validadas"
    else
        echo "⚠️  Algumas configurações podem estar incompletas"
    fi
else
    echo "⚠️  Aviso: .env.local não encontrado"
fi

# 7. Resumo final
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ✅ SETUP CONCLUÍDO COM SUCESSO!                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "🚀 PRÓXIMOS PASSOS:"
echo ""
echo "   1. Iniciar servidor de desenvolvimento:"
echo "      $ npm run dev"
echo ""
echo "   2. Abrir painel Instagram:"
echo "      → http://localhost:3000/dashboard/instagram"
echo ""
echo "   3. Começar a agendar posts!"
echo ""

echo "📚 DOCUMENTAÇÃO:"
echo "   • INSTAGRAM_PANEL_GUIDE.md - Guia de uso"
echo "   • INSTAGRAM_SETUP.md - Detalhes técnicos"
echo "   • ARCHITECTURE.md - Arquitetura do sistema"
echo ""

read -p "❓ Quer iniciar o servidor agora? (s/n): " START_SERVER

if [ "$START_SERVER" = "s" ]; then
    echo ""
    echo "🔥 Iniciando servidor..."
    echo "   Pressione Ctrl+C para parar"
    echo ""
    npm run dev
fi
