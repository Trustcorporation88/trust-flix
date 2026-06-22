const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { logAudit } = require('./auditLogger');

const leadsPath = path.resolve(__dirname, '../../data/marketing_leads.json');
function loadLeads() { return readJson(leadsPath, []); }
function saveLeads(leads) { return writeJson(leadsPath, leads); }

function normalizeStage(lead) {
  if (lead.stage) return lead.stage;
  if (lead.comprou || lead.tipo === 'cliente' || lead.status === 'comprador') return 'customer';
  if (lead.checkout || lead.tipo === 'carrinho' || lead.status === 'carrinho') return 'checkout';
  if (lead.status === 'interessado' || lead.ultimoProdutoId) return 'interested';
  if (lead.status === 'perdido') return 'lost';
  return 'new';
}

function listLeads() {
  return loadLeads().map((lead) => ({ ...lead, stage: normalizeStage(lead), notes: lead.notes || '', tags: lead.tags || [] }))
    .sort((a, b) => String(b.updatedAt || b.ultimaInteracao || '').localeCompare(String(a.updatedAt || a.ultimaInteracao || '')));
}

function getLead(chatId) {
  const digits = String(chatId || '').replace(/\D/g, '');
  return listLeads().find((lead) => String(lead.chatId || lead.telefone || '').replace(/\D/g, '') === digits) || null;
}

function updateLead(chatId, patch, actor = 'admin') {
  const leads = loadLeads();
  const index = leads.findIndex((lead) => lead.chatId === chatId || lead.id === chatId || lead.telefone === chatId);
  if (index < 0) return null;
  const safePatch = { ...patch, updatedAt: new Date().toISOString() };
  delete safePatch.chatId;
  leads[index] = { ...leads[index], ...safePatch };
  saveLeads(leads);
  logAudit('lead.updated', { chatId: leads[index].chatId, patch: Object.keys(safePatch) }, actor);
  return { ...leads[index], stage: normalizeStage(leads[index]) };
}

function leadStats() {
  const leads = listLeads();
  return {
    total: leads.length,
    new: leads.filter((l) => l.stage === 'new').length,
    interested: leads.filter((l) => l.stage === 'interested').length,
    checkout: leads.filter((l) => l.stage === 'checkout').length,
    customer: leads.filter((l) => l.stage === 'customer').length,
    lost: leads.filter((l) => l.stage === 'lost').length,
    optedOut: leads.filter((l) => l.optOut || l.bloqueado || l.optIn === false || l.ativo === false).length,
  };
}

module.exports = { listLeads, getLead, updateLead, leadStats };
