const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { getSecret, setSecret, masked } = require('./secretManager');
const { logAudit } = require('./auditLogger');
const configPath = path.resolve(__dirname, '../../aiConfig.json');
const defaultConfig = {
  groqToken: '',
  iaAtiva: false,
  model: 'llama-3.1-8b-instant',
  maxHistoryMessages: 12,
  temperature: 0.5,
  promptSistema: 'Você é uma assistente profissional. Use somente informações configuradas. Nunca invente preços, pagamentos ou entregas. Encaminhe para humano quando necessário.',
};
function loadRaw() { return { ...defaultConfig, ...readJson(configPath, defaultConfig) }; }
function loadAiConfig() {
  const config = loadRaw();
  config.groqToken = getSecret('groqToken') || config.groqToken || '';
  return config;
}
function getPublicAiConfig() { const c = loadRaw(); c.groqToken = masked('groqToken') || (c.groqToken ? 'configurado' : ''); return c; }
function saveAiConfig(config, actor = 'system') {
  const safe = { ...defaultConfig, ...config, groqToken: '' };
  writeJson(configPath, safe); logAudit('settings.ai.updated', {}, actor); return true;
}
function setGroqToken(token, actor = 'system') { setSecret('groqToken', token); logAudit('secret.groq.updated', {}, actor); return true; }
function setAiPrompt(prompt, actor = 'system') { const c = loadRaw(); c.promptSistema = String(prompt || ''); return saveAiConfig(c, actor); }
function resetAiPrompt(actor = 'system') { const c = loadRaw(); c.promptSistema = defaultConfig.promptSistema; return saveAiConfig(c, actor); }
function setAiStatus(isActive, actor = 'system') { const c = loadRaw(); c.iaAtiva = Boolean(isActive); return saveAiConfig(c, actor); }
function updateAiConfig(patch, token, actor = 'admin') { const c = { ...loadRaw(), ...patch }; if (token) setGroqToken(token, actor); return saveAiConfig(c, actor); }
module.exports = { loadAiConfig, getPublicAiConfig, saveAiConfig, setGroqToken, setAiPrompt, resetAiPrompt, setAiStatus, updateAiConfig };
