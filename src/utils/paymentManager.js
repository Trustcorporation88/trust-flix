const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const orderManager = require('./orderManager');
const { logAudit } = require('./auditLogger');

const paymentsPath = path.resolve(__dirname, '../../data/pending_payments.json');
function loadPayments() { return readJson(paymentsPath, []); }
function savePayments(payments) { return writeJson(paymentsPath, payments); }
function providerFromId(id) { return String(id).startsWith('pushinpay_') ? 'pushinpay' : String(id).startsWith('manual_') ? 'manual_pix' : 'mercadopago'; }

function addPendingPayment(paymentId, customerPhone, product, metadata = {}) {
  const id = String(paymentId);
  const payments = loadPayments();
  const existing = payments.find((payment) => payment.paymentId === id);
  if (existing) return existing;
  const record = {
    paymentId: id,
    provider: providerFromId(id),
    customerPhone,
    product,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastCheckedAt: null,
    error: '',
    metadata,
  };
  payments.push(record);
  savePayments(payments);
  orderManager.createOrder({ paymentId: id, provider: record.provider, customerPhone, product, status: 'pending', metadata });
  logAudit('payment.created', { paymentId: id, provider: record.provider, customerPhone, productId: product?.id });
  return record;
}

function recoverStalePayments(maxMinutes = 10) {
  const cutoff = Date.now() - maxMinutes * 60000;
  const payments = loadPayments();
  let changed = 0;
  for (const payment of payments) {
    if (payment.status === 'processing' && new Date(payment.updatedAt || payment.createdAt).getTime() < cutoff) {
      payment.status = 'pending'; payment.error = 'Processamento interrompido e recuperado automaticamente.'; payment.updatedAt = new Date().toISOString(); changed += 1;
    }
  }
  if (changed) savePayments(payments);
  return changed;
}
function getPendingPayments() {
  recoverStalePayments();
  const active = loadPayments().filter((payment) => ['pending', 'error'].includes(payment.status));
  return new Map(active.map((payment) => [payment.paymentId, payment]));
}
function getPayment(paymentId) { return loadPayments().find((payment) => payment.paymentId === String(paymentId)) || null; }
function patchPayment(paymentId, patch) {
  const payments = loadPayments();
  const index = payments.findIndex((payment) => payment.paymentId === String(paymentId));
  if (index < 0) return null;
  payments[index] = { ...payments[index], ...patch, updatedAt: new Date().toISOString() };
  savePayments(payments);
  return payments[index];
}

function reserveDeliveryItem(paymentId, item) {
  return patchPayment(paymentId, { reservedItem: String(item || ''), reservedAt: new Date().toISOString() });
}
function clearDeliveryReservation(paymentId) {
  return patchPayment(paymentId, { reservedItem: '', reservedAt: null });
}

function claimPayment(paymentId) {
  const payment = getPayment(paymentId);
  if (!payment || !['pending', 'error', 'needs_attention'].includes(payment.status)) return null;
  return patchPayment(paymentId, { status: 'processing', attempts: Number(payment.attempts || 0) + 1, lastCheckedAt: new Date().toISOString(), error: '' });
}
function releasePayment(paymentId, status = 'pending', error = '') { return patchPayment(paymentId, { status, error, lastCheckedAt: new Date().toISOString() }); }
function resolvePendingPayment(paymentId, details = {}) {
  const payment = patchPayment(paymentId, { status: 'approved', approvedAt: new Date().toISOString(), error: '', ...details });
  if (payment) orderManager.updateOrder(paymentId, { status: 'approved', paidAt: new Date().toISOString() });
  return payment;
}
function markNeedsAttention(paymentId, error) {
  const payment = patchPayment(paymentId, { status: 'needs_attention', error });
  orderManager.updateOrder(paymentId, { status: 'needs_attention', error, deliveryStatus: 'failed' });
  return payment;
}

function recordPaymentCheck(paymentId, providerStatus, error = '') {
  return patchPayment(paymentId, {
    lastCheckedAt: new Date().toISOString(),
    providerStatus: String(providerStatus || ''),
    checkError: String(error || ''),
  });
}
function closePayment(paymentId, status = 'expired', reason = '') {
  const normalized = ['expired', 'cancelled', 'refunded', 'rejected'].includes(status) ? status : 'expired';
  const payment = patchPayment(paymentId, { status: normalized, error: String(reason || '') });
  if (payment) orderManager.updateOrder(paymentId, { status: normalized, error: String(reason || '') });
  return payment;
}

function expireOldPayments(maxHours = 72) {
  const cutoff = Date.now() - maxHours * 3600000;
  const payments = loadPayments();
  const expiredIds = [];
  for (const payment of payments) {
    if (['pending', 'error'].includes(payment.status) && new Date(payment.createdAt).getTime() < cutoff) {
      payment.status = 'expired'; payment.updatedAt = new Date().toISOString(); expiredIds.push(payment.paymentId);
      orderManager.updateOrder(payment.paymentId, { status: 'expired' });
    }
  }
  if (expiredIds.length) {
    savePayments(payments);
    const automation = require('./automationManager');
    for (const paymentId of expiredIds) automation.cancelByPayment(paymentId, 'Pagamento expirado.');
  }
  return expiredIds.length;
}
module.exports = { addPendingPayment, getPendingPayments, getPayment, reserveDeliveryItem, clearDeliveryReservation, claimPayment, releasePayment, resolvePendingPayment, markNeedsAttention, recordPaymentCheck, closePayment, expireOldPayments, recoverStalePayments };
