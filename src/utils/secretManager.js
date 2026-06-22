const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { readJson, writeJson, ensureDir } = require('../core/atomicJsonStore');

const secretsPath = path.resolve(__dirname, '../../data/secrets.enc.json');
const localSecretPath = path.resolve(__dirname, '../../data/.app-secret');

function getMasterSecret() {
  if (process.env.APP_SECRET && process.env.APP_SECRET.length >= 16) return process.env.APP_SECRET;
  ensureDir(localSecretPath);
  if (!fs.existsSync(localSecretPath)) {
    fs.writeFileSync(localSecretPath, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
    console.warn('⚠️ APP_SECRET não definido. Uma chave local foi criada em data/.app-secret. Configure APP_SECRET na hospedagem para maior segurança.');
  }
  return fs.readFileSync(localSecretPath, 'utf8').trim();
}

function key() {
  return crypto.createHash('sha256').update(getMasterSecret()).digest();
}

function encrypt(value) {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((item) => item.toString('base64')).join('.');
}

function decrypt(payload) {
  if (!payload) return '';
  try {
    const [iv, tag, encrypted] = String(payload).split('.').map((item) => Buffer.from(item, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch (error) {
    console.error('❌ Não foi possível descriptografar um segredo:', error.message);
    return '';
  }
}

function loadEncrypted() { return readJson(secretsPath, {}); }
function getSecret(name) {
  const envMap = {
    groqToken: 'GROQ_API_KEY',
    mercadoPagoToken: 'MERCADOPAGO_ACCESS_TOKEN',
    pushinpayToken: 'PUSHINPAY_API_TOKEN',
    pixKey: 'PIX_KEY',
    evolutionApiKey: 'EVOLUTION_API_KEY',
    leadImportToken: 'LEAD_IMPORT_TOKEN',
    outboundWebhookSecret: 'OUTBOUND_WEBHOOK_SECRET',
    evolutionWebhookToken: 'EVOLUTION_WEBHOOK_TOKEN',
  };
  const envName = envMap[name];
  if (envName && process.env[envName]) return process.env[envName];
  return decrypt(loadEncrypted()[name]);
}
function setSecret(name, value) {
  const data = loadEncrypted();
  if (value) data[name] = encrypt(value); else delete data[name];
  writeJson(secretsPath, data);
  return true;
}
function hasSecret(name) { return Boolean(getSecret(name)); }
function masked(name) {
  const value = getSecret(name);
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
}

module.exports = { getSecret, setSecret, hasSecret, masked };
