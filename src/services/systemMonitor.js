const fs = require('fs');
const path = require('path');
const runtimeState = require('../core/runtimeState');
const automation = require('../utils/automationManager');
const { getProducts } = require('../utils/productManager');
const { listOrders } = require('../utils/orderManager');
const { listTickets } = require('../utils/ticketManager');
const { loadConfig } = require('../utils/configManager');
const { notifyAdmins } = require('../utils/adminUtils');

let timer = null;
let running = false;
let activeClient = null;

function hoursSince(value) {
  if (!value) return Infinity;
  const ms = Date.now() - new Date(value).getTime();
  return Number.isFinite(ms) ? ms / 3600000 : Infinity;
}
function statusFromChecks(checks) {
  const values = Object.values(checks);
  if (values.some((c) => c.status === 'error')) return 'error';
  if (values.some((c) => c.status === 'warning')) return 'warning';
  return 'healthy';
}
function shouldNotify(alert, cooldownMinutes) {
  if (!alert.lastNotifiedAt) return true;
  return Date.now() - new Date(alert.lastNotifiedAt).getTime() >= Number(cooldownMinutes || 180) * 60000;
}
async function emitAlert(client, input, monitorConfig) {
  const alert = automation.addAlert(input);
  if (client && shouldNotify(alert, monitorConfig.notifyCooldownMinutes)) {
    try {
      await notifyAdmins(client, `${input.severity === 'error' ? '🚨' : '⚠️'} *MONITORAMENTO DO BOT*\n${input.message}`);
      automation.touchAlertNotification(alert.id);
    } catch (_) {}
  }
  return alert;
}
function resolveMissing(keys) {
  for (const alert of automation.listAlerts({ status: 'open', limit: 1000 })) {
    if (String(alert.key).startsWith('monitor:') && !keys.has(alert.key)) automation.resolveAlert(alert.key, 'monitor');
  }
}

async function runMonitor(client = activeClient) {
  if (running) return automation.getHealth();
  running = true;
  try {
    const autoConfig = automation.loadAutomationConfig();
    const monitorConfig = autoConfig.monitoring || {};
    if (!autoConfig.enabled || monitorConfig.enabled === false) return automation.getHealth();
    const runtime = runtimeState.getPublicState();
    const products = getProducts();
    const orders = listOrders();
    const tickets = listTickets();
    const queue = automation.queueStats();
    const config = loadConfig();
    const checks = {};
    const activeAlertKeys = new Set();

    checks.whatsapp = runtime.whatsapp.connected
      ? { status: 'ok', message: `Conectado em ${runtime.whatsapp.number || 'número não identificado'}` }
      : { status: 'error', message: `WhatsApp desconectado (${runtime.whatsapp.status || 'desconhecido'})` };
    if (!runtime.whatsapp.connected) {
      const key = 'monitor:whatsapp'; activeAlertKeys.add(key);
      await emitAlert(client, { key, type: 'whatsapp_disconnected', severity: 'error', message: checks.whatsapp.message }, monitorConfig);
    }

    const configuredProviders = [
      config.pagamentos.mercadoPago.ativo && 'Mercado Pago',
      config.pagamentos.pushinpay.ativo && 'PushinPay',
      config.pagamentos.pixManual.ativo && 'PIX manual'
    ].filter(Boolean);
    checks.payments = configuredProviders.length
      ? { status: 'ok', message: `Ativos: ${configuredProviders.join(', ')}` }
      : { status: 'warning', message: 'Nenhuma forma de pagamento está ativa.' };
    if (!configuredProviders.length) {
      const key = 'monitor:payments'; activeAlertKeys.add(key);
      await emitAlert(client, { key, type: 'payments_unconfigured', severity: 'warning', message: checks.payments.message }, monitorConfig);
    }

    const defaultThreshold = Number(monitorConfig.lowStockThreshold || 3);
    const lowStock = products.filter((p) => p.ativo !== false && Number(p.estoque || 0) <= Number(p.lowStockThreshold ?? defaultThreshold));
    checks.stock = lowStock.length
      ? { status: lowStock.some((p) => Number(p.estoque || 0) === 0) ? 'error' : 'warning', message: `${lowStock.length} produto(s) com estoque baixo`, items: lowStock.map((p) => ({ id: p.id, name: p.nome, stock: p.estoque })) }
      : { status: 'ok', message: 'Estoques acima do limite mínimo.' };
    for (const product of lowStock) {
      const key = `monitor:stock:${product.id}`; activeAlertKeys.add(key);
      await emitAlert(client, { key, type: 'low_stock', severity: Number(product.estoque || 0) === 0 ? 'error' : 'warning', message: `Estoque baixo: ${product.nome} possui ${product.estoque} item(ns).`, details: { productId: product.id, stock: product.estoque } }, monitorConfig);
    }

    const pendingHours = Number(monitorConfig.pendingPaymentHours || 2);
    const oldPending = orders.filter((o) => ['pending', 'processing', 'needs_attention'].includes(o.status) && hoursSince(o.createdAt) >= pendingHours);
    checks.orders = oldPending.length
      ? { status: 'warning', message: `${oldPending.length} pedido(s) aguardando atenção há mais de ${pendingHours}h.` }
      : { status: 'ok', message: 'Nenhum pedido antigo pendente.' };
    if (oldPending.length) {
      const key = 'monitor:old_orders'; activeAlertKeys.add(key);
      await emitAlert(client, { key, type: 'old_pending_orders', severity: 'warning', message: checks.orders.message, details: { orderIds: oldPending.slice(0, 20).map((o) => o.id) } }, monitorConfig);
    }

    const ticketHours = Number(monitorConfig.staleTicketHours || 12);
    const staleTickets = tickets.filter((t) => !['resolved', 'cancelled'].includes(t.status) && hoursSince(t.updatedAt || t.createdAt) >= ticketHours);
    checks.tickets = staleTickets.length
      ? { status: 'warning', message: `${staleTickets.length} chamado(s) sem atualização há mais de ${ticketHours}h.` }
      : { status: 'ok', message: 'Chamados dentro do prazo.' };
    if (staleTickets.length) {
      const key = 'monitor:stale_tickets'; activeAlertKeys.add(key);
      await emitAlert(client, { key, type: 'stale_tickets', severity: 'warning', message: checks.tickets.message, details: { ticketIds: staleTickets.slice(0, 20).map((t) => t.id) } }, monitorConfig);
    }

    checks.automation = queue.failed > 0
      ? { status: 'error', message: `${queue.failed} automação(ões) com falha definitiva.`, stats: queue }
      : { status: 'ok', message: `${queue.scheduled} tarefa(s) agendada(s).`, stats: queue };
    if (queue.failed > 0) {
      const key = 'monitor:automation_failed'; activeAlertKeys.add(key);
      await emitAlert(client, { key, type: 'automation_failed', severity: 'error', message: checks.automation.message }, monitorConfig);
    }

    const writablePaths = [path.resolve(__dirname, '../../data'), path.resolve(__dirname, '../../database')];
    let writable = true;
    for (const dir of writablePaths) {
      try { fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK); } catch (_) { writable = false; }
    }
    checks.storage = writable ? { status: 'ok', message: 'Pastas de dados acessíveis.' } : { status: 'error', message: 'Sem permissão para gravar dados.' };
    if (!writable) {
      const key = 'monitor:storage'; activeAlertKeys.add(key);
      await emitAlert(client, { key, type: 'storage_unwritable', severity: 'error', message: checks.storage.message }, monitorConfig);
    }

    resolveMissing(activeAlertKeys);
    const health = { status: statusFromChecks(checks), checkedAt: new Date().toISOString(), checks };
    automation.saveHealth(health);
    return health;
  } finally { running = false; }
}

function startSystemMonitor(client) {
  activeClient = client;
  const config = automation.loadAutomationConfig();
  if (timer) clearInterval(timer);
  const interval = Math.max(1, Number(config.monitoring?.intervalMinutes || 5)) * 60000;
  timer = setInterval(() => runMonitor(activeClient).catch((error) => console.error('[Monitor] Erro:', error.message)), interval);
  setTimeout(() => runMonitor(activeClient).catch(() => {}), 5000);
  return timer;
}
function stopSystemMonitor() { if (timer) clearInterval(timer); timer = null; }
function setMonitorClient(client) { activeClient = client; }
module.exports = { runMonitor, startSystemMonitor, stopSystemMonitor, setMonitorClient };
