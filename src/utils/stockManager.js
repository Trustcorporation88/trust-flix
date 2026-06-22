const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { logAudit } = require('./auditLogger');
const stockPath = path.resolve(__dirname, '../../data/stock.json');
function loadStock() { return readJson(stockPath, {}); }
function saveStock(data) { return writeJson(stockPath, data); }
function cleanItems(items) { return (Array.isArray(items) ? items : String(items || '').split('\n')).map((item) => String(item).trim()).filter(Boolean); }

function setStock(productId, stockItems, actor = 'system') {
  const stock = loadStock();
  stock[productId] = cleanItems(stockItems);
  saveStock(stock);
  logAudit('stock.replaced', { productId, count: stock[productId].length }, actor);
  return true;
}
function addStock(productId, stockItems, actor = 'system') {
  const stock = loadStock();
  stock[productId] = [...(stock[productId] || []), ...cleanItems(stockItems)];
  saveStock(stock);
  logAudit('stock.added', { productId, count: cleanItems(stockItems).length, total: stock[productId].length }, actor);
  return true;
}
function listStockItems(productId) { return [...(loadStock()[productId] || [])]; }
function getStockCount(productId) { return (loadStock()[productId] || []).length; }
function getAndRemoveStockItem(productId) {
  const stock = loadStock();
  if (!stock[productId]?.length) return null;
  const item = stock[productId].shift();
  saveStock(stock);
  return item;
}
function returnStockItem(productId, item) {
  if (!item) return false;
  const stock = loadStock();
  stock[productId] = [item, ...(stock[productId] || [])];
  return saveStock(stock);
}
function deleteStockForProduct(productId, actor = 'system') {
  const stock = loadStock();
  delete stock[productId];
  saveStock(stock);
  logAudit('stock.deleted', { productId }, actor);
  return true;
}
module.exports = { loadStock, setStock, addStock, listStockItems, getStockCount, getAndRemoveStockItem, returnStockItem, deleteStockForProduct };
