const path = require('path');
const crypto = require('crypto');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { getSecret, setSecret, masked } = require('./secretManager');
const { logAudit } = require('./auditLogger');

const file = path.resolve(__dirname, '../../data/integrations.json');
const defaults = {
  publicBaseUrl: '',
  whatsapp: {
    provider: 'local',
    evolution: {
      enabled: false,
      baseUrl: '',
      instance: '',
      webhookConfigured: false,
      lastTestAt: null,
      lastStatus: 'not_configured'
    }
  },
  leadCapture: {
    enabled: true,
    defaultSource: 'JETBOT Leads Connector',
    defaultConsent: false,
    allowCsv: true,
    allowApi: true
  },
  outboundWebhook: {
    enabled: false,
    url: '',
    events: ['lead.created', 'order.paid', 'sale.delivered', 'ticket.created'],
    timeoutMs: 8000
  },
  api: {
    enabled: true
  }
};

function merge(base, value) {
  const result = { ...base, ...(value || {}) };
  for (const [key, child] of Object.entries(base)) {
    if (child && typeof child === 'object' && !Array.isArray(child)) result[key] = merge(child, value?.[key]);
  }
  return result;
}

function loadIntegrations() { return merge(defaults, readJson(file, defaults)); }
function saveIntegrations(value, actor = 'admin') {
  const safe = merge(defaults, value);
  safe.publicBaseUrl = String(safe.publicBaseUrl || '').trim().replace(/\/+$/, '');
  safe.whatsapp.provider = ['local', 'evolution'].includes(safe.whatsapp.provider) ? safe.whatsapp.provider : 'local';
  safe.whatsapp.evolution.baseUrl = String(safe.whatsapp.evolution.baseUrl || '').trim().replace(/\/+$/, '');
  safe.whatsapp.evolution.instance = String(safe.whatsapp.evolution.instance || '').trim();
  safe.outboundWebhook.url = String(safe.outboundWebhook.url || '').trim();
  writeJson(file, safe);
  logAudit('integrations.updated', { provider: safe.whatsapp.provider }, actor);
  return safe;
}

function ensureToken(name, prefix) {
  let token = getSecret(name);
  if (!token) { token = `${prefix}_${crypto.randomBytes(24).toString('hex')}`; setSecret(name, token); }
  return token;
}
function ensureLeadToken() {
  return ensureToken('leadImportToken', 'jlead');
}
function ensureEvolutionWebhookToken() { return ensureToken('evolutionWebhookToken', 'jevo');
}

function publicIntegrations() {
  const data = loadIntegrations();
  return {
    ...data,
    secrets: {
      evolutionApiKey: masked('evolutionApiKey'),
      leadImportToken: ensureLeadToken(),
      outboundWebhookSecret: masked('outboundWebhookSecret'),
      evolutionWebhookToken: ensureEvolutionWebhookToken()
    }
  };
}

function updateIntegrations(publicData = {}, secrets = {}, actor = 'admin') {
  const current = loadIntegrations();
  const next = merge(current, publicData);
  if (secrets.evolutionApiKey !== undefined && secrets.evolutionApiKey !== '') setSecret('evolutionApiKey', secrets.evolutionApiKey);
  if (secrets.leadImportToken !== undefined && secrets.leadImportToken !== '') setSecret('leadImportToken', secrets.leadImportToken);
  if (secrets.outboundWebhookSecret !== undefined && secrets.outboundWebhookSecret !== '') setSecret('outboundWebhookSecret', secrets.outboundWebhookSecret);
  if (secrets.evolutionWebhookToken !== undefined && secrets.evolutionWebhookToken !== '') setSecret('evolutionWebhookToken', secrets.evolutionWebhookToken);
  return saveIntegrations(next, actor);
}

module.exports = { loadIntegrations, saveIntegrations, publicIntegrations, updateIntegrations, ensureLeadToken, ensureEvolutionWebhookToken };
