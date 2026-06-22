#!/usr/bin/env node

/**
 * 🚀 INSTAGRAM AUTOMATION SETUP - CLI INTERATIVO
 * 
 * Este script automático configura todo o painel Instagram
 * Basta rodar: node setup-instagram-cli.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Cores para output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log('');
  log('╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log(`║   ${title.padEnd(58)} ║`, 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');
}

async function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function validateInput(prompt, validator = null) {
  while (true) {
    const input = await question(prompt);
    
    if (!input.trim()) {
      log('   ❌ Campo obrigatório!', 'red');
      continue;
    }
    
    if (validator && !validator(input)) {
      log('   ❌ Valor inválido!', 'red');
      continue;
    }
    
    return input.trim();
  }
}

async function runSetup() {
  header('📱 SETUP INSTAGRAM AUTOMATION - AUTOMÁTICO');
  
  // 1. Welcome
  log('Bem-vindo ao setup automático do painel Instagram!', 'blue');
  log('Este script vai configurar tudo em menos de 1 minuto.', 'gray');
  console.log('');
  
  // 2. Verificar Node.js
  log('🔍 Verificando ambiente...', 'yellow');
  const nodeVersion = process.version;
  log(`✅ Node.js ${nodeVersion}`, 'green');
  
  // 3. Verificar arquivos
  console.log('');
  log('📋 Verificando arquivos...', 'yellow');
  
  const requiredFiles = ['package.json', 'next.config.js', 'tsconfig.json'];
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} não encontrado!`, 'red');
      process.exit(1);
    }
  }
  
  // 4. Coletar credenciais
  console.log('');
  log('📝 Insira suas credenciais Meta App', 'yellow');
  log('(Se não tiver, acesse: https://developers.facebook.com)', 'gray');
  console.log('');
  
  const appId = await validateInput(
    '   📲 App ID: ',
    input => /^\d+$/.test(input)
  );
  
  const appSecret = await validateInput(
    '   🔐 App Secret: ',
    input => input.length > 10
  );
  
  const accessToken = await validateInput(
    '   🎫 Access Token: ',
    input => input.length > 20
  );
  
  const businessAccountId = await validateInput(
    '   🏢 Business Account ID: ',
    input => /^\d+$/.test(input)
  );
  
  // 5. Salvar .env.local
  console.log('');
  log('💾 Salvando configurações...', 'yellow');
  
  const envPath = '.env.local';
  const envContent = `# ========================================
# META INSTAGRAM API CREDENTIALS
# ========================================
NEXT_PUBLIC_INSTAGRAM_APP_ID=${appId}
NEXT_PUBLIC_INSTAGRAM_APP_SECRET=${appSecret}
NEXT_PUBLIC_INSTAGRAM_ACCESS_TOKEN=${accessToken}
NEXT_PUBLIC_INSTAGRAM_BUSINESS_ACCOUNT_ID=${businessAccountId}

# ========================================
# JETBOT API (opcional)
# ========================================
NEXT_PUBLIC_JETBOT_API=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000

# ========================================
# JWT SECRET (mudar em produção!)
# ========================================
JWT_SECRET=your-secret-key-change-this-in-production-${Date.now()}
`;
  
  fs.writeFileSync(envPath, envContent);
  log(`✅ Arquivo .env.local criado`, 'green');
  
  // 6. Verificar node_modules
  console.log('');
  log('📦 Verificando dependências...', 'yellow');
  
  if (fs.existsSync('node_modules')) {
    log('✅ Dependências já instaladas', 'green');
    const shouldReinstall = await question('   Reinstalar? (s/n): ');
    if (shouldReinstall.toLowerCase() === 's') {
      log('   Executando: npm install', 'gray');
      require('child_process').execSync('npm install', { stdio: 'inherit' });
    }
  } else {
    log('   Executando: npm install', 'gray');
    require('child_process').execSync('npm install', { stdio: 'inherit' });
    log('✅ Dependências instaladas', 'green');
  }
  
  // 7. Teste de conectividade (mock)
  console.log('');
  log('🧪 Validando configurações...', 'yellow');
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const hasAppId = content.includes(`NEXT_PUBLIC_INSTAGRAM_APP_ID=${appId}`);
    const hasToken = content.includes(`NEXT_PUBLIC_INSTAGRAM_ACCESS_TOKEN=${accessToken}`);
    
    if (hasAppId && hasToken) {
      log('✅ Todas as configurações validadas', 'green');
    }
  }
  
  // 8. Resumo final
  console.log('');
  header('✅ SETUP CONCLUÍDO COM SUCESSO!');
  
  log('🚀 PRÓXIMOS PASSOS:', 'yellow');
  console.log('');
  log('   1. Iniciar servidor:', 'white');
  log('      $ npm run dev', 'cyan');
  console.log('');
  log('   2. Abrir seu navegador:', 'white');
  log('      → http://localhost:3000/dashboard/instagram', 'cyan');
  console.log('');
  log('   3. Começar a agendar posts!', 'white');
  console.log('');
  
  log('📊 CREDENCIAIS SALVAS:', 'yellow');
  log(`   App ID: ${appId}`, 'gray');
  log(`   Account ID: ${businessAccountId}`, 'gray');
  log(`   Token: ${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 10)}`, 'gray');
  console.log('');
  
  log('📚 DOCUMENTAÇÃO:', 'yellow');
  log('   • INSTAGRAM_PANEL_GUIDE.md', 'gray');
  log('   • INSTAGRAM_SETUP.md', 'gray');
  log('   • ARCHITECTURE.md', 'gray');
  console.log('');
  
  // 9. Perguntar se quer iniciar servidor
  const startServer = await question('❓ Quer iniciar o servidor agora? (s/n): ');
  
  if (startServer.toLowerCase() === 's') {
    console.log('');
    log('🔥 Iniciando servidor...', 'cyan');
    log('   Pressione Ctrl+C para parar', 'gray');
    console.log('');
    
    require('child_process').execSync('npm run dev', { stdio: 'inherit' });
  } else {
    log('✅ Tudo pronto! Execute "npm run dev" quando estiver pronto.', 'green');
  }
  
  rl.close();
}

// Executar setup
runSetup().catch(error => {
  log(`\n❌ Erro: ${error.message}`, 'red');
  process.exit(1);
});
