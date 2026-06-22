const axios = require('axios');
const { claimPayment, releasePayment, resolvePendingPayment, markNeedsAttention, getPayment, reserveDeliveryItem } = require('../utils/paymentManager');
const { getAndRemoveStockItem } = require('../utils/stockManager');
const { logSale } = require('../utils/salesLogger');
const { registerSale } = require('./marketingService');
const { updateOrder, getOrder } = require('../utils/orderManager');
const { notifyAdmins } = require('../utils/adminUtils');
const { logAudit } = require('../utils/auditLogger');
const { schedulePostSaleAutomation } = require('./automationEngine');
const automationManager = require('../utils/automationManager');
const { emitIntegrationEvent } = require('./integrationEvents');

function deliveryText(product, deliveredItem, service) {
  const custom = String(product.deliveryMessage || '').trim();
  if (custom) return custom.replace(/{{\s*produto\s*}}/gi, product.nome || 'Produto').replace(/{{\s*entrega\s*}}/gi, deliveredItem).replace(/{{\s*pagamento\s*}}/gi, service);
  return `✅ Pagamento via ${service} aprovado!\n\n🎁 *${product.nome}*\n\nSua entrega:\n\`\`\`${deliveredItem}\`\`\``;
}

async function resolveDeliveryData(paymentId, payment, currentOrder) {
  const product = payment.product || {};
  const type = product.deliveryType || 'stock';
  let item = String(payment.reservedItem || '');
  if (item) return { item, type };
  if (type === 'link') {
    item = String(product.deliveryLink || '').trim();
  } else if (type === 'webhook') {
    if (!product.deliveryWebhookUrl) return { error: 'Webhook de entrega não configurado.', reason: 'delivery_webhook_missing', type };
    try {
      const response = await axios.post(product.deliveryWebhookUrl, {
        event: 'payment.approved', paymentId, customerPhone: payment.customerPhone,
        product: { id: product.id, name: product.nome, price: product.preco }, order: currentOrder || null
      }, { timeout: 20000, headers: { 'content-type': 'application/json' } });
      const data = response.data;
      item = String(data?.delivery || data?.access || data?.message || (typeof data === 'string' ? data : JSON.stringify(data || {}))).trim();
    } catch (error) {
      return { error: error.message, reason: 'delivery_webhook_failed', type };
    }
  } else if (type === 'stock') {
    item = getAndRemoveStockItem(product.id);
  } else if (type === 'manual') {
    item = String(product.deliveryLink || '').trim() || getAndRemoveStockItem(product.id) || 'Liberação manual confirmada pela equipe.';
  }
  if (item) reserveDeliveryItem(paymentId, item);
  return item ? { item, type } : { error: type === 'stock' ? `Estoque vazio para ${product.nome}` : `Entrega não retornou dados para ${product.nome}`, reason: 'no_delivery_data', type };
}

async function fulfillApprovedPayment(client, paymentId, service = 'Pagamento') {
  const existing = getPayment(paymentId);
  if (!existing) return { ok: false, reason: 'not_found' };
  const currentOrder = getOrder(paymentId);
  if (existing.status === 'approved' && currentOrder?.deliveryStatus === 'delivered') return { ok: true, duplicate: true };
  if (!client) return { ok: false, reason: 'whatsapp_disconnected' };
  const maxDeliveryAttempts = 5;
  if (Number(existing.attempts || 0) >= maxDeliveryAttempts) {
    const error = `Entrega excedeu o limite de ${maxDeliveryAttempts} tentativas para ${existing.product?.nome || 'o produto'}.`;
    markNeedsAttention(paymentId, error);
    automationManager.addAlert({ key: `delivery_attempts:${paymentId}`, type: 'delivery_attempts_exceeded', severity: 'error', message: error, details: { paymentId, customerPhone: existing.customerPhone } });
    await notifyAdmins(client, `🚨 *ENTREGA EXIGE ATENÇÃO*\nProduto: ${existing.product?.nome || 'Produto'}\nCliente: ${existing.customerPhone}\nPagamento: ${paymentId}`);
    return { ok: false, reason: 'max_delivery_attempts' };
  }
  const payment = claimPayment(paymentId);
  if (!payment) return { ok: false, reason: 'already_processing' };
  const { customerPhone, product } = payment;
  const forceManualDelivery = ['Confirmação manual', 'Entrega manual'].includes(service);
  if ((product.entregaAutomatica === false || product.deliveryType === 'manual') && !forceManualDelivery) {
    const error = `Produto ${product.nome} exige entrega manual.`;
    markNeedsAttention(paymentId, error); automationManager.cancelByPayment(paymentId, 'Pagamento aprovado; aguardando entrega manual.');
    await notifyAdmins(client, `🟡 *PAGAMENTO APROVADO — ENTREGA MANUAL*\nProduto: ${product.nome}\nCliente: ${customerPhone}\nPagamento: ${paymentId}`);
    try { await client.sendMessage(customerPhone, '✅ Seu pagamento foi aprovado. A equipe já foi avisada para concluir a liberação.'); } catch (_) {}
    return { ok: false, reason: 'manual_delivery_required' };
  }
  const delivery = await resolveDeliveryData(paymentId, payment, currentOrder);
  if (!delivery.item) {
    releasePayment(paymentId, 'error', delivery.error);
    markNeedsAttention(paymentId, delivery.error);
    automationManager.addAlert({ key: `payment_delivery:${paymentId}`, type: 'approved_without_delivery', severity: 'error', message: delivery.error, details: { paymentId, customerPhone, productId: product.id, deliveryType: delivery.type } });
    await notifyAdmins(client, `🚨 *PAGAMENTO APROVADO SEM ENTREGA*\nProduto: ${product.nome}\nCliente: ${customerPhone}\nPagamento: ${paymentId}\nMotivo: ${delivery.error}`);
    try { await client.sendMessage(customerPhone, '✅ Seu pagamento foi aprovado. A equipe foi avisada para finalizar sua entrega.'); } catch (_) {}
    return { ok: false, reason: delivery.reason, error: delivery.error };
  }
  try {
    await client.sendMessage(customerPhone, deliveryText(product, delivery.item, service));
    resolvePendingPayment(paymentId, { deliveredItem: delivery.item, reservedItem: '', reservedAt: null, deliveredAt: new Date().toISOString() });
    const deliveredOrder = updateOrder(paymentId, { status: 'delivered', deliveryStatus: 'delivered', deliveredItem: delivery.item, paidAt: new Date().toISOString(), deliveredAt: new Date().toISOString(), error: '' });
    const scheduled = schedulePostSaleAutomation(paymentId, customerPhone, product, deliveredOrder || {});
    if (scheduled.expiresAt) updateOrder(paymentId, { expiresAt: scheduled.expiresAt, renewalStatus: 'scheduled' });
    logSale(customerPhone, product, delivery.item, { paymentId, orderId: deliveredOrder?.id, expiresAt: scheduled.expiresAt });
    registerSale(customerPhone, product);
    ['delivery_failed','payment_no_stock','delivery_attempts','payment_delivery'].forEach((key) => automationManager.resolveAlert(`${key}:${paymentId}`, 'payment-processor'));
    logAudit('payment.fulfilled', { paymentId, customerPhone, productId: product.id, deliveryType: delivery.type, expiresAt: scheduled.expiresAt || null });
    emitIntegrationEvent('sale.delivered', { paymentId, customerPhone, productId: product.id, productName: product.nome, amount: product.preco, order: deliveredOrder }).catch(() => {});
    return { ok: true, expiresAt: scheduled.expiresAt || null, automationsScheduled: scheduled.jobs.length };
  } catch (error) {
    releasePayment(paymentId, 'error', error.message);
    updateOrder(paymentId, { status: 'pending', deliveryStatus: 'retrying', error: error.message });
    automationManager.addAlert({ key: `delivery_failed:${paymentId}`, type: 'delivery_failed', severity: 'warning', message: `Falha temporária na entrega de ${product.nome}: ${error.message}`, details: { paymentId, customerPhone } });
    await notifyAdmins(client, `⚠️ Falha temporária ao entregar ${paymentId}. O mesmo acesso ficou reservado. Erro: ${error.message}`);
    return { ok: false, reason: 'send_failed_retry_scheduled', error: error.message };
  }
}
module.exports = { fulfillApprovedPayment, resolveDeliveryData };
