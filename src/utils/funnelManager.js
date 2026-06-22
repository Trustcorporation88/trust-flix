const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { logAudit } = require('./auditLogger');

const file = path.resolve(__dirname, '../../data/funnel.json');
const defaults = {
  enabled: false,
  name: 'Funil Presentes Grátis',
  entryKeywords: ['presente', 'presentes', 'quero presente', 'brinde', 'material grátis', 'material gratis'],
  sourceTag: 'ads-presentes',
  campaignCode: 'PRESENTE',
  adMessage: 'Olá! Quero receber o presente grátis.',
  groupLink: '',
  pageLink: '',
  storeLink: '',
  welcomeMessage: '🎁 *PRESENTE GRÁTIS LIBERADO!*\n\nVocê chegou ao lugar certo. Acesse os materiais pelos links abaixo e, quando quiser conhecer as soluções completas, digite *MENU*.',
  consentMessage: 'Para receber novos materiais e ofertas no privado, envie *RECEBER*. Você pode cancelar a qualquer momento enviando *SAIR*.',
  groupMessage: '👥 Grupo de presentes: {{grupo}}',
  pageMessage: '🎁 Página de presentes: {{pagina}}',
  storeMessage: '🛒 Loja / ofertas: {{loja}}',
  privateNurture: { enabled: true, sequence: [
    { id: 'gift-check-30m', delayMinutes: 30, kind: 'transactional', text: '🎁 Conseguiu acessar seu presente? Se precisar de ajuda, responda esta mensagem.' },
    { id: 'gift-value-24h', delayMinutes: 1440, kind: 'marketing', text: '🚀 Posso te mostrar as soluções completas relacionadas ao material que você recebeu. Responda *MENU* para ver as opções.' },
    { id: 'gift-offer-72h', delayMinutes: 4320, kind: 'marketing', text: '💡 Separei as opções mais indicadas para quem começou pelos presentes. Responda *OFERTA* para conhecer.' }
  ] },
  groupWarmup: { enabled: false, timezone: 'America/Sao_Paulo', giftsPerDay: 3, offersPerDay: 1, defaultGiftTimes: ['09:00','14:00','18:00'], defaultOfferTimes: ['20:00'] },
  updatedAt: null
};
function merge(base, value) {
  const out = { ...base, ...(value || {}) };
  for (const [key, child] of Object.entries(base)) {
    if (child && typeof child === 'object' && !Array.isArray(child)) out[key] = merge(child, value?.[key]);
  }
  return out;
}
function text(value, max = 5000) { return String(value || '').trim().slice(0, max); }
function sanitize(value) {
  const next = merge(defaults, value);
  next.enabled = Boolean(next.enabled);
  next.name = text(next.name, 120) || defaults.name;
  next.entryKeywords = [...new Set((Array.isArray(next.entryKeywords) ? next.entryKeywords : String(next.entryKeywords || '').split(/\r?\n|,/)).map((x) => text(x, 80).toLowerCase()).filter(Boolean))].slice(0, 50);
  next.sourceTag = text(next.sourceTag, 80) || 'ads-presentes';
  next.campaignCode = text(next.campaignCode, 50) || 'PRESENTE';
  next.adMessage = text(next.adMessage, 500) || 'Olá! Quero receber o presente grátis.';
  for (const key of ['groupLink','pageLink','storeLink']) next[key] = text(next[key], 1200);
  for (const key of ['welcomeMessage','consentMessage','groupMessage','pageMessage','storeMessage']) next[key] = text(next[key], 5000);
  next.privateNurture.enabled = Boolean(next.privateNurture.enabled);
  next.privateNurture.sequence = (Array.isArray(next.privateNurture.sequence) ? next.privateNurture.sequence : []).map((step, index) => ({
    id: text(step.id, 80) || `gift-${index + 1}`,
    delayMinutes: Math.max(1, Number(step.delayMinutes || 1)),
    kind: step.kind === 'transactional' ? 'transactional' : 'marketing',
    text: text(step.text, 5000)
  })).filter((step) => step.text).slice(0, 20);
  next.groupWarmup.enabled = Boolean(next.groupWarmup.enabled);
  next.groupWarmup.timezone = text(next.groupWarmup.timezone, 80) || 'America/Sao_Paulo';
  next.groupWarmup.giftsPerDay = Math.max(0, Math.min(20, Number(next.groupWarmup.giftsPerDay || 0)));
  next.groupWarmup.offersPerDay = Math.max(0, Math.min(10, Number(next.groupWarmup.offersPerDay || 0)));
  next.groupWarmup.defaultGiftTimes = (Array.isArray(next.groupWarmup.defaultGiftTimes) ? next.groupWarmup.defaultGiftTimes : []).map((x) => text(x, 5)).filter((x) => /^\d{2}:\d{2}$/.test(x)).slice(0, 20);
  next.groupWarmup.defaultOfferTimes = (Array.isArray(next.groupWarmup.defaultOfferTimes) ? next.groupWarmup.defaultOfferTimes : []).map((x) => text(x, 5)).filter((x) => /^\d{2}:\d{2}$/.test(x)).slice(0, 10);
  next.updatedAt = new Date().toISOString();
  return next;
}
function loadFunnel() { return sanitize(readJson(file, defaults)); }
function saveFunnel(value, actor = 'admin') { const next = sanitize(value); writeJson(file, next); logAudit('funnel.updated', { enabled: next.enabled, steps: next.privateNurture.sequence.length }, actor); return next; }
function applyTemplate(brand = 'Sua marca', actor = 'admin') {
  const current = loadFunnel();
  const next = {
    ...current,
    enabled: false,
    welcomeMessage: `🎁 *PRESENTE GRÁTIS LIBERADO — ${brand}!*\n\nAcesse os materiais abaixo. Quando quiser conhecer as soluções completas, digite *MENU*.`,
    consentMessage: 'Para receber novos materiais e ofertas no privado, envie *RECEBER*. Para cancelar, envie *SAIR*.'
  };
  return saveFunnel(next, actor);
}

function buildAgendaTemplate(brand = 'Sua marca', funnelValue = loadFunnel()) {
  const dayNames = ['segunda','terca','quarta','quinta','sexta','sabado','domingo'];
  const gifts = funnelValue.groupWarmup.defaultGiftTimes || ['09:00','14:00','18:00'];
  const offers = funnelValue.groupWarmup.defaultOfferTimes || ['20:00'];
  const dias = {};
  for (const day of dayNames) {
    dias[day] = {
      tema: 'Conteúdo, relacionamento e oferta',
      presentes: gifts.slice(0, funnelValue.groupWarmup.giftsPerDay || gifts.length).map((time, index) => ({
        id: `${day}_presente_${index + 1}`, tipo: 'presente', horario: time, titulo: `Presente grátis ${index + 1}`, imagem: '',
        texto: `🎁 *PRESENTE GRÁTIS — ${brand}*\n\nMaterial do dia liberado.\n\nAcesse: ${funnelValue.pageLink || '{{pagina}}'}\n\nPara conhecer as soluções completas, responda *MENU*.`, ativo: true
      })),
      ofertas: offers.slice(0, funnelValue.groupWarmup.offersPerDay || offers.length).map((time, index) => ({
        id: `${day}_oferta_${index + 1}`, tipo: 'oferta', horario: time, titulo: `Oferta ${index + 1}`, imagem: '',
        texto: `🚀 *OFERTA ESPECIAL — ${brand}*\n\nConheça as opções completas: ${funnelValue.storeLink || '{{loja}}'}\n\nDúvidas? Chame no privado e envie *MENU*.`, ativo: true
      }))
    };
  }
  return { config: { nomeSistema: 'JETBOT — Presentes Grátis', timezone: funnelValue.groupWarmup.timezone || 'America/Sao_Paulo', modoHumanizado: true, resetDiario: true, presentesPorDia: funnelValue.groupWarmup.giftsPerDay || gifts.length, ofertasPorDia: funnelValue.groupWarmup.offersPerDay || offers.length, enviarImagemComLegenda: true, atrasoMaxMinutos: 5, ativo: Boolean(funnelValue.groupWarmup.enabled) }, dias };
}

function render(textValue, vars = {}) {
  let out = String(textValue || '');
  for (const [key, value] of Object.entries(vars)) out = out.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), String(value || ''));
  return out.trim();
}
module.exports = { defaults, loadFunnel, saveFunnel, applyTemplate, buildAgendaTemplate, render };
