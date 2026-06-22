# ========================================
# 🚀 INSTAGRAM AUTOMATION SETUP - AUTOMATIZADO
# ========================================
# Este script configura tudo automaticamente

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   📱 SETUP INSTAGRAM AUTOMATION - AUTOMÁTICO               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Node.js
Write-Host "🔍 Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js não encontrado! Baixe em: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. Verificar se .env.local existe
Write-Host ""
Write-Host "📋 Verificando configurações..." -ForegroundColor Yellow

$envPath = ".env.local"
if (Test-Path $envPath) {
    Write-Host "⚠️  .env.local já existe" -ForegroundColor Yellow
    $overwrite = Read-Host "Deseja sobrescrever? (s/n)"
    if ($overwrite -ne "s") {
        Write-Host "⏭️  Pulando configuração de ambiente" -ForegroundColor Cyan
        $skipEnv = $true
    }
}

# 3. Coletar credenciais
if (-not $skipEnv) {
    Write-Host ""
    Write-Host "📝 Insira suas credenciais Meta App" -ForegroundColor Yellow
    Write-Host "   (Se não tiver, acesse: https://developers.facebook.com)" -ForegroundColor Gray
    Write-Host ""
    
    # Função auxiliar para validar entrada
    function Get-ValidatedInput {
        param([string]$prompt, [string]$type = "text")
        
        while ($true) {
            $input = Read-Host $prompt
            
            if ([string]::IsNullOrWhiteSpace($input)) {
                Write-Host "   ❌ Campo obrigatório!" -ForegroundColor Red
                continue
            }
            
            # Validar se é número (para IDs)
            if ($type -eq "numeric") {
                if ($input -notmatch '^\d+$') {
                    Write-Host "   ❌ Deve conter apenas números!" -ForegroundColor Red
                    continue
                }
            }
            
            # Validar token (deve ter pelo menos 20 chars)
            if ($type -eq "token") {
                if ($input.Length -lt 20) {
                    Write-Host "   ❌ Token muito curto! Mínimo 20 caracteres" -ForegroundColor Red
                    continue
                }
            }
            
            return $input
        }
    }
    
    $appId = Get-ValidatedInput "   App ID" "numeric"
    $appSecret = Get-ValidatedInput "   App Secret" "text"
    $accessToken = Get-ValidatedInput "   Access Token" "token"
    $businessAccountId = Get-ValidatedInput "   Business Account ID" "numeric"
    
    # 4. Criar .env.local
    Write-Host ""
    Write-Host "💾 Salvando configurações..." -ForegroundColor Yellow
    
    $envContent = @"
# ========================================
# META INSTAGRAM API CREDENTIALS
# ========================================
NEXT_PUBLIC_INSTAGRAM_APP_ID=$appId
NEXT_PUBLIC_INSTAGRAM_APP_SECRET=$appSecret
NEXT_PUBLIC_INSTAGRAM_ACCESS_TOKEN=$accessToken
NEXT_PUBLIC_INSTAGRAM_BUSINESS_ACCOUNT_ID=$businessAccountId

# ========================================
# JETBOT API (opcional)
# ========================================
NEXT_PUBLIC_JETBOT_API=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000

# ========================================
# JWT SECRET (mudar em produção!)
# ========================================
JWT_SECRET=your-secret-key-change-this-in-production-$(Get-Random)
"@
    
    Set-Content -Path $envPath -Value $envContent
    Write-Host "✅ Configurações salvas em .env.local" -ForegroundColor Green
}

# 5. Instalar dependências
Write-Host ""
Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow

if (Test-Path "node_modules") {
    Write-Host "⚠️  node_modules já existe" -ForegroundColor Yellow
    $reinstall = Read-Host "Executar npm install novamente? (s/n)"
    if ($reinstall -eq "s") {
        npm install
    }
} else {
    npm install
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependências instaladas" -ForegroundColor Green

# 6. Testar configuração
Write-Host ""
Write-Host "🧪 Testando configurações..." -ForegroundColor Yellow

# Verificar se .env.local foi criado
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  Aviso: .env.local não encontrado" -ForegroundColor Yellow
} else {
    # Verificar se contém valores válidos
    $envContent = Get-Content ".env.local"
    
    $hasAppId = $envContent -match "NEXT_PUBLIC_INSTAGRAM_APP_ID=\d+"
    $hasToken = $envContent -match "NEXT_PUBLIC_INSTAGRAM_ACCESS_TOKEN=.{20,}"
    
    if ($hasAppId -and $hasToken) {
        Write-Host "✅ Configurações validadas" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Algumas configurações podem estar incompletas" -ForegroundColor Yellow
    }
}

# 7. Resumo final
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ SETUP CONCLUÍDO COM SUCESSO!                           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Iniciar servidor de desenvolvimento:" -ForegroundColor White
Write-Host "      $ npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "   2. Abrir painel Instagram:" -ForegroundColor White
Write-Host "      → http://localhost:3000/dashboard/instagram" -ForegroundColor Cyan
Write-Host ""
Write-Host "   3. Começar a agendar posts!" -ForegroundColor White
Write-Host ""

Write-Host "📚 DOCUMENTAÇÃO:" -ForegroundColor Yellow
Write-Host "   • INSTAGRAM_PANEL_GUIDE.md - Guia de uso" -ForegroundColor Gray
Write-Host "   • INSTAGRAM_SETUP.md - Detalhes técnicos" -ForegroundColor Gray
Write-Host "   • ARCHITECTURE.md - Arquitetura do sistema" -ForegroundColor Gray
Write-Host ""

Write-Host "❓ Quer iniciar o servidor agora? (s/n)" -ForegroundColor Yellow
$startServer = Read-Host

if ($startServer -eq "s") {
    Write-Host ""
    Write-Host "🔥 Iniciando servidor..." -ForegroundColor Cyan
    Write-Host "   Pressione Ctrl+C para parar" -ForegroundColor Gray
    Write-Host ""
    npm run dev
}
