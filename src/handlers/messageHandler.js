const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');
const { loadConfig } = require('../utils/configManager');
const { loadAiConfig } = require('../utils/aiConfigManager');
const { getCategories, getProducts, getProductsByCategory, getProductById } = require('../utils/productManager');
const { createMercadoPagoPix } = require('../services/mercadoPago');
const { createPushinPayPix } = require('../services/pushinpay');
const { generatePix } = require('../services/pixGenerator');
const { handleAdminMessage, adminMenuText } = require('./adminHandler');
const { handlePresentesCommand } = require('../services/presentesScheduler');
const { handleDisparosCommand } = require('../services/disparosService');
const { handleMarketingCommand, registerLeadInteraction, registerCheckout, optOutLead, optInLead } = require('../services/marketingService');
const { getAiResponse } = require('./aiHandler');
const adminConfig = require('../../adminConfig');
const ticketManager = require('../utils/ticketManager');
const { notifyAdmins } = require('../utils/adminUtils');
const { addPendingPayment } = require('../utils/paymentManager');
const { fulfillApprovedPayment } = require('../services/paymentProcessor');
const crmManager = require('../utils/crmManager');
const { scheduleCheckoutAutomation, scheduleTicketEscalation, cancelTicketAutomation, cancelMarketingForContact } = require('../services/automationEngine');
const { handleGiftFunnelMessage, enterGiftFunnel, scheduleGiftNurture } = require('../services/funnelService');
const funnelManager = require('../utils/funnelManager');

function money(value, symbol = 'R$') { return `${symbol} ${Number(value || 0).toFixed(2).replace('.', ',')}`; }
function onlyDigits(value = '') { return String(value).replace(/\D/g, ''); }
function bulletList(items, icon = '✅') { return (Array.isArray(items) ? items : []).filter(Boolean).map((item) => `${icon} ${item}`).join('\n'); }
function getFeaturedProducts() {
  const active = getProducts().filter((product) => product.ativo !== false);
  const featured = active.filter((p) => p.destaque);
  return (featured.length ? featured : active).slice(0, 5);
}
function productAvailable(product) {
  if (!product || product.ativo === false) return false;
  if (product.entregaAutomatica === false || product.deliveryType === 'manual') return true;
  if (product.deliveryType === 'link') return Boolean(String(product.deliveryLink || '').trim());
  if (product.deliveryType === 'webhook') return /^https?:\/\//i.test(String(product.deliveryWebhookUrl || '').trim());
  return Number(product.estoque || 0) > 0;
}
function getMainMenuText(config) {
  const featured = getFeaturedProducts();
  const giftsFunnel = funnelManager.loadFunnel();
  const hasGifts = giftsFunnel.enabled || Boolean(config.bot.linkPresentes);
  let text = `${config.bot.saudacao.replace(/{{marca}}/gi, config.bot.nome)}\n\n`;
  if (!featured.length) {
    text += 'Nosso catálogo está sendo preparado. Digite *ATENDENTE* para falar com a equipe.';
    return text;
  }
  text += `Escolha uma opção para conhecer todos os detalhes:\n\n`;
  featured.forEach((product, index) => {
    text += `*${index + 1}* — 🛍️ *${product.nome}*\n`;
    if (product.descricaoCurta) text += `   ${product.descricaoCurta}\n`;
    text += `   ${money(product.preco, config.vendas.simboloMoeda)}\n\n`;
  });
  text += `*${featured.length + 1}* — 📚 Ver catálogo completo\n`;
  if (hasGifts) text += `*${featured.length + 2}* — 🎁 Presentes e materiais\n`;
  text += `*0* — 🙋 Falar com atendimento humano\n\n`;
  text += `Você verá a explicação completa antes de qualquer pagamento.\nDigite *TERMOS* para consultar as condições.\n\nPara receber ofertas, envie *RECEBER*. Para cancelar, envie *SAIR*.`;
  return text;
}
function formatProductPresentation(config, product) {
  const symbol = config.vendas.simboloMoeda || 'R$';
  const lines = [`🛍️ *${product.nome}*`];
  if (product.descricaoCurta) lines.push(`\n${product.descricaoCurta}`);
  if (product.descricao) lines.push(`\n📌 *Como funciona*\n${product.descricao}`);
  const benefits = bulletList(product.beneficios, '✅');
  if (benefits) lines.push(`\n🚀 *Principais benefícios*\n${benefits}`);
  const includes = bulletList(product.inclui, '📦');
  if (includes) lines.push(`\n🎁 *O que você recebe*\n${includes}`);
  if (product.publicoAlvo) lines.push(`\n🎯 *Para quem é*\n${product.publicoAlvo}`);
  if (product.videoUrl && /^https?:\/\//i.test(product.videoUrl)) lines.push(`\n🎥 *Vídeo de apresentação*\n${product.videoUrl}`);
  if (product.provaSocial) lines.push(`\n⭐ *Resultados e confiança*\n${product.provaSocial}`);
  if (config.vendas.mostrarGarantia !== false && product.garantia) lines.push(`\n🛡️ *Garantia/condição*\n${product.garantia}`);
  if (Number(product.precoDe || 0) > Number(product.preco || 0)) lines.push(`\n💰 De ~${money(product.precoDe, symbol)}~ por *${money(product.preco, symbol)}*`);
  else lines.push(`\n💰 *Investimento: ${money(product.preco, symbol)}*`);
  if (config.vendas.mostrarEstoque && product.deliveryType === 'stock') lines.push(`📊 Disponibilidade atual: ${product.estoque} unidade(s)`);
  if (product.validityDays > 0) lines.push(`📅 Validade: ${product.validityDays} dia(s)`);
  lines.push(`\nO que deseja fazer?\n\n*1* — 💳 ${product.ctaTexto || 'Comprar agora'}\n*2* — ❓ Ver perguntas frequentes\n*3* — 🤖 Tirar uma dúvida\n*4* — 📚 Voltar ao catálogo\n*0* — 🙋 Falar com atendente`);
  return lines.join('\n');
}
function formatFaq(product) {
  const faq = Array.isArray(product.faq) ? product.faq : [];
  if (!faq.length) return `Ainda não há perguntas frequentes cadastradas para *${product.nome}*. Envie sua dúvida que eu te ajudo.`;
  return `❓ *PERGUNTAS FREQUENTES — ${product.nome}*\n\n${faq.map((item, i) => `*${i + 1}. ${item.question}*\n${item.answer}`).join('\n\n')}\n\nDigite *1* para comprar, *3* para perguntar ou *4* para voltar ao catálogo.`;
}
async function sendProductMedia(client, sender, product) {
  if (!product.imagemUrl || !/^https?:\/\//i.test(product.imagemUrl)) return;
  try {
    const response = await axios.get(product.imagemUrl, { responseType: 'arraybuffer', timeout: 10000, maxContentLength: 5 * 1024 * 1024 });
    const mime = String(response.headers['content-type'] || 'image/jpeg').split(';')[0];
    if (!mime.startsWith('image/')) return;
    const media = new MessageMedia(mime, Buffer.from(response.data).toString('base64'), `produto.${mime.split('/')[1] || 'jpg'}`);
    await client.sendMessage(sender, media, { caption: product.nome });
  } catch (error) { console.warn(`[Produto] Imagem não enviada (${product.nome}):`, error.message); }
}
async function showProduct(client, sender, config, product, userState = {}) {
  if (!product || product.ativo === false) return client.sendMessage(sender, 'Esse produto não está disponível. Digite *MENU* para ver outras opções.');
  await sendProductMedia(client, sender, product);
  await client.sendMessage(sender, formatProductPresentation(config, product));
  global.setUserState(sender, { ...userState, stage: 'product_details', productId: product.id, product });
  crmManager.getLead(sender) && crmManager.updateLead(sender, { stage: 'interested', ultimoProdutoId: product.id }, 'bot');
}
function buildPaymentMenu(config, product) {
  let paymentText = `💳 *FINALIZAR — ${product.nome}*\n\nValor: *${money(product.preco, config.vendas.simboloMoeda)}*\n\nEscolha a forma de pagamento:\n\n`;
  const paymentOptions = [];
  if (config.pagamentos.mercadoPago.ativo) paymentOptions.push({ id: 'mp', text: 'PIX automático via Mercado Pago' });
  if (config.pagamentos.pushinpay.ativo) paymentOptions.push({ id: 'pushinpay', text: 'PIX automático via PushinPay' });
  if (config.pagamentos.pixManual.ativo) paymentOptions.push({ id: 'pix', text: 'PIX manual' });
  paymentOptions.forEach((opt, i) => { paymentText += `*${i + 1}* — ${opt.text}\n`; });
  paymentText += `\n*0* — Voltar aos detalhes do produto`;
  return { paymentText, paymentOptions };
}
function phoneVariants(value = '') {
  const digits = onlyDigits(value); const variants = new Set(); if (!digits) return variants; variants.add(digits);
  if (digits.startsWith('55')) { const country = digits.slice(0, 2); const ddd = digits.slice(2, 4); const local = digits.slice(4); if (local.length === 9 && local.startsWith('9')) variants.add(country + ddd + local.slice(1)); if (local.length === 8) variants.add(country + ddd + '9' + local); }
  return variants;
}
function isUserAdmin(client, sender, config) {
  const ownerVariants = phoneVariants(client.info?.wid?._serialized || '');
  const senderVariants = phoneVariants(sender);
  const configured = [...(adminConfig.additionalAdmins || []), ...(config.bot.adminNumbers || [])];
  const adminVariants = new Set(configured.flatMap((admin) => [...phoneVariants(admin)]));
  return [...senderVariants].some((variant) => ownerVariants.has(variant) || adminVariants.has(variant));
}
async function sendCategories(client, sender, userState = {}) {
  const categories = getCategories().filter((cat) => getProductsByCategory(cat.id).length > 0);
  if (!categories.length) return client.sendMessage(sender, '😕 Nenhum produto ativo foi cadastrado. Digite *ATENDENTE* para falar com a equipe.');
  let text = '📚 *CATÁLOGO COMPLETO*\n\nSelecione uma categoria:\n\n';
  categories.forEach((cat, i) => { text += `*${i + 1}* — ${cat.nome} (${getProductsByCategory(cat.id).length})\n`; });
  text += '\n*0* — Voltar ao menu';
  await client.sendMessage(sender, text);
  global.setUserState(sender, { ...userState, stage: 'selecting_category', categoriesInView: categories });
}
async function sendPaymentOptionsForProduct(client, sender, config, product, userState = {}) {
  if (!productAvailable(product)) { await client.sendMessage(sender, `😕 ${config.vendas.mensagemSemEstoque}\n\nDigite *MENU* para ver outras opções.`); return; }
  const { paymentText, paymentOptions } = buildPaymentMenu(config, product);
  if (!paymentOptions.length) { await client.sendMessage(sender, config.vendas.mensagemSemPagamento); return; }
  await client.sendMessage(sender, paymentText);
  global.setUserState(sender, { ...userState, stage: 'selecting_payment', productId: product.id, product, paymentOptionsInView: paymentOptions });
}
async function openHumanTicket(client, sender, body, config, userState) {
  const existing = ticketManager.getOpenTicketByCustomer(sender);
  const ticket = existing || ticketManager.createTicket(sender, 'Atendimento humano solicitado', body);
  if (!existing) { scheduleTicketEscalation(ticket); await notifyAdmins(client, `🆕 *NOVO CHAMADO*\nCliente: ${onlyDigits(sender)}\nTicket: ${ticket.id}\nAcesse o painel web para responder.`); }
  global.setUserState(sender, { ...userState, stage: 'human_support', ticketId: ticket.id });
  await client.sendMessage(sender, existing ? '✅ Seu chamado já está aberto. Envie os detalhes do que precisa.' : config.bot.mensagemSuporte);
}
function findProductByText(text) {
  const query = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (!query) return null;
  return getProducts().filter((p) => p.ativo !== false).find((p) => {
    const name = String(p.nome).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return query === name || query.includes(name) || name.includes(query.replace(/^comprar\s+/, ''));
  });
}

async function handleMessage(client, message) {
  if (message.fromMe || message.isStatus) return;
  const sender = message.from;
  const body = String(message.body || '').trim();
  const lowerBody = body.toLowerCase();
  const config = loadConfig();
  if (sender.endsWith('@g.us') && config.bot.ignorarGrupos !== false) return;
  const userState = global.getUserState(sender) || { stage: 'main_menu', chatHistory: [] };
  const senderDigits = onlyDigits(sender);

  if (['/meuid','/meu id','/id'].includes(lowerBody)) return client.sendMessage(sender, `Seu ID é:\n\`${senderDigits}\`\n\nVocê pode cadastrar esse número no painel em Configurações → Administradores.`);
  if (isUserAdmin(client, sender, config)) {
    if (lowerBody.startsWith('/presentes')) return handlePresentesCommand(client, message);
    if (lowerBody.startsWith('/disparos')) return handleDisparosCommand(client, message);
    if (lowerBody.startsWith('/upsell') || lowerBody.startsWith('/remarketing') || lowerBody.startsWith('/marketing')) return handleMarketingCommand(client, message);
    if (lowerBody === '/painel') { await client.sendMessage(sender, adminMenuText); global.setUserState(sender, { stage: 'admin_main_menu' }); return; }
    if (lowerBody.startsWith('/entregar')) {
      const parts = body.split(' para '); if (parts.length !== 2) return client.sendMessage(sender, 'Use: `/entregar ID_DO_PRODUTO para NUMERO`');
      const productId = parts[0].replace('/entregar', '').trim(); let customerNumber = parts[1].replace(/\D/g, ''); if (!customerNumber.endsWith('@c.us')) customerNumber = `${customerNumber}@c.us`;
      const product = getProductById(productId); if (!product) return client.sendMessage(sender, `❌ Produto \`${productId}\` não encontrado.`);
      const paymentId = `manual_entregar_${Date.now()}_${onlyDigits(customerNumber)}`; addPendingPayment(paymentId, customerNumber, product, { manualDelivery: true, adminSender: sender });
      const result = await fulfillApprovedPayment(client, paymentId, 'Entrega manual');
      return client.sendMessage(sender, result.ok ? `✅ Produto entregue para ${customerNumber}.` : `⚠️ Pedido salvo para atenção/retentativa. Código: ${paymentId}. Motivo: ${result.reason}`);
    }
    if (userState.stage?.startsWith('admin_')) return handleAdminMessage(client, message);
  }
  if (body.startsWith('/')) return client.sendMessage(sender, `🔒 Comando administrativo não autorizado. Seu ID: \`${senderDigits}\``);

  if (['sair','parar','cancelar mensagens','remover contato','não quero','nao quero'].includes(lowerBody)) {
    optOutLead(sender); cancelMarketingForContact(sender); const ticket = ticketManager.getOpenTicketByCustomer(sender); if (ticket) { ticketManager.updateTicket(ticket.id, { status: 'resolved' }, 'customer'); cancelTicketAutomation(ticket.id); }
    global.clearUserState(sender); return client.sendMessage(sender, '✅ Você foi removido das mensagens promocionais. Para autorizar novamente, envie *RECEBER*.');
  }
  if (['receber','entrar','ativar mensagens','quero receber'].includes(lowerBody)) {
    optInLead(sender);
    const funnel = funnelManager.loadFunnel();
    if (funnel.enabled && (userState.stage === 'gift_funnel' || crmManager.getLead(sender)?.tags?.includes('presentes-gratis'))) scheduleGiftNurture(sender, funnel);
    return client.sendMessage(sender, '✅ Autorização registrada. Você pode cancelar a qualquer momento enviando *SAIR*. Digite *MENU* para ver as opções.');
  }
  registerLeadInteraction(sender);

  if (await handleGiftFunnelMessage(client, message, config, userState)) return;

  if (['atendente','humano','falar com atendente','falar com humano','suporte humano'].includes(lowerBody)) return openHumanTicket(client, sender, body, config, userState);
  if (['voltar ao bot','encerrar suporte'].includes(lowerBody)) { const ticket = ticketManager.getOpenTicketByCustomer(sender); if (ticket) { ticketManager.updateTicket(ticket.id, { status: 'resolved' }, 'customer'); cancelTicketAutomation(ticket.id); } global.clearUserState(sender); return client.sendMessage(sender, '✅ Atendimento encerrado. Digite *MENU* para continuar.'); }
  if (userState.stage === 'human_support') { const ticket = userState.ticketId ? ticketManager.getTicket(userState.ticketId) : ticketManager.getOpenTicketByCustomer(sender); if (ticket) ticketManager.addMessage(ticket.id, 'customer', body); await client.sendMessage(sender, '✅ Mensagem adicionada ao chamado. Para encerrar, envie *VOLTAR AO BOT*.'); await notifyAdmins(client, `💬 Suporte de ${senderDigits}:\n${body.slice(0, 500)}`); return; }

  if (lowerBody === 'termos') return client.sendMessage(sender, config.bot.termosDeCompra);
  if (lowerBody === 'produtos' || lowerBody === 'catalogo' || lowerBody === 'catálogo') return sendCategories(client, sender, userState);
  if (['menu','comprar','voltar','inicio','início','oi','ola','olá','bom dia','boa tarde','boa noite'].includes(lowerBody)) { global.clearUserState(sender); await client.sendMessage(sender, getMainMenuText(config)); global.setUserState(sender, { stage: 'main_menu', chatHistory: [] }); return; }

  const directProduct = lowerBody.startsWith('comprar ') ? findProductByText(lowerBody) : null;
  if (directProduct) return showProduct(client, sender, config, directProduct, userState);
  if (['renovar','quero','continuar compra'].includes(lowerBody)) { const lead = crmManager.getLead(sender); const product = getProductById(lead?.ultimoProdutoId); return product ? showProduct(client, sender, config, product, userState) : client.sendMessage(sender, 'Não encontrei um produto anterior. Digite *MENU*.'); }
  if (['oferta','upgrade','ver oferta'].includes(lowerBody)) { const lead = crmManager.getLead(sender); const purchased = getProductById(lead?.ultimoProdutoId); const offer = purchased?.upsellProductId ? getProductById(purchased.upsellProductId) : null; return offer ? showProduct(client, sender, config, offer, userState) : client.sendMessage(sender, 'Digite *PRODUTOS* para ver as ofertas disponíveis.'); }

  try {
    switch (userState.stage) {
      case 'main_menu': {
        const featured = getFeaturedProducts(); const choice = parseInt(body, 10);
        if (!Number.isNaN(choice) && choice >= 1 && choice <= featured.length) return showProduct(client, sender, config, featured[choice - 1], userState);
        if (choice === featured.length + 1) return sendCategories(client, sender, userState);
        const giftsFunnel = funnelManager.loadFunnel();
        if ((giftsFunnel.enabled || config.bot.linkPresentes) && choice === featured.length + 2) {
          if (giftsFunnel.enabled) return enterGiftFunnel(client, sender, config, userState);
          return client.sendMessage(sender, `🎁 Acesse os materiais aqui:\n${config.bot.linkPresentes}`);
        }
        if (body === '0') return openHumanTicket(client, sender, body, config, userState);
        break;
      }
      case 'selecting_category': {
        if (body === '0') { global.clearUserState(sender); return client.sendMessage(sender, getMainMenuText(config)); }
        const categories = userState.categoriesInView || []; const choice = parseInt(body, 10); if (Number.isNaN(choice) || choice < 1 || choice > categories.length) return client.sendMessage(sender, 'Opção inválida. Escolha uma categoria da lista.');
        const products = getProductsByCategory(categories[choice - 1].id); let text = `📂 *${categories[choice - 1].nome}*\n\n`;
        products.forEach((p, i) => { text += `*${i + 1}* — *${p.nome}*\n${p.descricaoCurta || p.descricao.slice(0, 120)}\n${money(p.preco, config.vendas.simboloMoeda)}\n\n`; }); text += '*0* — Voltar';
        await client.sendMessage(sender, text); global.setUserState(sender, { ...userState, stage: 'selecting_product', productsInView: products }); return;
      }
      case 'selecting_product': {
        if (body === '0') return sendCategories(client, sender, userState);
        const products = userState.productsInView || []; const choice = parseInt(body, 10); if (Number.isNaN(choice) || choice < 1 || choice > products.length) return client.sendMessage(sender, 'Opção inválida.');
        return showProduct(client, sender, config, getProductById(products[choice - 1].id), userState);
      }
      case 'product_details': {
        const product = getProductById(userState.productId) || userState.product;
        if (!product) { global.clearUserState(sender); return client.sendMessage(sender, 'Produto não encontrado. Digite *MENU*.'); }
        if (body === '1' || lowerBody === 'comprar agora' || lowerBody === String(product.ctaTexto || '').toLowerCase()) return sendPaymentOptionsForProduct(client, sender, config, product, userState);
        if (body === '2' || lowerBody === 'faq') return client.sendMessage(sender, formatFaq(product));
        if (body === '3' || lowerBody === 'duvida' || lowerBody === 'dúvida') { global.setUserState(sender, { ...userState, stage: 'talking_to_ai', productId: product.id }); return client.sendMessage(sender, `Pode perguntar sobre *${product.nome}*. Vou responder usando as informações cadastradas.`); }
        if (body === '4') return sendCategories(client, sender, userState);
        if (body === '0') return openHumanTicket(client, sender, body, config, userState);
        return client.sendMessage(sender, 'Escolha: *1 comprar*, *2 perguntas*, *3 tirar dúvida*, *4 catálogo* ou *0 atendente*.');
      }
      case 'selecting_payment': {
        if (body === '0') return showProduct(client, sender, config, getProductById(userState.productId), userState);
        const options = userState.paymentOptionsInView || []; const choice = parseInt(body, 10); if (Number.isNaN(choice) || choice < 1 || choice > options.length) return client.sendMessage(sender, 'Escolha uma forma de pagamento da lista.');
        const selected = options[choice - 1]; const product = getProductById(userState.productId) || userState.product;
        await client.sendMessage(sender, '⏳ Gerando seu pagamento com segurança...');
        let paymentData;
        if (selected.id === 'mp') paymentData = await createMercadoPagoPix(product, sender);
        else if (selected.id === 'pushinpay') paymentData = await createPushinPayPix(product, sender);
        else { paymentData = await generatePix(config.pagamentos.pixManual.chavePix, product.preco, config.bot.nome); if (paymentData) { const id = `manual_${Date.now()}_${senderDigits}`; addPendingPayment(id, sender, product, { manual: true }); paymentData.paymentId = id; } }
        if (paymentData?.qrCodeBase64) {
          registerCheckout(sender, product); const media = new MessageMedia('image/png', paymentData.qrCodeBase64, 'pix.png');
          await client.sendMessage(sender, media, { caption: `✅ PIX gerado para ${product.nome}` }); await client.sendMessage(sender, `*PIX Copia e Cola:*\n\n${paymentData.pixCopyPaste}`);
          if (selected.id === 'pix') await client.sendMessage(sender, '⚠️ Após pagar, envie o comprovante ou aguarde a confirmação da equipe.');
          if (paymentData.paymentId) scheduleCheckoutAutomation(paymentData.paymentId, sender, product, paymentData.pixCopyPaste || '');
        } else await client.sendMessage(sender, '❌ Não foi possível gerar o pagamento. Digite *MENU* e tente novamente ou fale com *ATENDENTE*.');
        global.clearUserState(sender); return;
      }
      case 'talking_to_ai': return loadAiConfig().iaAtiva ? getAiResponse(client, message) : client.sendMessage(sender, 'A IA ainda não está configurada. Digite *ATENDENTE*.');
      default: break;
    }
    if (loadAiConfig().iaAtiva) return getAiResponse(client, message);
    return client.sendMessage(sender, 'Não entendi. Digite *MENU* para ver as opções ou *ATENDENTE* para falar com uma pessoa.');
  } catch (error) {
    console.error('Erro no fluxo de vendas:', error); global.clearUserState(sender); return client.sendMessage(sender, 'Ocorreu um erro temporário. Digite *MENU* para recomeçar.');
  }
}
module.exports = { handleMessage, formatProductPresentation, showProduct };
