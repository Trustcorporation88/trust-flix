const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { logAudit } = require('./auditLogger');
const { emitIntegrationEvent } = require('../services/integrationEvents');

const file = path.resolve(__dirname, '../../data/marketing_leads.json');

function digits(value) { return String(value || '').replace(/\D/g, ''); }
function normalizePhone(value) {
  let phone = digits(value);
  if (!phone) return '';
  if (!phone.startsWith('55') && phone.length >= 10 && phone.length <= 11) phone = `55${phone}`;
  if (phone.length < 12 || phone.length > 14) return '';
  return `${phone}@c.us`;
}
function cleanText(value, max = 180) { return String(value || '').trim().slice(0, max); }
function existingIndex(leads, chatId) {
  const phone = digits(chatId);
  return leads.findIndex((lead) => digits(lead.chatId || lead.telefone) === phone);
}

function importLeads(items, options = {}, actor = 'integration') {
  const list = Array.isArray(items) ? items : [];
  const leads = readJson(file, []);
  const result = { received: list.length, created: 0, updated: 0, invalid: 0, duplicates: 0 };
  const now = new Date().toISOString();
  for (const raw of list.slice(0, 5000)) {
    const chatId = normalizePhone(raw.phone || raw.telefone || raw.number || raw.whatsapp);
    if (!chatId) { result.invalid += 1; continue; }
    const index = existingIndex(leads, chatId);
    const consent = raw.consent === true || raw.optIn === true || options.defaultConsent === true;
    const tags = [...new Set([...(Array.isArray(raw.tags) ? raw.tags : []), cleanText(raw.tag || ''), cleanText(options.tag || '')].filter(Boolean))].slice(0, 20);
    const patch = {
      chatId,
      telefone: digits(chatId),
      nome: cleanText(raw.name || raw.nome || ''),
      empresa: cleanText(raw.company || raw.empresa || ''),
      email: cleanText(raw.email || '', 240),
      source: cleanText(raw.source || raw.fonte || options.source || 'Importação'),
      notes: cleanText(raw.notes || raw.observacoes || '', 1000),
      tags,
      stage: raw.stage || 'new',
      status: raw.status || 'lead',
      optIn: consent,
      optOut: !consent,
      consentSource: consent ? cleanText(raw.consentSource || options.consentSource || 'Importação informada') : '',
      consentAt: consent ? (raw.consentAt || now) : null,
      updatedAt: now,
      ultimaInteracao: now
    };
    if (index >= 0) {
      const existing = leads[index];
      leads[index] = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt || now };
      result.updated += 1;
      result.duplicates += 1;
    } else {
      const lead = { id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: now, ...patch };
      leads.push(lead);
      result.created += 1;
      emitIntegrationEvent('lead.created', lead).catch(() => {});
    }
  }
  writeJson(file, leads);
  logAudit('leads.imported', result, actor);
  return result;
}

function parseCsv(text) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(separator).map((v) => v.trim().replace(/^"|"$/g, ''));
    const item = {};
    headers.forEach((header, index) => { item[header] = values[index] || ''; });
    return item;
  });
}

module.exports = { importLeads, parseCsv, normalizePhone };
