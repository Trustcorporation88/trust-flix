const path = require('path');
const { readJson } = require('../core/atomicJsonStore');
const automation = require('../utils/automationManager');
const { getPayment } = require('../utils/paymentManager');
const orderManager = require('../utils/orderManager');
const ticketManager = require('../utils/ticketManager');
const { getProductById } = require('../utils/productManager');
const { notifyAdmins } = require('../utils/adminUtils');
const { logAudit } = require('../utils/auditLogger');

const LEADS_PATH = path.resolve(__dirname, '../../data/marketing_leads.json');
let workerTimer = null;
let processing = false;
let activeClient = null;

function onlyDigits(value = '') { return String(value || '').replace(/\D/g, ''); }
function normalizeChatId(value = '') {
  const raw = String(value || '');
  if (raw.endsWith('@c.us') || raw.endsWith('@g.us')) return raw;
  const digits = onlyDigits(raw);
  return digits ? `${digits}@c.us` : raw;
}
function findLead(chatId) {
  const digits = onlyDigits(chatId);
  return readJson(LEADS_PATH, []).find((lead) => onlyDigits(lead.chatId || lead.telefone) === digits) || null;
}
function firstName(chatId) {
  const lead = findLead(chatId);
  const name = String(lead?.nome || '').trim();
  if (name && !/^Cliente \d+$/i.test(name)) return name.split(/\s+/)[0];
  const digits = onlyDigits(chatId);
  return digits ? `cliente ${digits.slice(-4)}` : 'cliente';
}
function hasMarketingConsent(chatId) {
  const lead = findLead(chatId);
  return Boolean(lead && lead.ativo !== false && lead.optIn === true);
}

function localParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), hour: Number(parts.hour), minute: Number(parts.minute) };
}
function parseClock(value, fallback) {
  const match = String(value || fallback).match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}
function isQuiet(date, config) {
  if (!config.quietHours?.enabled) return false;
  const now = localParts(date, config.timezone);
  const start = parseClock(config.quietHours.start, '21:00');
  const end = parseClock(config.quietHours.end, '08:00');
  return start < end ? now.minutes >= start && now.minutes < end : now.minutes >= start || now.minutes < end;
}
function nextAllowedTime(date, config) {
  let candidate = new Date(date.getTime());
  for (let i = 0; i < 100; i += 1) {
    if (!isQuiet(candidate, config)) return candidate;
    candidate = new Date(candidate.getTime() + 15 * 60000);
  }
  return new Date(date.getTime() + 12 * 3600000);
}
function localDateKey(value, timezone) { return localParts(new Date(value), timezone).date; }

function render(text, job) {
  const payload = job.payload || {};
  const product = payload.product || {};
  const expiry = payload.expiresAt ? new Date(payload.expiresAt) : null;
  const replacements = {
    nome: payload.customerName || firstName(job.chatId),
    primeiroNome: (payload.customerName || firstName(job.chatId)).split(/\s+/)[0],
    produto: product.nome || payload.productName || 'seu produto',
    valor: Number(product.preco || payload.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    pix: payload.pixCopyPaste || '',
    dias: payload.daysBefore ?? '',
    vencimento: expiry ? expiry.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
    link: payload.link || '',
    pedido: payload.paymentId || payload.orderId || '',
    tutorial: product.tutorial || payload.tutorial || '',
    upsellProduto: payload.upsellProduct?.nome || '',
    upsellValor: payload.upsellProduct ? Number(payload.upsellProduct.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''
  };
  let out = String(text || '');
  for (const [key, value] of Object.entries(replacements)) out = out.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), String(value ?? ''));
  return out.trim();
}

function conditionResult(job) {
  const condition = job.payload?.condition || 'always';
  if (condition === 'always') return { ok: true };
  if (condition === 'payment_pending') {
    const payment = getPayment(job.payload.paymentId);
    return { ok: Boolean(payment && ['pending', 'error', 'processing'].includes(payment.status)), reason: `Pagamento está ${payment?.status || 'inexistente'}.` };
  }
  if (condition === 'order_delivered') {
    const order = orderManager.getOrder(job.payload.orderId || job.payload.paymentId);
    return { ok: Boolean(order && order.deliveryStatus === 'delivered'), reason: `Entrega está ${order?.deliveryStatus || 'inexistente'}.` };
  }
  if (condition === 'ticket_open') {
    const ticket = ticketManager.getTicket(job.payload.ticketId);
    return { ok: Boolean(ticket && !['resolved', 'cancelled'].includes(ticket.status)), reason: `Chamado está ${ticket?.status || 'inexistente'}.` };
  }
  if (condition === 'renewal_due') {
    const order = orderManager.getOrder(job.payload.orderId || job.payload.paymentId);
    return { ok: Boolean(order && order.deliveryStatus === 'delivered' && !['refunded', 'cancelled'].includes(order.status)), reason: `Pedido está ${order?.status || 'inexistente'}.` };
  }
  return { ok: true };
}

function sentToday(chatId, kind, config) {
  const today = localDateKey(new Date(), config.timezone);
  return automation.listJobs({ chatId, limit: 1000 }).filter((job) => job.type === 'message' && job.status === 'completed' && localDateKey(job.completedAt || job.updatedAt, config.timezone) === today && (!kind || job.kind === kind)).length;
}
function retryDelay(job, config) {
  const base = Math.max(5, Number(config.retry?.baseDelaySeconds || 60));
  const cap = Math.max(base, Number(config.retry?.maxDelayMinutes || 60) * 60);
  const seconds = Math.min(cap, base * (2 ** Math.max(0, Number(job.attempts || 1) - 1)));
  return new Date(Date.now() + seconds * 1000);
}

async function executeJob(client, job, config) {
  const condition = conditionResult(job);
  if (!condition.ok) return automation.skipJob(job.id, condition.reason);

  if (job.kind === 'marketing' && !hasMarketingConsent(job.chatId)) {
    return automation.skipJob(job.id, 'Oferta cancelada: contato sem consentimento explícito.');
  }

  const quietApplies = job.kind === 'marketing' || config.quietHours?.applyToTransactional === true;
  if (quietApplies && isQuiet(new Date(), config)) {
    return automation.rescheduleJob(job.id, nextAllowedTime(new Date(), config), 'Aguardando horário permitido.');
  }

  if (job.type === 'message') {
    const totalLimit = Number(config.limits?.maxMessagesPerContactPerDay || 8);
    const marketingLimit = Number(config.limits?.maxMarketingPerContactPerDay || 3);
    if (sentToday(job.chatId, null, config) >= totalLimit) {
      const tomorrow = new Date(Date.now() + 24 * 3600000);
      return automation.rescheduleJob(job.id, nextAllowedTime(tomorrow, config), 'Limite diário por contato atingido.');
    }
    if (job.kind === 'marketing' && sentToday(job.chatId, 'marketing', config) >= marketingLimit) {
      const tomorrow = new Date(Date.now() + 24 * 3600000);
      return automation.rescheduleJob(job.id, nextAllowedTime(tomorrow, config), 'Limite diário de ofertas atingido.');
    }
    const text = render(job.payload?.text, job);
    if (!text) return automation.skipJob(job.id, 'Mensagem vazia.');
    await client.sendMessage(normalizeChatId(job.chatId), text);
    logAudit('automation.message.sent', { jobId: job.id, chatId: job.chatId, kind: job.kind, groupKey: job.groupKey });
    return automation.completeJob(job.id, { sentAt: new Date().toISOString() });
  }

  if (job.type === 'admin_alert') {
    await notifyAdmins(client, render(job.payload?.text, job));
    return automation.completeJob(job.id, { notifiedAt: new Date().toISOString() });
  }

  return automation.skipJob(job.id, `Tipo desconhecido: ${job.type}`);
}

async function processDueJobs(client = activeClient) {
  if (processing || !client) return { processed: 0 };
  const config = automation.loadAutomationConfig();
  if (!config.enabled) return { processed: 0, disabled: true };
  processing = true;
  let processed = 0;
  try {
    const jobs = automation.claimDueJobs(config.batchSize || 20);
    for (const job of jobs) {
      try {
        await executeJob(client, job, config);
      } catch (error) {
        const updated = automation.retryJob(job.id, error.message, retryDelay(job, config));
        if (updated?.status === 'failed') {
          automation.addAlert({ key: `job_failed:${job.id}`, type: 'automation_job_failed', severity: 'error', message: `Automação falhou definitivamente: ${job.type}`, details: { jobId: job.id, error: error.message } });
          try { await notifyAdmins(client, `🚨 *AUTOMAÇÃO COM FALHA*\nTarefa: ${job.id}\nTipo: ${job.type}\nErro: ${error.message}`); } catch (_) {}
        }
      }
      processed += 1;
    }
  } finally { processing = false; }
  return { processed };
}

function addMinutes(minutes) { return new Date(Date.now() + Number(minutes || 0) * 60000); }
function scheduleCheckoutAutomation(paymentId, chatId, product, pixCopyPaste = '') {
  const config = automation.loadAutomationConfig();
  if (!config.enabled || !config.abandonedCheckout?.enabled || !paymentId) return [];
  const groupKey = `checkout:${paymentId}`;
  automation.cancelByGroup(groupKey, 'Sequência de checkout recriada.');
  return (config.abandonedCheckout.sequence || []).map((step) => automation.enqueueJob({
    type: 'message', kind: step.kind || 'transactional', chatId, runAt: addMinutes(step.delayMinutes), groupKey,
    dedupeKey: `${groupKey}:${step.id}`,
    payload: { condition: 'payment_pending', paymentId, product, pixCopyPaste, text: step.text, sequenceStep: step.id }
  }));
}

function schedulePostSaleAutomation(paymentId, chatId, product, order = {}) {
  const config = automation.loadAutomationConfig();
  automation.cancelByPayment(paymentId, 'Pagamento aprovado; lembretes de checkout cancelados.');
  const jobs = [];
  const groupKey = `post_sale:${paymentId}`;
  if (config.enabled && config.postSale?.enabled) {
    const upsellProduct = product?.upsellProductId ? getProductById(product.upsellProductId) : null;
    if (product?.tutorial) {
      jobs.push(automation.enqueueJob({
        type: 'message', kind: 'transactional', chatId, runAt: addMinutes(2), groupKey,
        dedupeKey: `${groupKey}:tutorial`,
        payload: { condition: 'order_delivered', paymentId, orderId: order.id, product, text: `📘 *Tutorial — {{produto}}*\n\n{{tutorial}}`, sequenceStep: 'tutorial' }
      }));
    }
    for (const step of config.postSale.sequence || []) {
      let text = step.text;
      if (step.kind === 'marketing' && upsellProduct) {
        text = `🎁 {{primeiroNome}}, temos uma oferta complementar para sua compra de *{{produto}}*:\n\n*{{upsellProduto}}* por *{{upsellValor}}*.\n\nDigite *OFERTA* para continuar ou *SAIR* para não receber ofertas.`;
      }
      jobs.push(automation.enqueueJob({
        type: 'message', kind: step.kind || 'transactional', chatId, runAt: addMinutes(step.delayMinutes), groupKey,
        dedupeKey: `${groupKey}:${step.id}`,
        payload: { condition: 'order_delivered', paymentId, orderId: order.id, product, upsellProduct, text, sequenceStep: step.id }
      }));
    }
  }

  const validityDays = Math.max(0, Number(product?.validityDays || 0));
  let expiresAt = order.expiresAt || null;
  if (config.enabled && config.renewal?.enabled && validityDays > 0) {
    expiresAt = expiresAt || new Date(Date.now() + validityDays * 86400000).toISOString();
    for (const daysBefore of config.renewal.remindersDaysBefore || []) {
      const runAt = new Date(new Date(expiresAt).getTime() - Number(daysBefore) * 86400000);
      if (runAt.getTime() <= Date.now()) continue;
      jobs.push(automation.enqueueJob({
        type: 'message', kind: 'transactional', chatId, runAt, groupKey: `renewal:${paymentId}`,
        dedupeKey: `renewal:${paymentId}:${daysBefore}`,
        payload: { condition: 'renewal_due', paymentId, orderId: order.id, product, expiresAt, daysBefore, text: config.renewal.text }
      }));
    }
  }
  return { jobs, expiresAt };
}

function scheduleTicketEscalation(ticket) {
  if (!ticket?.id) return [];
  const groupKey = `ticket:${ticket.id}`;
  return [
    automation.enqueueJob({ type: 'admin_alert', kind: 'critical', runAt: addMinutes(60), groupKey, dedupeKey: `${groupKey}:1h`, payload: { condition: 'ticket_open', ticketId: ticket.id, text: `⏳ Chamado ainda aguardando atendimento.\nTicket: ${ticket.id}\nCliente: ${ticket.customerPhone}` } }),
    automation.enqueueJob({ type: 'admin_alert', kind: 'critical', runAt: addMinutes(720), groupKey, dedupeKey: `${groupKey}:12h`, payload: { condition: 'ticket_open', ticketId: ticket.id, text: `🚨 Chamado aberto há 12 horas.\nTicket: ${ticket.id}\nCliente: ${ticket.customerPhone}` } })
  ];
}

function cancelTicketAutomation(ticketId) { return automation.cancelByGroup(`ticket:${ticketId}`, 'Chamado resolvido.'); }
function cancelMarketingForContact(chatId) { return automation.cancelMarketingForContact(normalizeChatId(chatId)); }
function startAutomationEngine(client) {
  activeClient = client;
  automation.recoverStaleJobs();
  const config = automation.loadAutomationConfig();
  if (workerTimer) clearInterval(workerTimer);
  const interval = Math.max(5, Number(config.workerIntervalSeconds || 15)) * 1000;
  workerTimer = setInterval(() => processDueJobs(activeClient).catch((error) => console.error('[Automação] Worker:', error.message)), interval);
  setTimeout(() => processDueJobs(activeClient).catch(() => {}), 2000);
  return workerTimer;
}
function stopAutomationEngine() { if (workerTimer) clearInterval(workerTimer); workerTimer = null; }
function setAutomationClient(client) { activeClient = client; }

module.exports = {
  startAutomationEngine,
  stopAutomationEngine,
  setAutomationClient,
  processDueJobs,
  scheduleCheckoutAutomation,
  schedulePostSaleAutomation,
  scheduleTicketEscalation,
  cancelTicketAutomation,
  cancelMarketingForContact,
  hasMarketingConsent,
  render
};
