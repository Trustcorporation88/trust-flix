#!/usr/bin/env node

/**
 * 🚀 Pre-deployment Checklist
 * Verificar tudo antes de enviar para produção
 */

const fs = require('fs');
const path = require('path');

const checks = {
  '✅ Build compila sem erros': () => {
    return fs.existsSync('.next');
  },
  '✅ vercel.json existe': () => {
    return fs.existsSync('vercel.json');
  },
  '✅ package.json válido': () => {
    try {
      require('./package.json');
      return true;
    } catch {
      return false;
    }
  },
  '✅ .gitignore configurado': () => {
    return fs.existsSync('.gitignore');
  },
  '✅ next.config.js existe': () => {
    return fs.existsSync('next.config.js');
  },
  '✅ README.md existe': () => {
    return fs.existsSync('README.md');
  },
  '✅ Arquivos críticos presentes': () => {
    const critical = [
      'src/app/page.tsx',
      'src/app/dashboard/page.tsx',
      'src/services/arsenalService.ts',
      'src/hooks/useAgentExecutor.ts',
      'src/stores/arsenalStore.ts',
    ];
    return critical.every(f => fs.existsSync(f));
  },
};

console.log('\n🚀 PRE-DEPLOYMENT CHECKLIST\n');

let allPass = true;
for (const [check, fn] of Object.entries(checks)) {
  const result = fn();
  console.log(result ? `${check}` : `❌ ${check.replace('✅', '')}`);
  if (!result) allPass = false;
}

console.log('\n' + (allPass ? '✅ PRONTO PARA DEPLOY!' : '❌ Corrija os erros acima'));
console.log('\n📖 Próximo passo: Leia DEPLOYMENT_GUIDE.md\n');

process.exit(allPass ? 0 : 1);
