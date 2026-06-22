const { Client, LocalAuth } = require('whatsapp-web.js');
const { EvolutionClient } = require('./evolutionClient');
const { loadIntegrations } = require('../utils/integrationManager');

function createLocalClient() {
  return new Client({
    authStrategy: new LocalAuth({ clientId: process.env.BOT_CLIENT_ID || 'jetbot-principal', dataPath: './.wwebjs_auth' }),
    restartOnAuthFail: true,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0,
    qrMaxRetries: 0,
    puppeteer: {
      headless: true,
      timeout: 120000,
      protocolTimeout: 180000,
      ignoreHTTPSErrors: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-accelerated-2d-canvas','--disable-gpu','--disable-software-rasterizer','--disable-extensions','--disable-background-networking','--disable-sync','--disable-default-apps','--disable-popup-blocking','--disable-hang-monitor','--disable-prompt-on-repost','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-ipc-flooding-protection','--disable-features=TranslateUI','--metrics-recording-only','--mute-audio','--no-first-run','--hide-scrollbars','--window-size=1280,720']
    }
  });
}

function createMessagingClient() {
  const provider = loadIntegrations().whatsapp.provider;
  return provider === 'evolution' ? new EvolutionClient() : createLocalClient();
}

module.exports = { createMessagingClient };
