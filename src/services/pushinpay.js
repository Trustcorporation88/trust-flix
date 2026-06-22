const axios = require('axios');
const { loadConfig } = require('../utils/configManager');
const { addPendingPayment } = require('../utils/paymentManager');
const integrationManager = require('../utils/integrationManager');

const API_URL = 'https://api.pushinpay.com.br/api';

async function createPushinPayPix(product, customerPhone) {
  const config = loadConfig();
  const { apiToken } = config.pagamentos.pushinpay;

  if (!apiToken) {
    console.error("Erro na PushinPay: API Token não configurado.");
    return null;
  }

  const valorEmCentavos = Math.round(product.preco * 100);

  const publicBase = String(process.env.PUBLIC_BASE_URL || integrationManager.loadIntegrations().publicBaseUrl || '').replace(/\/+$/, '');
  const webhookSecret = String(process.env.WEBHOOK_SECRET || '').trim();
  const body = { value: valorEmCentavos, description: `Pagamento para ${product.nome}`, split_rules: [] };
  if (publicBase && webhookSecret) body.webhook_url = `${publicBase}/webhooks/pushinpay?secret=${encodeURIComponent(webhookSecret)}`;

  try {
    const response = await axios.post(`${API_URL}/pix/cashIn`, body, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const paymentId = response.data?.id || response.data?.transaction_id;
    if (!paymentId) throw new Error('A PushinPay não retornou o ID da transação.');
    addPendingPayment(`pushinpay_${paymentId}`, customerPhone, product);

    console.log('PIX PushinPay gerado com sucesso!', response.data);
    return {
      paymentId: `pushinpay_${paymentId}`,
      qrCodeBase64: String(response.data?.qr_code_base64 || response.data?.base64 || '').replace(/^data:image\/png;base64,/, ''),
      pixCopyPaste: response.data?.qr_code || response.data?.qr_code_text || response.data?.copy_paste || '',
    };
  } catch (error) {
    console.error("Erro ao criar PIX na PushinPay:", error.response?.data || error.message);
    return null;
  }
}

async function getPushinPayPaymentStatus(paymentId) {
  try {
    const config = loadConfig();
    const { apiToken } = config.pagamentos.pushinpay;
    if (!apiToken) return 'error';

    const url = `${API_URL}/transactions/${paymentId}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
    });
    return response.data.status;
  } catch (error) {
    console.error(`Erro ao verificar status na PushinPay para ${paymentId}:`, error.message);
    return 'error';
  }
}

module.exports = { createPushinPayPix, getPushinPayPaymentStatus };