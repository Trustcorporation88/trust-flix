const funnelManager = require('../utils/funnelManager');
const automation = require('../utils/automationManager');
const crmManager = require('../utils/crmManager');
const { registerLeadInteraction } = require('./marketingService');

function normalize(value = '') { return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function matchesKeyword(body, keywords) {
  const value = normalize(body);
  return (keywords || []).some((keyword) => { const key = normalize(keyword); return key && (value === key || value.includes(key)); });
}
function scheduleGiftNurture(chatId, funnel) {
  if (!funnel.enabled || !funnel.privateNurture?.enabled) return [];
  const groupKey = `gift_funnel:${String(chatId).replace(/\D/g, '')}`;
  automation.cancelByGroup(groupKey, 'Funil de presentes reiniciado.');
  return (funnel.privateNurture.sequence || []).map((step) => automation.enqueueJob({
    type: 'message', kind: step.kind || 'marketing', chatId,
    runAt: new Date(Date.now() + Number(step.delayMinutes || 1) * 60000),
    groupKey, dedupeKey: `${groupKey}:${step.id}`,
    payload: { condition: 'always', text: step.text, source: funnel.sourceTag, sequenceStep: step.id }
  }));
}
async function enterGiftFunnel(client, sender, config, userState = {}) {
  const funnel = funnelManager.loadFunnel();
  if (!funnel.enabled) return false;
  registerLeadInteraction(sender);
  const lead = crmManager.getLead(sender);
  if (lead) crmManager.updateLead(sender, { stage: 'interested', source: funnel.sourceTag, origem: funnel.sourceTag, tags: [...new Set([...(lead.tags || []), funnel.sourceTag, 'presentes-gratis'])] }, 'gift-funnel');
  const vars = { marca: config.bot.nome, grupo: funnel.groupLink, pagina: funnel.pageLink || config.bot.linkPresentes, loja: funnel.storeLink || config.bot.linkPrincipal };
  await client.sendMessage(sender, funnelManager.render(funnel.welcomeMessage, vars));
  if (funnel.groupLink) await client.sendMessage(sender, funnelManager.render(funnel.groupMessage, vars));
  if (vars.pagina) await client.sendMessage(sender, funnelManager.render(funnel.pageMessage, vars));
  if (vars.loja) await client.sendMessage(sender, funnelManager.render(funnel.storeMessage, vars));
  await client.sendMessage(sender, funnel.consentMessage);
  global.setUserState(sender, { ...userState, stage: 'gift_funnel', funnelEnteredAt: new Date().toISOString() });
  if (lead?.optIn === true) scheduleGiftNurture(sender, funnel);
  return true;
}
async function handleGiftFunnelMessage(client, message, config, userState = {}) {
  const funnel = funnelManager.loadFunnel();
  if (!funnel.enabled) return false;
  const body = String(message.body || '').trim();
  const lower = normalize(body);
  if (matchesKeyword(body, funnel.entryKeywords)) { await enterGiftFunnel(client, message.from, config, userState); return true; }
  if (userState.stage !== 'gift_funnel') return false;
  if (['grupo','entrar no grupo'].includes(lower) && funnel.groupLink) { await client.sendMessage(message.from, funnelManager.render(funnel.groupMessage, { grupo: funnel.groupLink })); return true; }
  if (['pagina','página','presente'].includes(lower) && funnel.pageLink) { await client.sendMessage(message.from, funnelManager.render(funnel.pageMessage, { pagina: funnel.pageLink })); return true; }
  if (['loja','ofertas'].includes(lower) && funnel.storeLink) { await client.sendMessage(message.from, funnelManager.render(funnel.storeMessage, { loja: funnel.storeLink })); return true; }
  return false;
}
module.exports = { matchesKeyword, enterGiftFunnel, handleGiftFunnelMessage, scheduleGiftNurture };
