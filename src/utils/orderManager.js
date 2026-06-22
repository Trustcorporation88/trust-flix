const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { logAudit } = require('./auditLogger');

const ordersPath = path.resolve(__dirname, '../../data/orders.json');

function loadOrders() { return readJson(ordersPath, []); }
function saveOrders(orders) { return writeJson(ordersPath, orders); }
function newId() { return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function createOrder({ paymentId = '', provider = 'manual', customerPhone, product, status = 'pending', metadata = {} }) {
  const orders = loadOrders();
  const existing = paymentId && orders.find((order) => order.paymentId === String(paymentId));
  if (existing) return existing;
  const now = new Date().toISOString();
  const order = {
    id: newId(),
    paymentId: String(paymentId || ''),
    provider,
    customerPhone,
    productId: product?.id || '',
    productName: product?.nome || '',
    amount: Number(product?.preco || 0),
    status,
    deliveryStatus: 'pending',
    deliveredItem: '',
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    deliveredAt: null,
    expiresAt: null,
    renewalStatus: '',
    refundedAt: null,
    error: '',
    metadata,
  };
  orders.push(order);
  saveOrders(orders);
  logAudit('order.created', { orderId: order.id, paymentId: order.paymentId, provider, productId: order.productId, customerPhone });
  return order;
}

function updateOrder(idOrPaymentId, patch, actor = 'system') {
  const orders = loadOrders();
  const index = orders.findIndex((order) => order.id === idOrPaymentId || order.paymentId === String(idOrPaymentId));
  if (index < 0) return null;
  orders[index] = { ...orders[index], ...patch, updatedAt: new Date().toISOString() };
  saveOrders(orders);
  logAudit('order.updated', { orderId: orders[index].id, patch: Object.keys(patch) }, actor);
  return orders[index];
}

function getOrder(idOrPaymentId) {
  return loadOrders().find((order) => order.id === idOrPaymentId || order.paymentId === String(idOrPaymentId)) || null;
}

function listOrders(filters = {}) {
  let orders = loadOrders();
  if (filters.status) orders = orders.filter((order) => order.status === filters.status);
  if (filters.customerPhone) orders = orders.filter((order) => order.customerPhone === filters.customerPhone);
  return orders.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function orderStats() {
  const orders = loadOrders();
  const paid = orders.filter((order) => ['approved', 'paid', 'delivered'].includes(order.status));
  return {
    total: orders.length,
    pending: orders.filter((order) => ['pending', 'processing'].includes(order.status)).length,
    paid: paid.length,
    needsAttention: orders.filter((order) => ['needs_attention', 'failed'].includes(order.status) || order.deliveryStatus === 'failed').length,
    revenue: paid.reduce((sum, order) => sum + Number(order.amount || 0), 0),
  };
}

module.exports = { createOrder, updateOrder, getOrder, listOrders, orderStats };
