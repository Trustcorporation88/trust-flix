#!/usr/bin/env node

/**
 * 🎭 MAESTRO - GERENCIADOR DE SETUP
 * Orquestra todos os scripts de setup
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(title) {
  console.log('');
  log('╔════════════════════════════════════════════════════════════════╗', 'magenta');
  log(`║   ${title.padEnd(58)} ║`, 'magenta');
  log('╚════════════════════════════════════════════════════════════════╝', 'magenta');
  console.log('');
}

function menu() {
  console.log('');
  log('🎭 MAESTRO - Gerenciador de Setup Instagram', 'blue');
  console.log('');
  
  const options = [
    ['1', 'Novo Setup (setup-instagram-cli.js)', 'cyan'],
    ['2', 'Verificar Setup (verify-setup.js)', 'cyan'],
    ['3', 'Iniciar Servidor (npm run dev)', 'cyan'],
    ['4', 'Ver Documentação', 'cyan'],
    ['5', 'Limpar Cache e Reinstalar', 'yellow'],
    ['0', 'Sair', 'gray']
  ];
  
  options.forEach(([num, text, color]) => {
    log(`   ${num}. ${text}`, color);
  });
  
  console.log('');
}

function newSetup() {
  try {
    execSync('node setup-instagram-cli.js', { stdio: 'inherit' });
  } catch (error) {
    log('❌ Erro ao executar setup', 'red');
  }
}

function verifySetup() {
  try {
    execSync('node verify-setup.js', { stdio: 'inherit' });
  } catch (error) {
    log('❌ Erro ao verificar setup', 'red');
  }
}

function startServer() {
  try {
    log('🚀 Iniciando servidor...', 'green');
    execSync('npm run dev', { stdio: 'inherit' });
  } catch (error) {
    log('❌ Erro ao iniciar servidor', 'red');
  }
}

function viewDocs() {
  console.log('');
  log('📚 DOCUMENTAÇÃO DISPONÍVEL:', 'yellow');
  console.log('');
  
  const docs = [
    ['1', 'SETUP_GUIDE_PT.md', 'Guia completo em Português'],
    ['2', 'QUICKSTART.md', 'Início rápido'],
    ['3', 'INSTAGRAM_PANEL_GUIDE.md', 'Guia do painel'],
    ['4', 'INSTAGRAM_SETUP.md', 'Setup técnico'],
    ['5', 'README.md', 'Documentação geral']
  ];
  
  docs.forEach(([num, file, desc]) => {
    const exists = fs.existsSync(file) ? '✅' : '❌';
    log(`   ${exists} ${num}. ${file} - ${desc}`, 'gray');
  });
  
  console.log('');
}

function cleanCache() {
  console.log('');
  log('🧹 Limpando cache...', 'yellow');
  
  try {
    if (fs.existsSync('node_modules')) {
      log('   Removendo node_modules...', 'gray');
      require('child_process').execSync('rm -rf node_modules || rmdir /s /q node_modules', { stdio: 'pipe' });
    }
    
    if (fs.existsSync('package-lock.json')) {
      log('   Removendo package-lock.json...', 'gray');
      fs.unlinkSync('package-lock.json');
    }
    
    log('✅ Cache limpo!', 'green');
    log('🔄 Reinstalando dependências...', 'yellow');
    
    execSync('npm install', { stdio: 'inherit' });
    
    log('✅ Dependências reinstaladas!', 'green');
  } catch (error) {
    log(`❌ Erro: ${error.message}`, 'red');
  }
}

function main() {
  header('🎭 MAESTRO - Setup Manager');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  function showMenu() {
    menu();
    
    rl.question('Escolha uma opção (0-5): ', (answer) => {
      switch (answer.trim()) {
        case '1':
          newSetup();
          showMenu();
          break;
        case '2':
          verifySetup();
          showMenu();
          break;
        case '3':
          startServer();
          showMenu();
          break;
        case '4':
          viewDocs();
          showMenu();
          break;
        case '5':
          cleanCache();
          showMenu();
          break;
        case '0':
          log('Até logo! 👋', 'green');
          rl.close();
          break;
        default:
          log('❌ Opção inválida', 'red');
          showMenu();
      }
    });
  }
  
  showMenu();
}

main();
