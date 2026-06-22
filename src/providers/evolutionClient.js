const { EventEmitter } = require('events');
const axios = require('axios');
const runtimeState = require('../core/runtimeState');
const { loadIntegrations } = require('../utils/integrationManager');
const { getSecret } = require('../utils/secretManager');

function normalizeNumber(chatId) {
  const raw = String(chatId || '');
  if (raw.endsWith('@g.us')) return raw;
  return raw.replace(/@c\.us|@s\.whatsapp\.net/g, '').replace(/\D/g, '');
}

class EvolutionClient extends EventEmitter {
  constructor() {
    super();
    this.userState = new Map();
    this.info = { wid: { _serialized: '' } };
    this.poller = null;
  }
  get settings() { return loadIntegrations().whatsapp.evolution; }
  get apiKey() { return getSecret('evolutionApiKey'); }
  request(method, endpoint, data) {
    const base = this.settings.baseUrl;
    if (!base || !this.apiKey || !this.settings.instance) throw new Error('Evolution API não configurada.');
    return axios({ method, url: `${base}${endpoint}`, data, timeout: 20000, headers: { apikey: this.apiKey, 'content-type': 'application/json' } });
  }
  async connectionState() {
    const { data } = await this.request('get', `/instance/connectionState/${encodeURIComponent(this.settings.instance)}`);
    const state = data?.instance?.state || data?.state || data?.instance?.status || data?.status || 'unknown';
    return String(state).toLowerCase();
  }
  async fetchQr() {
    const { data } = await this.request('get', `/instance/connect/${encodeURIComponent(this.settings.instance)}`);
    return data;
  }
  async initialize() {
    await this.refreshStatus();
    this.poller = setInterval(() => this.refreshStatus().catch((e) => console.warn('[Evolution] Status:', e.message)), 15000);
  }
  async refreshStatus() {
    try {
      const state = await this.connectionState();
      const connected = ['open', 'connected', 'ready'].includes(state);
      if (connected) {
        runtimeState.patchWhatsapp({ provider: 'evolution', status: 'ready', connected: true, qrDataUrl: '', lastReadyAt: new Date().toISOString() });
        if (!this._readyEmitted) { this._readyEmitted = true; this.emit('ready'); }
        return;
      }
      this._readyEmitted = false;
      runtimeState.patchWhatsapp({ provider: 'evolution', status: state, connected: false });
      const qr = await this.fetchQr();
      const code = qr?.code || qr?.qrcode?.code || '';
      const base64 = qr?.base64 || qr?.qrcode?.base64 || '';
      if (base64) runtimeState.patchWhatsapp({ status: 'qr', qrDataUrl: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`, lastQrAt: new Date().toISOString() });
      if (code) this.emit('qr', code);
    } catch (error) {
      runtimeState.patchWhatsapp({ provider: 'evolution', status: 'configuration_error', connected: false, disconnectReason: error.message });
      console.warn('[Evolution] Não foi possível conectar:', error.message);
    }
  }
  async sendMessage(chatId, content, options = {}) {
    const number = normalizeNumber(chatId);
    if (!number) throw new Error('Número de destino inválido.');
    if (typeof content === 'string') {
      const { data } = await this.request('post', `/message/sendText/${encodeURIComponent(this.settings.instance)}`, { number, text: content, linkPreview: true });
      return data;
    }
    if (content && content.data && content.mimetype) {
      const mediatype = content.mimetype.startsWith('image/') ? 'image' : content.mimetype.startsWith('video/') ? 'video' : 'document';
      const { data } = await this.request('post', `/message/sendMedia/${encodeURIComponent(this.settings.instance)}`, {
        number, mediatype, mimetype: content.mimetype, caption: options.caption || '', media: content.data,
        fileName: content.filename || `arquivo.${content.mimetype.split('/')[1] || 'bin'}`
      });
      return data;
    }
    throw new Error('Tipo de mensagem não suportado pela Evolution API.');
  }
  async destroy() { if (this.poller) clearInterval(this.poller); }
  createInboundMessage(payload) {
    const data = payload?.data || payload;
    const key = data?.key || data?.message?.key || {};
    const remoteJid = key.remoteJid || data?.remoteJid || data?.from || '';
    const message = data?.message || {};
    const body = message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || message.videoMessage?.caption || data?.body || data?.text || '';
    const from = String(remoteJid).endsWith('@g.us') ? remoteJid : `${normalizeNumber(remoteJid)}@c.us`;
    return {
      from,
      body: String(body || ''),
      fromMe: Boolean(key.fromMe || data?.fromMe),
      isStatus: String(remoteJid).includes('status@broadcast'),
      reply: (text) => this.sendMessage(from, text),
      getChat: async () => ({ sendStateTyping: async () => {}, clearState: async () => {} })
    };
  }
  handleWebhook(payload) {
    const event = String(payload?.event || payload?.type || '').toLowerCase().replace(/_/g, '.');
    if (event.includes('messages.upsert') || event.includes('message.upsert')) {
      const entries = Array.isArray(payload?.data) ? payload.data : [payload?.data || payload];
      for (const entry of entries) {
        const wrapped = { ...payload, data: entry };
        const message = this.createInboundMessage(wrapped);
        if (message.body || entry?.message) this.emit('message_create', message);
      }
    }
    if (event.includes('connection.update')) this.refreshStatus().catch(() => {});
  }
}

module.exports = { EvolutionClient, normalizeNumber };
