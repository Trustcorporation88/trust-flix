const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
const ok = (name) => console.log(`✅ ${name}`);
const fail = (name, error) => {
  const message = error?.message || String(error);
  errors.push(`${name}: ${message}`);
  console.log(`❌ ${name}: ${message}`);
};
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

const required = [
  'main.js', 'package.json', 'package-lock.json', 'squarecloud.app', '.env.example', '.npmrc',
  'config.js', 'aiConfig.json', 'adminConfig.js', 'automation.json', 'agenda.json', 'grupos.json',
  'disparos.json', 'marketing.json', 'database/database.json',
  'data/stock.json', 'data/orders.json', 'data/pending_payments.json', 'data/tickets.json',
  'data/automation_queue.json', 'data/automation_alerts.json', 'data/system_health.json',
  'data/setup.json', 'data/integrations.json', 'data/funnel.json',
  'src/web/server.js', 'src/web/public/index.html', 'src/web/public/app.js', 'src/web/public/styles.css',
  'src/web/public/catalogo.html', 'src/web/public/catalogo.js', 'src/web/public/catalogo.css',
  'src/web/public/downloads/JetLeads_Connector.zip',
  'extension/JetLeads_Connector/manifest.json', 'extension/JetLeads_Connector/popup.html',
  'extension/JetLeads_Connector/popup.js', 'extension/JetLeads_Connector/popup.css',
  'src/providers/clientFactory.js', 'src/providers/evolutionClient.js',
  'src/handlers/messageHandler.js', 'src/handlers/aiHandler.js',
  'src/services/paymentProcessor.js', 'src/services/automationEngine.js', 'src/services/systemMonitor.js',
  'src/services/funnelService.js', 'src/services/integrationEvents.js',
  'src/utils/setupManager.js', 'src/utils/configManager.js', 'src/utils/integrationManager.js',
  'src/utils/funnelManager.js', 'src/utils/leadImportManager.js', 'src/utils/webhookSecurity.js'
];
for (const file of required) {
  fs.existsSync(path.join(root, file)) ? ok(file) : fail(file, 'arquivo ausente');
}

const jsonFiles = [
  'package.json', 'package-lock.json', 'aiConfig.json', 'automation.json', 'agenda.json', 'grupos.json',
  'disparos.json', 'marketing.json', 'database/database.json',
  ...fs.readdirSync(path.join(root, 'data')).filter((name) => name.endsWith('.json')).map((name) => `data/${name}`),
  'extension/JetLeads_Connector/manifest.json'
];
for (const file of jsonFiles) {
  try { readJson(file); ok(`JSON ${file}`); } catch (error) { fail(`JSON ${file}`, error); }
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name.startsWith('.wwebjs') || entry.name === 'backups') return [];
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk(root).filter((file) => file.endsWith('.js'))) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    if (content.startsWith('#!')) {
      content = content.replace(/^#![^\r\n]*/, '');
    }
    new Function(content);
    ok(`Sintaxe ${path.relative(root, file)}`);
  }
  catch (error) { fail(`Sintaxe ${path.relative(root, file)}`, error); }
}

try {
  const pkg = readJson('package.json');
  if (pkg.name !== 'jetbot-robo-vendedor-automatico') throw new Error('Nome do pacote inesperado.');
  if (!String(pkg.version || '').startsWith('7.')) throw new Error('Versão deve ser 7.x.');
  for (const dependency of ['dotenv', 'express', 'whatsapp-web.js', 'axios', 'groq-sdk']) {
    if (!pkg.dependencies?.[dependency]) throw new Error(`Dependência ausente: ${dependency}`);
  }
  ok(`Pacote ${pkg.name} v${pkg.version}`);
} catch (error) { fail('Package', error); }

try {
  const lockText = fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8');
  if (/packages\.ace-research|artifactory|registry\.openai\.org/i.test(lockText)) throw new Error('package-lock contém registro interno.');
  if (!lockText.includes('https://registry.npmjs.org/')) throw new Error('Registro público do NPM não encontrado no lock.');
  ok('package-lock usa o registro público do NPM');
} catch (error) { fail('Package lock', error); }

try {
  const db = readJson('database/database.json');
  const stock = readJson('data/stock.json');
  const pending = readJson('data/pending_payments.json');
  const setup = readJson('data/setup.json');
  const integrations = readJson('data/integrations.json');
  const funnel = readJson('data/funnel.json');
  if (!Array.isArray(db.categorias) || !Array.isArray(db.produtos)) throw new Error('Banco de produtos inválido.');
  if (!stock || Array.isArray(stock) || typeof stock !== 'object') throw new Error('Estoque deve ser objeto.');
  if (!Array.isArray(pending)) throw new Error('Pagamentos pendentes devem ser uma lista.');
  if (Number(setup.version) < 3) throw new Error('Setup precisa estar na versão 3 ou superior.');
  if (!['local', 'evolution'].includes(integrations?.whatsapp?.provider)) throw new Error('Provedor WhatsApp inválido.');
  if (!Array.isArray(funnel.entryKeywords) || !funnel.privateNurture?.sequence) throw new Error('Funil de presentes inválido.');
  ok('Estruturas de dados e setup');
} catch (error) { fail('Estruturas de dados', error); }

try {
  const manifest = readJson('extension/JetLeads_Connector/manifest.json');
  if (manifest.manifest_version !== 3) throw new Error('Extensão não está em Manifest V3.');
  if (!manifest.host_permissions?.includes('https://*/*')) throw new Error('Extensão não pode enviar ao painel HTTPS.');
  ok('Extensão JETBOT Leads Connector — Manifest V3');
} catch (error) { fail('Extensão de leads', error); }

try {
  require('../src/web/server');
  require('../src/providers/clientFactory');
  require('../src/providers/evolutionClient');
  require('../src/services/paymentProcessor');
  require('../src/services/automationEngine');
  require('../src/services/systemMonitor');
  require('../src/services/funnelService');
  require('../src/services/integrationEvents');
  require('../src/utils/setupManager');
  require('../src/utils/integrationManager');
  require('../src/utils/ticketManager');
  require('../src/utils/webhookSecurity');
  ok('Módulos principais JETBOT V7 carregados');
} catch (error) { fail('Módulos JETBOT V7', error); }

try {
  const configManager = require('../src/utils/configManager');
  const productManager = require('../src/utils/productManager');
  const automationManager = require('../src/utils/automationManager');
  const publicConfig = configManager.getPublicConfig();
  const automation = automationManager.loadAutomationConfig();
  if (publicConfig.vendas?.explicarAntesDoPagamento !== true) warnings.push('Explicar antes do pagamento está desativado.');
  if (!Array.isArray(automation.abandonedCheckout?.sequence)) throw new Error('Sequência de carrinho inválida.');
  if (!Array.isArray(automation.postSale?.sequence)) throw new Error('Sequência de pós-venda inválida.');
  if (!Array.isArray(automation.renewal?.remindersDaysBefore)) throw new Error('Lembretes de renovação inválidos.');
  const products = productManager.getProducts();
  const categoryIds = new Set(productManager.getCategories().map((item) => item.id));
  for (const product of products) {
    if (product.categoriaId && !categoryIds.has(product.categoriaId)) warnings.push(`Produto ${product.nome} referencia categoria inexistente.`);
  }
  ok(`Configuração comercial, automação e ${products.length} produto(s)`);
} catch (error) { fail('Configuração comercial', error); }

try {
  const serverSource = fs.readFileSync(path.join(root, 'src/web/server.js'), 'utf8');
  const messageSource = fs.readFileSync(path.join(root, 'src/handlers/messageHandler.js'), 'utf8');
  const panelHtml = fs.readFileSync(path.join(root, 'src/web/public/index.html'), 'utf8');
  const panelCss = fs.readFileSync(path.join(root, 'src/web/public/styles.css'), 'utf8');
  for (const route of ['/api/setup', '/api/products', '/api/integrations', '/api/funnel', '/api/public/catalog', '/api/public/leads/import', '/webhooks/evolution/']) {
    if (!serverSource.includes(route)) throw new Error(`Rota ausente: ${route}`);
  }
  if (!messageSource.includes('Principais benefícios') || !messageSource.includes('O que você recebe')) throw new Error('Apresentação completa do produto não encontrada.');
  for (const page of ['Setup inicial', 'Produtos', 'CRM / Leads', 'Funil Presentes', 'Integrações']) {
    if (!panelHtml.includes(page)) throw new Error(`Página do painel ausente: ${page}`);
  }
  if (panelCss.length < 10000 || !panelCss.includes('flow-grid')) throw new Error('Interface visual parece incompleta.');
  ok('Rotas, fluxo de explicação e interface');
} catch (error) { fail('Recursos JETBOT V7', error); }

for (const warning of warnings) console.log(`⚠️ ${warning}`);
if (errors.length) {
  console.error(`\n❌ Validação JETBOT V7 falhou com ${errors.length} erro(s).`);
  process.exit(1);
}
console.log('\n✅ Validação JETBOT V7 concluída sem erros críticos.');
