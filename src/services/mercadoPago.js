const axios = require('axios');
const { randomUUID } = require('crypto');
const { loadConfig } = require('../utils/configManager');
const { addPendingPayment } = require('../utils/paymentManager');
const integrationManager = require('../utils/integrationManager');

async function createMercadoPagoPix(product, customerPhone) {
  const config = loadConfig();
  const { accessToken } = config.pagamentos.mercadoPago;

  if (!accessToken) {
      console.error("Erro no Mercado Pago: Access Token não configurado.");
      return null;
  }

  const publicBase = String(process.env.PUBLIC_BASE_URL || integrationManager.loadIntegrations().publicBaseUrl || '').replace(/\/+$/, '');
  const webhookSecret = String(process.env.WEBHOOK_SECRET || '').trim();
  const body = {
    transaction_amount: Number(product.preco),
    description: `Pagamento para ${product.nome}`,
    payment_method_id: 'pix',
    payer: {
      email: `cliente_${String(customerPhone || Date.now()).replace(/\D/g, '').slice(-12)}@example.com`,
    },
  };
  if (publicBase && webhookSecret) body.notification_url = `${publicBase}/webhooks/mercadopago?secret=${encodeURIComponent(webhookSecret)}`;

  try {
    const response = await axios.post('https://api.mercadopago.com/v1/payments', body, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': randomUUID()
      }, 
    });
    
    addPendingPayment(response.data.id, customerPhone, product);

    const pixData = response.data?.point_of_interaction?.transaction_data || {};
    return {
      paymentId: String(response.data.id),
      qrCodeBase64: String(pixData.qr_code_base64 || '').replace(/^data:image\/png;base64,/, ''),
      pixCopyPaste: pixData.qr_code || '',
    };
  } catch (error) {
    console.error("Erro no Mercado Pago:", error.response?.data || error.message);
    return null;
  }
}

async function getMercadoPagoPaymentStatus(paymentId) {
    try {
        const config = loadConfig();
        const { accessToken } = config.pagamentos.mercadoPago;
        if (!accessToken) return 'error';
        const url = `https://api.mercadopago.com/v1/payments/${paymentId}`;
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return response.data.status;
    } catch (error) {
        console.error(`Erro ao verificar status no MP para ${paymentId}:`, error.message);
        return 'error';
    }
}

module.exports = { createMercadoPagoPix, getMercadoPagoPaymentStatus };