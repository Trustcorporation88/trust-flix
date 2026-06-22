const fs = require('fs');
const path = require('path');
const { getSecret, setSecret, masked } = require('./secretManager');
const { logAudit } = require('./auditLogger');

const configPath = path.resolve(__dirname, '../../config.js');
const defaultConfig = {
  bot: {
    nome: 'SUA MARCA',
    nomeAssistente: 'Assistente Virtual',
    tipoNegocio: 'digital_products',
    descricaoNegocio: '',
    tomDeVoz: 'profissional, simples, persuasivo e honesto',
    saudacao: 'Olá! 👋 É um prazer te atender. Como posso te ajudar hoje?',
    mensagemSuporte: 'Entendido. Um atendente humano irá te auxiliar. Envie seu nome e explique o que precisa.',
    termosDeCompra: 'Confira os dados antes de comprar. A entrega ocorre conforme a descrição de cada produto.',
    linkPrincipal: '',
    linkPresentes: '',
    whatsappPublicNumber: '',
    logoUrl: '',
    primaryColor: '#00e676',
    catalogTitle: 'Conheça nossas soluções',
    catalogSubtitle: 'Veja os detalhes de cada opção e fale com nossa equipe pelo WhatsApp.',
    emailSuporte: '',
    horarioAtendimento: 'Segunda a sábado, das 9h às 18h',
    adminNumbers: [],
    ignorarGrupos: true,
  },
  vendas: {
    explicarAntesDoPagamento: true,
    pedirConfirmacaoCompra: true,
    mostrarEstoque: false,
    mostrarGarantia: true,
    moeda: 'BRL',
    simboloMoeda: 'R$',
    catalogoPublicoAtivo: true,
    mensagemSemEstoque: 'Este produto está temporariamente indisponível. Posso avisar quando voltar ou mostrar outra opção.',
    mensagemSemPagamento: 'Nenhuma forma de pagamento está configurada no momento. Fale com um atendente.',
  },
  pagamentos: {
    mercadoPago: { ativo: false, accessToken: '' },
    pixManual: { ativo: false, chavePix: '' },
    pushinpay: { ativo: false, apiToken: '' },
  },
};

const templates = {
  digital_products: {
    tipoNegocio: 'digital_products',
    saudacao: 'Olá! 👋 Seja bem-vindo(a) à {{marca}}. Vou te ajudar a encontrar o produto digital ideal.',
    termosDeCompra: 'A entrega segue a descrição do produto. Pagamentos automáticos são liberados após confirmação do gateway. Guarde os dados recebidos e solicite suporte caso precise.'
  },
  services: {
    tipoNegocio: 'services',
    saudacao: 'Olá! 👋 Seja bem-vindo(a) à {{marca}}. Vou entender o que você precisa e apresentar a melhor solução.',
    termosDeCompra: 'Serviços são executados conforme escopo, prazo e condições informadas na proposta. A confirmação do pagamento inicia o processo de atendimento.'
  },
  local_business: {
    tipoNegocio: 'local_business',
    saudacao: 'Olá! 👋 Seja bem-vindo(a) à {{marca}}. Posso mostrar serviços, valores, horários e ajudar no seu atendimento.',
    termosDeCompra: 'Valores e disponibilidade podem variar conforme data, local e serviço escolhido. Confirme os detalhes antes do pagamento.'
  },
  education: {
    tipoNegocio: 'education',
    saudacao: 'Olá! 👋 Seja bem-vindo(a) à {{marca}}. Vou te ajudar a escolher o treinamento mais adequado para seu objetivo.',
    termosDeCompra: 'O acesso, duração e suporte seguem a descrição de cada curso. Materiais são para uso individual, salvo indicação contrária.'
  },
  agency: {
    tipoNegocio: 'agency',
    saudacao: 'Olá! 👋 Seja bem-vindo(a) à {{marca}}. Vou conhecer seu objetivo e apresentar a solução mais adequada.',
    termosDeCompra: 'Projetos e serviços seguem o escopo aprovado. Prazos começam após pagamento e envio das informações necessárias.'
  },
  subscription: {
    tipoNegocio: 'subscription',
    saudacao: 'Olá! 👋 Seja bem-vindo(a) à {{marca}}. Vou te mostrar os planos e ajudar a escolher a melhor opção.',
    termosDeCompra: 'Planos possuem validade e condições descritas na oferta. A renovação mantém o acesso ativo conforme o período contratado.'
  },
  ecommerce: { tipoNegocio: 'ecommerce', saudacao: 'Olá! 👋 Bem-vindo(a) à {{marca}}. Vou te ajudar a encontrar o produto ideal, explicar os detalhes e finalizar seu pedido.', termosDeCompra: 'Preços, estoque, prazo, frete, troca e garantia seguem as condições apresentadas em cada produto e no momento da compra.' },
  restaurant: { tipoNegocio: 'restaurant', saudacao: 'Olá! 🍽️ Bem-vindo(a) à {{marca}}. Posso mostrar o cardápio, valores, adicionais, entrega e ajudar no seu pedido.', termosDeCompra: 'Pedidos dependem de horário, área de entrega, disponibilidade e confirmação do pagamento. Confira endereço e itens antes de concluir.' },
  beauty: { tipoNegocio: 'beauty', saudacao: 'Olá! ✨ Bem-vindo(a) à {{marca}}. Vou apresentar os procedimentos, benefícios, valores e ajudar no agendamento.', termosDeCompra: 'Resultados variam por pessoa. Agendamento, contraindicações, avaliação e políticas de cancelamento devem ser confirmados antes do pagamento.' },
  health: { tipoNegocio: 'health', saudacao: 'Olá! 👋 Bem-vindo(a) à {{marca}}. Posso explicar serviços, horários e orientar o agendamento.', termosDeCompra: 'As informações do atendimento não substituem avaliação profissional. Urgências devem procurar serviço apropriado. Valores e disponibilidade devem ser confirmados.' },
  real_estate: { tipoNegocio: 'real_estate', saudacao: 'Olá! 🏠 Bem-vindo(a) à {{marca}}. Vou entender o imóvel que você procura e organizar as melhores opções.', termosDeCompra: 'Valores, disponibilidade e condições dos imóveis podem mudar. Propostas e documentos passam por validação da equipe responsável.' },
  automotive: { tipoNegocio: 'automotive', saudacao: 'Olá! 🚗 Bem-vindo(a) à {{marca}}. Posso apresentar veículos ou serviços, valores e ajudar no agendamento.', termosDeCompra: 'Disponibilidade, condições, laudos, prazos e valores devem ser confirmados antes da compra ou execução do serviço.' },
  events: { tipoNegocio: 'events', saudacao: 'Olá! 🎉 Bem-vindo(a) à {{marca}}. Vou te ajudar a escolher o pacote ideal para seu evento.', termosDeCompra: 'Datas dependem de disponibilidade. Escopo, quantidade, local, prazo, cancelamento e pagamento seguem a proposta confirmada.' },
  custom: { tipoNegocio: 'custom', saudacao: 'Olá! 👋 Bem-vindo(a) à {{marca}}. Vou entender o que você precisa e apresentar a melhor opção.', termosDeCompra: 'Confira descrição, condições, prazo, entrega e suporte antes de finalizar a compra.' }
};

function merge(base, value) {
  const result = { ...base, ...(value || {}) };
  for (const [key, child] of Object.entries(base)) {
    if (child && typeof child === 'object' && !Array.isArray(child)) result[key] = merge(child, value?.[key]);
  }
  return result;
}
function loadRawConfig() {
  try {
    delete require.cache[require.resolve(configPath)];
    const loaded = merge(defaultConfig, require(configPath));
    if (!Array.isArray(loaded.bot.adminNumbers)) loaded.bot.adminNumbers = [];
    return loaded;
  } catch (error) {
    console.error('Erro ao carregar config.js, usando padrão:', error.message);
    return merge(defaultConfig, {});
  }
}
function loadConfig() {
  const config = loadRawConfig();
  const mp = getSecret('mercadoPagoToken') || config.pagamentos.mercadoPago.accessToken || '';
  const push = getSecret('pushinpayToken') || config.pagamentos.pushinpay.apiToken || '';
  const pix = getSecret('pixKey') || config.pagamentos.pixManual.chavePix || '';
  config.pagamentos.mercadoPago.accessToken = mp;
  config.pagamentos.pushinpay.apiToken = push;
  config.pagamentos.pixManual.chavePix = pix;
  config.pagamentos.mercadoPago.ativo = Boolean(config.pagamentos.mercadoPago.ativo && mp);
  config.pagamentos.pushinpay.ativo = Boolean(config.pagamentos.pushinpay.ativo && push);
  config.pagamentos.pixManual.ativo = Boolean(config.pagamentos.pixManual.ativo && pix);
  if (process.env.IGNORE_GROUP_MESSAGES !== undefined) config.bot.ignorarGrupos = String(process.env.IGNORE_GROUP_MESSAGES).toLowerCase() !== 'false';
  return config;
}
function sanitizeConfig(config) {
  const safe = merge(defaultConfig, config);
  safe.bot.nome = String(safe.bot.nome || '').trim().slice(0, 100) || 'SUA MARCA';
  safe.bot.nomeAssistente = String(safe.bot.nomeAssistente || '').trim().slice(0, 80) || 'Assistente Virtual';
  safe.bot.whatsappPublicNumber = String(safe.bot.whatsappPublicNumber || '').replace(/\D/g, '').slice(0, 15);
  safe.bot.logoUrl = String(safe.bot.logoUrl || '').trim().slice(0, 1000);
  safe.bot.primaryColor = /^#[0-9a-f]{6}$/i.test(String(safe.bot.primaryColor || '')) ? String(safe.bot.primaryColor) : '#00e676';
  safe.bot.catalogTitle = String(safe.bot.catalogTitle || '').trim().slice(0, 160) || 'Conheça nossas soluções';
  safe.bot.catalogSubtitle = String(safe.bot.catalogSubtitle || '').trim().slice(0, 500);
  safe.vendas.catalogoPublicoAtivo = safe.vendas.catalogoPublicoAtivo !== false;
  safe.bot.adminNumbers = [...new Set((safe.bot.adminNumbers || []).map((n) => String(n).replace(/\D/g, '')).filter((n) => n.length >= 10 && n.length <= 14))].slice(0, 20);
  safe.pagamentos.mercadoPago.accessToken = '';
  safe.pagamentos.pushinpay.apiToken = '';
  safe.pagamentos.pixManual.chavePix = '';
  return safe;
}
function savePublicConfig(config, actor = 'system') {
  const safe = sanitizeConfig(config);
  fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(safe, null, 2)};\n`, 'utf8');
  logAudit('settings.public.updated', {}, actor);
  return true;
}
function getPublicConfig() {
  const config = loadRawConfig();
  config.pagamentos.mercadoPago.accessToken = masked('mercadoPagoToken') || '';
  config.pagamentos.pushinpay.apiToken = masked('pushinpayToken') || '';
  config.pagamentos.pixManual.chavePix = masked('pixKey') || '';
  return config;
}
function updateSettings(publicConfig, secrets = {}, actor = 'admin') {
  if (secrets.mercadoPagoToken !== undefined && secrets.mercadoPagoToken !== '') setSecret('mercadoPagoToken', secrets.mercadoPagoToken);
  if (secrets.pushinpayToken !== undefined && secrets.pushinpayToken !== '') setSecret('pushinpayToken', secrets.pushinpayToken);
  if (secrets.pixKey !== undefined && secrets.pixKey !== '') setSecret('pixKey', secrets.pixKey);
  return savePublicConfig(publicConfig, actor);
}
function applyTemplate(type, brand = 'SUA MARCA', actor = 'admin') {
  const template = templates[type] || templates.digital_products;
  const config = loadRawConfig();
  config.bot.tipoNegocio = template.tipoNegocio;
  config.bot.saudacao = template.saudacao.replace(/{{marca}}/g, brand || config.bot.nome || 'SUA MARCA');
  config.bot.termosDeCompra = template.termosDeCompra;
  savePublicConfig(config, actor);
  return getPublicConfig();
}
function setAccessToken(token, actor = 'system') { setSecret('mercadoPagoToken', token); const c = loadRawConfig(); c.pagamentos.mercadoPago.ativo = Boolean(token); return savePublicConfig(c, actor); }
function setManualPix(key, actor = 'system') { setSecret('pixKey', key); const c = loadRawConfig(); c.pagamentos.pixManual.ativo = Boolean(key); return savePublicConfig(c, actor); }
function setPushinpayToken(token, actor = 'system') { setSecret('pushinpayToken', token); const c = loadRawConfig(); c.pagamentos.pushinpay.ativo = Boolean(token); return savePublicConfig(c, actor); }
function resetAllConfig(actor = 'system') { ['mercadoPagoToken','pushinpayToken','pixKey'].forEach((k) => setSecret(k, '')); return savePublicConfig(defaultConfig, actor); }

module.exports = { defaultConfig, templates, loadConfig, loadRawConfig, getPublicConfig, saveConfig: savePublicConfig, savePublicConfig, updateSettings, applyTemplate, setAccessToken, setManualPix, setPushinpayToken, resetAllConfig };
