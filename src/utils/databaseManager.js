const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { logAudit } = require('./auditLogger');

const dbPath = path.resolve(__dirname, '../../database/database.json');
const fallback = { categorias: [], produtos: [] };
function loadDatabase() {
  const db = readJson(dbPath, fallback);
  db.categorias = Array.isArray(db.categorias) ? db.categorias : [];
  db.produtos = Array.isArray(db.produtos) ? db.produtos : [];
  return db;
}
function saveDatabase(data) { return writeJson(dbPath, data); }
function makeId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function str(value, max = 10000) { return String(value || '').trim().slice(0, max); }
function list(value) {
  if (Array.isArray(value)) return value.map((v) => str(v, 500)).filter(Boolean).slice(0, 50);
  return str(value).split(/\r?\n|\|/).map((v) => v.trim()).filter(Boolean).slice(0, 50);
}
function faqs(value) {
  if (Array.isArray(value)) return value.map((item) => ({ question: str(item.question || item.pergunta, 300), answer: str(item.answer || item.resposta, 1200) })).filter((i) => i.question && i.answer).slice(0, 30);
  return [];
}
function normalizeProduct(product = {}, existing = {}) {
  const now = new Date().toISOString();
  return {
    ...existing,
    id: existing.id || product.id || makeId('prod'),
    nome: str(product.nome ?? existing.nome, 160),
    preco: Math.max(0, Number(product.preco ?? existing.preco ?? 0)),
    precoDe: Math.max(0, Number(product.precoDe ?? existing.precoDe ?? 0)),
    categoriaId: str(product.categoriaId ?? existing.categoriaId, 120),
    descricaoCurta: str(product.descricaoCurta ?? existing.descricaoCurta, 320),
    descricao: str(product.descricao ?? existing.descricao, 5000),
    beneficios: product.beneficios !== undefined ? list(product.beneficios) : list(existing.beneficios || []),
    inclui: product.inclui !== undefined ? list(product.inclui) : list(existing.inclui || []),
    publicoAlvo: str(product.publicoAlvo ?? existing.publicoAlvo, 1500),
    garantia: str(product.garantia ?? existing.garantia, 1000),
    provaSocial: str(product.provaSocial ?? existing.provaSocial, 1500),
    faq: product.faq !== undefined ? faqs(product.faq) : faqs(existing.faq || []),
    imagemUrl: str(product.imagemUrl ?? existing.imagemUrl, 1000),
    videoUrl: str(product.videoUrl ?? existing.videoUrl, 1000),
    ctaTexto: str(product.ctaTexto ?? existing.ctaTexto, 100) || 'QUERO COMPRAR',
    ativo: product.ativo !== undefined ? Boolean(product.ativo) : (existing.ativo !== false),
    destaque: product.destaque !== undefined ? Boolean(product.destaque) : Boolean(existing.destaque),
    ordem: Math.max(0, Number(product.ordem ?? existing.ordem ?? 0)),
    entregaAutomatica: product.entregaAutomatica !== undefined ? Boolean(product.entregaAutomatica) : (existing.entregaAutomatica !== false),
    deliveryType: ['stock', 'manual', 'link', 'webhook'].includes(product.deliveryType ?? existing.deliveryType) ? (product.deliveryType ?? existing.deliveryType) : 'stock',
    deliveryLink: str(product.deliveryLink ?? existing.deliveryLink, 2000),
    deliveryWebhookUrl: str(product.deliveryWebhookUrl ?? existing.deliveryWebhookUrl, 2000),
    validityDays: Math.max(0, Number(product.validityDays ?? existing.validityDays ?? 0)),
    lowStockThreshold: Math.max(0, Number(product.lowStockThreshold ?? existing.lowStockThreshold ?? 3)),
    tutorial: str(product.tutorial ?? existing.tutorial, 5000),
    deliveryMessage: str(product.deliveryMessage ?? existing.deliveryMessage, 5000),
    upsellProductId: str(product.upsellProductId ?? existing.upsellProductId, 120),
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

function addCategory(categoryName, actor = 'system') {
  const name = str(categoryName, 100);
  if (!name) return null;
  const db = loadDatabase();
  const duplicate = db.categorias.find((cat) => cat.nome.toLowerCase() === name.toLowerCase());
  if (duplicate) return duplicate.id;
  const category = { id: makeId('cat'), nome: name, ordem: db.categorias.length, createdAt: new Date().toISOString() };
  db.categorias.push(category); saveDatabase(db); logAudit('category.created', { categoryId: category.id, name }, actor); return category.id;
}
function updateCategory(categoryId, patch, actor = 'admin') {
  const db = loadDatabase(); const index = db.categorias.findIndex((cat) => cat.id === categoryId); if (index < 0) return null;
  db.categorias[index] = { ...db.categorias[index], nome: str(patch.nome || db.categorias[index].nome, 100), ordem: Math.max(0, Number(patch.ordem ?? db.categorias[index].ordem ?? 0)), updatedAt: new Date().toISOString() };
  saveDatabase(db); logAudit('category.updated', { categoryId }, actor); return db.categorias[index];
}
function addProduct(product, actor = 'system') {
  const db = loadDatabase(); const created = normalizeProduct(product);
  if (!created.nome || created.preco < 0) return null;
  db.produtos.push(created); saveDatabase(db); logAudit('product.created', { productId: created.id, name: created.nome }, actor); return created.id;
}
function updateProduct(productId, patch, actor = 'admin') {
  const db = loadDatabase(); const index = db.produtos.findIndex((p) => p.id === productId); if (index < 0) return null;
  db.produtos[index] = normalizeProduct(patch, db.produtos[index]);
  if (!db.produtos[index].nome) return null;
  saveDatabase(db); logAudit('product.updated', { productId, patch: Object.keys(patch || {}) }, actor); return db.produtos[index];
}
function deleteProduct(productId, actor = 'system') {
  const db = loadDatabase(); const before = db.produtos.length; db.produtos = db.produtos.filter((p) => p.id !== productId); if (db.produtos.length === before) return false;
  db.produtos = db.produtos.map((p) => p.upsellProductId === productId ? { ...p, upsellProductId: '' } : p);
  saveDatabase(db); logAudit('product.deleted', { productId }, actor); return true;
}
function deleteCategory(categoryId, actor = 'system') {
  const db = loadDatabase(); const ids = db.produtos.filter((p) => p.categoriaId === categoryId).map((p) => p.id);
  db.categorias = db.categorias.filter((c) => c.id !== categoryId); db.produtos = db.produtos.filter((p) => p.categoriaId !== categoryId); saveDatabase(db);
  logAudit('category.deleted', { categoryId, productsToDelete: ids }, actor); return ids;
}
module.exports = { loadDatabase, saveDatabase, addCategory, updateCategory, addProduct, updateProduct, deleteProduct, deleteCategory, normalizeProduct };
