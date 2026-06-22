const axios = require('axios');
const crypto = require('crypto');
const { loadIntegrations } = require('../utils/integrationManager');
const { getSecret } = require('../utils/secretManager');

async function emitIntegrationEvent(event, payload = {}) {
  const config = loadIntegrations().outboundWebhook;
  if (!config.enabled || !config.url || !Array.isArray(config.events) || !config.events.includes(event)) return { skipped: true };
  const body = { event, timestamp: new Date().toISOString(), data: payload };
  const secret = getSecret('outboundWebhookSecret');
  const raw = JSON.stringify(body);
  const signature = secret ? crypto.createHmac('sha256', secret).update(raw).digest('hex') : '';
  try {
    const response = await axios.post(config.url, body, {
      timeout: Math.max(1000, Math.min(Number(config.timeoutMs || 8000), 30000)),
      headers: { 'content-type': 'application/json', ...(signature ? { 'x-jetbot-signature': signature } : {}) },
      validateStatus: (status) => status >= 200 && status < 300
    });
    return { ok: true, status: response.status };
  } catch (error) {
    console.error(`[Integração] ${event}:`, error.message);
    return { ok: false, error: error.message };
  }
}

module.exports = { emitIntegrationEvent };
