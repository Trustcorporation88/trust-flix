const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { logAudit } = require('./auditLogger');

const ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = path.join(ROOT, 'automation.json');
const QUEUE_PATH = path.join(ROOT, 'data', 'automation_queue.json');
const ALERTS_PATH = path.join(ROOT, 'data', 'automation_alerts.json');
const HEALTH_PATH = path.join(ROOT, 'data', 'system_health.json');

const DEFAULT_CONFIG = {
  enabled: true,
  timezone: 'America/Sao_Paulo',
  workerIntervalSeconds: 15,
  batchSize: 20,
  quietHours: { enabled: true, start: '21:00', end: '08:00', applyToTransactional: false },
  limits: { maxMessagesPerContactPerDay: 8, maxMarketingPerContactPerDay: 3 },
  retry: { maxAttempts: 5, baseDelaySeconds: 60, maxDelayMinutes: 60 },
  abandonedCheckout: {
    enabled: true,
    sequence: [
      { id: 'checkout-30m', delayMinutes: 30, kind: 'transactional', text: 'Oi {{primeiroNome}}! Seu PIX de *{{produto}}* ainda está pendente. Se quiser concluir, use o código abaixo ou digite *MENU* para gerar novamente.\n\n{{pix}}' },
      { id: 'checkout-6h', delayMinutes: 360, kind: 'transactional', text: 'Passando para lembrar que o pedido de *{{produto}}* ainda não foi confirmado. Posso te ajudar a concluir. Digite *MENU* para continuar.' },
      { id: 'checkout-24h', delayMinutes: 1440, kind: 'marketing', text: 'Oi {{primeiroNome}}! Você ainda quer receber *{{produto}}*? Responda *QUERO* para continuar ou *SAIR* para não receber ofertas.' }
    ]
  },
  postSale: {
    enabled: true,
    sequence: [
      { id: 'post-5m', delayMinutes: 5, kind: 'transactional', text: '✅ {{primeiroNome}}, sua compra de *{{produto}}* foi concluída. Guarde os dados recebidos. Caso precise de ajuda, envie *ATENDENTE*.' },
      { id: 'post-24h', delayMinutes: 1440, kind: 'transactional', text: 'Olá {{primeiroNome}}! Passando para confirmar se deu tudo certo com *{{produto}}*. Responda *1* para “funcionou” ou envie *ATENDENTE* se precisar de ajuda.' },
      { id: 'post-72h', delayMinutes: 4320, kind: 'marketing', text: '🎁 {{primeiroNome}}, temos uma opção complementar para quem já comprou *{{produto}}*. Digite *OFERTA* para conhecer ou *SAIR* para não receber ofertas.' }
    ]
  },
  renewal: {
    enabled: true,
    remindersDaysBefore: [7, 3, 1, 0],
    text: '⏰ {{primeiroNome}}, seu acesso de *{{produto}}* vence em {{dias}} dia(s), em {{vencimento}}. Digite *RENOVAR* para gerar o pagamento.'
  },
  monitoring: {
    enabled: true,
    intervalMinutes: 5,
    notifyCooldownMinutes: 180,
    staleTicketHours: 12,
    pendingPaymentHours: 2,
    lowStockThreshold: 3
  },
  webhooks: { requireSecretInProduction: true }
};

function deepMerge(base, value) {
  if (Array.isArray(base)) return Array.isArray(value) ? value : base;
  if (!base || typeof base !== 'object') return value === undefined ? base : value;
  const out = { ...base };
  for (const [key, current] of Object.entries(value || {})) {
    out[key] = current && typeof current === 'object' && !Array.isArray(current) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])
      ? deepMerge(base[key], current)
      : current;
  }
  return out;
}

function loadAutomationConfig() {
  const current = readJson(CONFIG_PATH, DEFAULT_CONFIG);
  const merged = deepMerge(DEFAULT_CONFIG, current);
  if (JSON.stringify(current) !== JSON.stringify(merged)) writeJson(CONFIG_PATH, merged);
  return merged;
}

function saveAutomationConfig(config, actor = 'admin') {
  const merged = deepMerge(DEFAULT_CONFIG, config || {});
  writeJson(CONFIG_PATH, merged);
  logAudit('automation.config.updated', {}, actor);
  return merged;
}

function loadQueue() { return readJson(QUEUE_PATH, []); }
function saveQueue(queue) { return writeJson(QUEUE_PATH, queue); }
function nowIso() { return new Date().toISOString(); }
function id(prefix = 'job') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function enqueueJob(input, actor = 'system') {
  const queue = loadQueue();
  const dedupeKey = String(input.dedupeKey || '').trim();
  if (dedupeKey) {
    const existing = queue.find((job) => job.dedupeKey === dedupeKey && ['scheduled', 'retry', 'processing'].includes(job.status));
    if (existing) return existing;
  }
  const config = loadAutomationConfig();
  const createdAt = nowIso();
  const job = {
    id: id('job'),
    type: String(input.type || 'message'),
    status: 'scheduled',
    kind: input.kind === 'marketing' ? 'marketing' : input.kind === 'critical' ? 'critical' : 'transactional',
    chatId: String(input.chatId || ''),
    runAt: new Date(input.runAt || Date.now()).toISOString(),
    payload: input.payload || {},
    attempts: 0,
    maxAttempts: Number(input.maxAttempts || config.retry.maxAttempts || 5),
    dedupeKey,
    groupKey: String(input.groupKey || ''),
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    completedAt: null,
    lastError: '',
    result: null
  };
  queue.push(job);
  saveQueue(queue);
  logAudit('automation.job.created', { jobId: job.id, type: job.type, runAt: job.runAt, dedupeKey }, actor);
  return job;
}

function listJobs(filters = {}) {
  let queue = loadQueue();
  if (filters.status) queue = queue.filter((j) => j.status === filters.status);
  if (filters.chatId) queue = queue.filter((j) => j.chatId === filters.chatId);
  if (filters.groupKey) queue = queue.filter((j) => j.groupKey === filters.groupKey);
  if (filters.type) queue = queue.filter((j) => j.type === filters.type);
  const limit = Math.min(1000, Math.max(1, Number(filters.limit || 300)));
  return queue.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, limit);
}

function getJob(jobId) { return loadQueue().find((j) => j.id === jobId) || null; }

function patchJob(jobId, patch) {
  const queue = loadQueue();
  const index = queue.findIndex((j) => j.id === jobId);
  if (index < 0) return null;
  queue[index] = { ...queue[index], ...patch, updatedAt: nowIso() };
  saveQueue(queue);
  return queue[index];
}

function recoverStaleJobs(maxMinutes = 10) {
  const cutoff = Date.now() - maxMinutes * 60000;
  const queue = loadQueue();
  let changed = 0;
  for (const job of queue) {
    if (job.status === 'processing' && new Date(job.startedAt || job.updatedAt || job.createdAt).getTime() < cutoff) {
      job.status = 'retry';
      job.runAt = nowIso();
      job.lastError = 'Processamento interrompido; tarefa recuperada após reinício.';
      job.updatedAt = nowIso();
      changed += 1;
    }
  }
  if (changed) saveQueue(queue);
  return changed;
}

function claimDueJobs(limit = 20) {
  recoverStaleJobs();
  const queue = loadQueue();
  const now = Date.now();
  const due = queue
    .filter((j) => ['scheduled', 'retry'].includes(j.status) && new Date(j.runAt).getTime() <= now)
    .sort((a, b) => new Date(a.runAt) - new Date(b.runAt))
    .slice(0, Math.max(1, Number(limit || 20)));
  if (!due.length) return [];
  const ids = new Set(due.map((j) => j.id));
  const startedAt = nowIso();
  for (const job of queue) {
    if (ids.has(job.id)) {
      job.status = 'processing';
      job.startedAt = startedAt;
      job.updatedAt = startedAt;
      job.attempts = Number(job.attempts || 0) + 1;
    }
  }
  saveQueue(queue);
  return queue.filter((j) => ids.has(j.id));
}

function completeJob(jobId, result = {}) {
  return patchJob(jobId, { status: 'completed', completedAt: nowIso(), lastError: '', result });
}
function skipJob(jobId, reason = 'Condição não atendida.') {
  return patchJob(jobId, { status: 'skipped', completedAt: nowIso(), lastError: String(reason) });
}
function cancelJob(jobId, reason = 'Cancelado') {
  const job = getJob(jobId);
  if (!job || ['completed', 'cancelled', 'failed', 'skipped'].includes(job.status)) return job;
  return patchJob(jobId, { status: 'cancelled', completedAt: nowIso(), lastError: String(reason) });
}
function retryJob(jobId, error, runAt) {
  const job = getJob(jobId);
  if (!job) return null;
  if (Number(job.attempts || 0) >= Number(job.maxAttempts || 5)) {
    return patchJob(jobId, { status: 'failed', completedAt: nowIso(), lastError: String(error || 'Falha definitiva') });
  }
  return patchJob(jobId, { status: 'retry', runAt: new Date(runAt || Date.now()).toISOString(), lastError: String(error || 'Falha temporária') });
}
function rescheduleJob(jobId, runAt, reason = '') {
  return patchJob(jobId, { status: 'scheduled', runAt: new Date(runAt).toISOString(), lastError: String(reason || '') });
}

function cancelMatching(predicate, reason = 'Cancelado automaticamente') {
  const queue = loadQueue();
  let count = 0;
  for (const job of queue) {
    if (['scheduled', 'retry', 'processing'].includes(job.status) && predicate(job)) {
      job.status = 'cancelled';
      job.completedAt = nowIso();
      job.updatedAt = nowIso();
      job.lastError = reason;
      count += 1;
    }
  }
  if (count) saveQueue(queue);
  return count;
}
function cancelByGroup(groupKey, reason) { return cancelMatching((job) => job.groupKey === groupKey, reason); }
function cancelByPayment(paymentId, reason = 'Pagamento concluído ou encerrado') { return cancelMatching((job) => job.payload?.paymentId === paymentId, reason); }
function cancelMarketingForContact(chatId, reason = 'Contato sem consentimento para ofertas') { return cancelMatching((job) => job.chatId === chatId && job.kind === 'marketing', reason); }

function queueStats() {
  const jobs = loadQueue();
  const count = (status) => jobs.filter((j) => j.status === status).length;
  return {
    total: jobs.length,
    scheduled: count('scheduled') + count('retry'),
    processing: count('processing'),
    completed: count('completed'),
    failed: count('failed'),
    cancelled: count('cancelled'),
    skipped: count('skipped')
  };
}

function cleanupJobs(retentionDays = 30) {
  const cutoff = Date.now() - Number(retentionDays || 30) * 86400000;
  const queue = loadQueue();
  const kept = queue.filter((job) => !['completed', 'cancelled', 'skipped'].includes(job.status) || new Date(job.completedAt || job.updatedAt).getTime() >= cutoff);
  if (kept.length !== queue.length) saveQueue(kept);
  return queue.length - kept.length;
}

function loadAlerts() { return readJson(ALERTS_PATH, []); }
function saveAlerts(alerts) { return writeJson(ALERTS_PATH, alerts); }
function addAlert(input) {
  const alerts = loadAlerts();
  const key = String(input.key || input.type || 'alert');
  const open = alerts.find((a) => a.key === key && a.status === 'open');
  const now = nowIso();
  if (open) {
    open.message = String(input.message || open.message);
    open.details = input.details || open.details || {};
    open.severity = input.severity || open.severity || 'warning';
    open.lastSeenAt = now;
    open.occurrences = Number(open.occurrences || 1) + 1;
    saveAlerts(alerts);
    return open;
  }
  const alert = { id: id('alert'), key, type: input.type || key, severity: input.severity || 'warning', message: String(input.message || ''), details: input.details || {}, status: 'open', createdAt: now, lastSeenAt: now, lastNotifiedAt: null, occurrences: 1 };
  alerts.push(alert);
  saveAlerts(alerts);
  return alert;
}
function resolveAlert(alertIdOrKey, actor = 'system') {
  const alerts = loadAlerts();
  const index = alerts.findIndex((a) => a.id === alertIdOrKey || a.key === alertIdOrKey);
  if (index < 0) return null;
  alerts[index] = { ...alerts[index], status: 'resolved', resolvedAt: nowIso(), resolvedBy: actor };
  saveAlerts(alerts);
  return alerts[index];
}
function touchAlertNotification(alertId) { return resolveAlertField(alertId, { lastNotifiedAt: nowIso() }); }
function resolveAlertField(alertId, patch) {
  const alerts = loadAlerts();
  const index = alerts.findIndex((a) => a.id === alertId);
  if (index < 0) return null;
  alerts[index] = { ...alerts[index], ...patch };
  saveAlerts(alerts);
  return alerts[index];
}
function listAlerts(filters = {}) {
  let alerts = loadAlerts();
  if (filters.status) alerts = alerts.filter((a) => a.status === filters.status);
  return alerts.sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt))).slice(0, Number(filters.limit || 200));
}
function saveHealth(health) { writeJson(HEALTH_PATH, health); return health; }
function getHealth() { return readJson(HEALTH_PATH, { status: 'starting', checkedAt: null, checks: {} }); }

module.exports = {
  DEFAULT_CONFIG,
  loadAutomationConfig,
  saveAutomationConfig,
  enqueueJob,
  listJobs,
  getJob,
  patchJob,
  claimDueJobs,
  completeJob,
  skipJob,
  cancelJob,
  retryJob,
  rescheduleJob,
  recoverStaleJobs,
  cancelMatching,
  cancelByGroup,
  cancelByPayment,
  cancelMarketingForContact,
  queueStats,
  cleanupJobs,
  addAlert,
  resolveAlert,
  touchAlertNotification,
  listAlerts,
  saveHealth,
  getHealth
};
