#!/usr/bin/env node

/**
 * 🔍 VERIFICADOR DE SETUP
 * Valida se tudo está configurado corretamente
 * Use: node verify-setup.js
 */

const fs = require('fs');
const path = require('path');

// Cores
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filename, required = true) {
  const exists = fs.existsSync(filename);
  const status = exists ? '✅' : '❌';
  const color = exists ? 'green' : required ? 'red' : 'yellow';
  log(`   ${status} ${filename}`, color);
  return exists;
}

function checkEnvVariable(varName) {
  const value = process.env[varName];
  if (value) {
    const masked = value.length > 10 ? value.substring(0, 10) + '...' : value;
    log(`   ✅ ${varName} = ${masked}`, 'green');
    return true;
  } else {
    log(`   ❌ ${varName} não definido`, 'red');
    return false;
  }
}

function main() {
  console.log('');
  log('╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   🔍 VERIFICADOR DE SETUP - INSTAGRAM AUTOMATION            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');

  let allOk = true;

  // 1. Node.js
  log('📦 Node.js e npm:', 'yellow');
  log(`   Node: ${process.version}`, 'gray');
  log(`   npm: ${require('child_process').execSync('npm --version', { encoding: 'utf-8' }).trim()}`, 'gray');
  console.log('');

  // 2. Arquivos Necessários
  log('📁 Arquivos Obrigatórios:', 'yellow');
  const requiredFiles = [
    'package.json',
    'next.config.js',
    'tsconfig.json',
    'tailwind.config.ts'
  ];
  requiredFiles.forEach(file => {
    if (!checkFile(file)) allOk = false;
  });
  console.log('');

  // 3. Diretórios
  log('📂 Diretórios:', 'yellow');
  const dirs = ['src', 'public', 'src/app', 'src/app/dashboard'];
  dirs.forEach(dir => {
    const exists = fs.existsSync(dir);
    const status = exists ? '✅' : '❌';
    log(`   ${status} ${dir}/`, exists ? 'green' : 'red');
    if (!exists) allOk = false;
  });
  console.log('');

  // 4. Variáveis de Ambiente
  log('⚙️  Variáveis de Ambiente:', 'yellow');
  
  let envOk = true;
  if (!fs.existsSync('.env.local')) {
    log('   ❌ .env.local não encontrado', 'red');
    envOk = false;
    allOk = false;
  } else {
    log('   ✅ .env.local encontrado', 'green');
    
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const requiredEnvVars = [
      'NEXT_PUBLIC_INSTAGRAM_APP_ID',
      'NEXT_PUBLIC_INSTAGRAM_ACCESS_TOKEN',
      'NEXT_PUBLIC_INSTAGRAM_BUSINESS_ACCOUNT_ID'
    ];
    
    requiredEnvVars.forEach(varName => {
      if (envContent.includes(varName)) {
        const match = envContent.match(new RegExp(`${varName}=(.+)`));
        if (match) {
          const value = match[1];
          const masked = value.length > 10 ? value.substring(0, 10) + '...' : value;
          log(`   ✅ ${varName}`, 'green');
        }
      } else {
        log(`   ❌ ${varName} não definido`, 'red');
        envOk = false;
        allOk = false;
      }
    });
  }
  console.log('');

  // 5. Node Modules
  log('📦 Dependências:', 'yellow');
  if (fs.existsSync('node_modules')) {
    log('   ✅ node_modules instalado', 'green');
    
    // Verificar pacotes críticos
    const criticalPackages = ['next', 'react', 'typescript', 'tailwindcss'];
    criticalPackages.forEach(pkg => {
      const pkgPath = path.join('node_modules', pkg);
      const exists = fs.existsSync(pkgPath);
      log(`   ${exists ? '✅' : '❌'} ${pkg}`, exists ? 'green' : 'yellow');
    });
  } else {
    log('   ❌ node_modules não instalado', 'red');
    log('   ➜ Execute: npm install', 'yellow');
    allOk = false;
  }
  console.log('');

  // 6. Arquivos do Instagram Panel
  log('📱 Arquivos do Painel Instagram:', 'yellow');
  const instagramFiles = [
    'src/services/instagramService.ts',
    'src/app/dashboard/instagram/page.tsx',
    'src/app/api/instagram/schedule/route.ts'
  ];
  instagramFiles.forEach(file => {
    if (!checkFile(file, false)) {
      log(`   ⚠️  ${file} pode não estar criado ainda`, 'yellow');
    }
  });
  console.log('');

  // 7. Resumo Final
  console.log('');
  if (allOk) {
    log('╔════════════════════════════════════════════════════════════════╗', 'green');
    log('║   ✅ TUDO CONFIGURADO CORRETAMENTE!                         ║', 'green');
    log('╚════════════════════════════════════════════════════════════════╝', 'green');
    console.log('');
    log('🚀 Você pode iniciar o servidor com:', 'green');
    log('   $ npm run dev', 'cyan');
    console.log('');
  } else {
    log('╔════════════════════════════════════════════════════════════════╗', 'red');
    log('║   ⚠️  ALGUNS PROBLEMAS ENCONTRADOS                          ║', 'red');
    log('╚════════════════════════════════════════════════════════════════╝', 'red');
    console.log('');
    log('💡 Solução:', 'yellow');
    log('   1. Execute: npm install', 'cyan');
    log('   2. Execute: node setup-instagram-cli.js', 'cyan');
    log('   3. Execute: node verify-setup.js (novamente)', 'cyan');
    console.log('');
  }
}

main();
