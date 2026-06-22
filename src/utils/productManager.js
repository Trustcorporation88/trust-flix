const databaseManager = require('./databaseManager');
const stockManager = require('./stockManager');
function getCategories() { return (databaseManager.loadDatabase().categorias || []).sort((a,b) => Number(a.ordem||0)-Number(b.ordem||0) || String(a.nome).localeCompare(String(b.nome))); }
function getProducts() { return (databaseManager.loadDatabase().produtos || []).map((p) => ({ ...p, estoque: stockManager.getStockCount(p.id) })).sort((a,b) => Number(b.destaque)-Number(a.destaque) || Number(a.ordem||0)-Number(b.ordem||0) || String(a.nome).localeCompare(String(b.nome))); }
function getProductsByCategory(categoryId) { return getProducts().filter((p) => p.categoriaId === categoryId && p.ativo !== false); }
function getProductById(productId) { return getProducts().find((p) => p.id === productId); }
module.exports = { getCategories, getProducts, getProductsByCategory, getProductById };
