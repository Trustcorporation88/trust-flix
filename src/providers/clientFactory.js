const { Client, LocalAuth } = require('whatsapp-web.js');
const { EvolutionClient } = require('./evolutionClient');
const { loadIntegrations } = require('../utils/integrationManager');

function createLocalClient() {
  const findChrome = () => {
    const { execSync } = require('child_process');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
    
    try {
      const chromeExe = execSync('node -e "require(\'puppeteer\').executablePath().then(p => console.log(p))"', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (chromeExe && fs.existsSync(chromeExe)) return chromeExe;
    } catch (_) {}
    
    const paths = [
      path.join(os.homedir(), '.cache/puppeteer/chrome/win64/chrome-win64/chrome.exe'),
      path.join(os.homedir(), '.cache/puppeteer/chrome/win64-150.0.7871.24/chrome-win64/chrome.exe'),
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    
    for (const p of paths) { if (fs.existsSync(p)) return p; }
    return undefined;
  };

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
      executablePath: findChrome(),
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-accelerated-2d-canvas','--disable-gpu','--disable-software-rasterizer','--disable-extensions','--disable-background-networking','--disable-sync','--disable-default-apps','--disable-popup-blocking','--disable-hang-monitor','--disable-prompt-on-repost','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-ipc-flooding-protection','--disable-features=TranslateUI','--metrics-recording-only','--mute-audio','--no-first-run','--hide-scrollbars','--window-size=1280,720']
    }
  });
}

function createMessagingClient() {
  const provider = loadIntegrations().whatsapp.provider;
  return provider === 'evolution' ? new EvolutionClient() : createLocalClient();
}

module.exports = { createMessagingClient };
