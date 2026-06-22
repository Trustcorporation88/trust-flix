const path = require('path');
// BUG FIX: usar atomicJsonStore em vez de fs.writeFileSync direto,
// evitando corrupção do arquivo de log em caso de crash/reinício da aplicação.
const { readJson, writeJson } = require('../core/atomicJsonStore');

const logPath = path.resolve(__dirname, '../../data/sales_log.json');

function loadLogs() {
  return readJson(logPath, []);
}

function logSale(customerPhone, product, deliveredItem, details = {}) {
  try {
    const logs = loadLogs();
    const newLog = {
      timestamp: new Date().toISOString(),
      customer: customerPhone,
      productName: product.nome,
      productId: product.id,
      deliveredItem: deliveredItem,
      paymentId: details.paymentId || '',
      orderId: details.orderId || '',
      expiresAt: details.expiresAt || null,
    };
    logs.push(newLog);
    writeJson(logPath, logs);
    console.log(`[VENDA REGISTRADA] Cliente: ${customerPhone}, Produto: ${product.nome}`);
  } catch (error) {
    console.error('Erro ao registrar a venda:', error);
  }
}

module.exports = { logSale };
