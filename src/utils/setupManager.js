const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { loadConfig } = require('./configManager');
const productManager = require('./productManager');
const automationManager = require('./automationManager');
const integrationManager = require('./integrationManager');
const funnelManager = require('./funnelManager');
const { getPublicAiConfig } = require('./aiConfigManager');
const runtimeState = require('../core/runtimeState');

const file = path.resolve(__dirname, '../../data/setup.json');
const fallback = { version: 3, completed: false, currentStep: 1, businessType: 'digital_products', completedAt: null, updatedAt: null, checklist: {} };
function loadSetup() { const data = readJson(file, fallback); return { ...fallback, ...data, checklist: { ...(data.checklist || {}) } }; }
function saveSetup(patch = {}) { const current = loadSetup(); const next = { ...current, ...patch, checklist: { ...current.checklist, ...(patch.checklist || {}) }, updatedAt: new Date().toISOString() }; writeJson(file, next); return next; }
function productIsReady(product) {
  const explained = Boolean(product.nome && (product.descricaoCurta || product.descricao) && (product.beneficios?.length || product.inclui?.length || product.faq?.length));
  const type = product.deliveryType || 'stock';
  let deliveryReady = true;
  if (product.entregaAutomatica === false || type === 'manual') deliveryReady = true;
  else if (type === 'link') deliveryReady = Boolean(String(product.deliveryLink || '').trim());
  else if (type === 'webhook') deliveryReady = /^https?:\/\//i.test(String(product.deliveryWebhookUrl || '').trim());
  else deliveryReady = Number(product.estoque || 0) > 0;
  return product.ativo !== false && Number(product.preco) >= 0 && explained && deliveryReady;
}
function computeChecklist() {
  const config = loadConfig();
  const products = productManager.getProducts();
  const activeProducts = products.filter((p) => p.ativo !== false);
  const integrations = integrationManager.loadIntegrations();
  const runtime = runtimeState.getPublicState();
  const automation = automationManager.loadAutomationConfig();
  const ai = getPublicAiConfig();
  const funnel = funnelManager.loadFunnel();
  const hasPayment = Boolean(config.pagamentos?.mercadoPago?.ativo || config.pagamentos?.pushinpay?.ativo || config.pagamentos?.pixManual?.ativo);
  const adminNumbers = Array.isArray(config.bot?.adminNumbers) ? config.bot.adminNumbers.filter(Boolean) : [];
  const businessReady = Boolean(config.bot?.nome && !/SUA MARCA/i.test(config.bot.nome) && config.bot?.descricaoNegocio);
  const providerReady = integrations.whatsapp.provider === 'local' || Boolean(integrations.whatsapp.evolution?.baseUrl && integrations.whatsapp.evolution?.instance);
  const funnelReady = !funnel.enabled || Boolean(funnel.groupLink || funnel.pageLink || funnel.storeLink);
  return {
    business: businessReady,
    admin: adminNumbers.length > 0,
    whatsappProvider: providerReady,
    whatsappConnected: Boolean(runtime.whatsapp?.connected),
    product: activeProducts.length > 0,
    productExplanation: activeProducts.some(productIsReady),
    payment: hasPayment,
    automation: automation.enabled !== false,
    ai: ai.iaAtiva ? Boolean(ai.groqToken) : true,
    funnel: funnelReady
  };
}
function status() {
  const setup = loadSetup(); const checklist = computeChecklist();
  const required = ['business','admin','whatsappProvider','whatsappConnected','product','productExplanation','payment','automation'];
  const ready = required.every((key) => checklist[key]);
  return { ...setup, checklist, ready, required };
}
function complete() { const current = status(); const next = saveSetup({ completed: current.ready, completedAt: current.ready ? new Date().toISOString() : null, checklist: current.checklist }); return { ...next, ready: current.ready, required: current.required }; }
module.exports = { loadSetup, saveSetup, status, complete, computeChecklist, productIsReady };
