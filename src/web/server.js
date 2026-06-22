const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const QRCode = require('qrcode');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const runtimeState = require('../core/runtimeState');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const databaseManager = require('../utils/databaseManager');
const productManager = require('../utils/productManager');
const stockManager = require('../utils/stockManager');
const orderManager = require('../utils/orderManager');
const ticketManager = require('../utils/ticketManager');
const crmManager = require('../utils/crmManager');
const configManager = require('../utils/configManager');
const aiConfigManager = require('../utils/aiConfigManager');
const backupManager = require('../utils/backupManager');
const automationManager = require('../utils/automationManager');
const setupManager = require('../utils/setupManager');
const integrationManager = require('../utils/integrationManager');
const funnelManager = require('../utils/funnelManager');
const { importLeads, parseCsv } = require('../utils/leadImportManager');
const { getSecret } = require('../utils/secretManager');
const { listAudit, logAudit } = require('../utils/auditLogger');
const { fulfillApprovedPayment } = require('../services/paymentProcessor');
const { getMercadoPagoPaymentStatus } = require('../services/mercadoPago');
const { getPushinPayPaymentStatus } = require('../services/pushinpay');
const { processDueJobs, cancelTicketAutomation } = require('../services/automationEngine');
const { runMonitor } = require('../services/systemMonitor');
const { validateWebhook, safeEqual } = require('../utils/webhookSecurity');
const disparosService = require('../services/disparosService');
const marketingService = require('../services/marketingService');

const ROOT = path.resolve(__dirname, '../..');
const campaignFiles = {
  agenda: path.join(ROOT, 'agenda.json'),
  groups: path.join(ROOT, 'grupos.json'),
  disparos: path.join(ROOT, 'disparos.json'),
  marketing: path.join(ROOT, 'marketing.json')
};
function asyncRoute(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); }
function cleanUrl(value) { return String(value || '').trim().replace(/\/+$/, ''); }
function publicBase(req) { return cleanUrl(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`); }
function evolutionConfig() {
  const evo = integrationManager.loadIntegrations().whatsapp.evolution;
  const apiKey = getSecret('evolutionApiKey');
  if (!evo.baseUrl || !evo.instance || !apiKey) throw new Error('Informe URL, instância e API Key da Evolution API.');
  return { ...evo, apiKey };
}
function evoRequest(method, endpoint, data) {
  const cfg = evolutionConfig();
  return axios({ method, url: `${cleanUrl(cfg.baseUrl)}${endpoint}`, data, timeout: 20000, headers: { apikey: cfg.apiKey, 'content-type': 'application/json' } });
}
function productTemplate(type = 'digital_products') {
  const templates = {
    digital_products: { category: 'Produtos digitais', product: { nome: 'Seu produto digital', preco: 29.9, descricaoCurta: 'Uma solução prática para alcançar um resultado específico.', descricao: 'Explique o problema que o produto resolve, como funciona e qual transformação o cliente pode esperar.', beneficios: ['Acesso rápido', 'Passo a passo simples', 'Suporte conforme a oferta'], inclui: ['Acesso ao produto', 'Tutorial de uso'], publicoAlvo: 'Pessoas que desejam resolver o problema descrito na oferta.', garantia: 'Cadastre aqui as condições reais da sua oferta.', ctaTexto: 'QUERO GARANTIR', deliveryType: 'stock', ativo: true, entregaAutomatica: true } },
    services: { category: 'Serviços', product: { nome: 'Serviço personalizado', preco: 197, descricaoCurta: 'Atendimento profissional adaptado à necessidade do cliente.', descricao: 'Descreva o diagnóstico, as etapas do serviço, o prazo e o resultado esperado.', beneficios: ['Atendimento personalizado', 'Execução profissional', 'Acompanhamento'], inclui: ['Diagnóstico', 'Execução conforme escopo', 'Suporte'], publicoAlvo: 'Empresas ou pessoas que precisam deste serviço.', garantia: 'Defina escopo, prazo e condições antes da compra.', ctaTexto: 'QUERO CONTRATAR', deliveryType: 'manual', ativo: true, entregaAutomatica: false } },
    local_business: { category: 'Serviços locais', product: { nome: 'Atendimento / Agendamento', preco: 50, descricaoCurta: 'Atendimento local com data e condições combinadas.', descricao: 'Explique localização, duração, disponibilidade e o que está incluído.', beneficios: ['Atendimento próximo', 'Agendamento simples', 'Informações claras'], inclui: ['Reserva ou serviço descrito'], publicoAlvo: 'Clientes da sua região.', garantia: 'Sujeito à disponibilidade de agenda.', ctaTexto: 'QUERO AGENDAR', deliveryType: 'manual', ativo: true, entregaAutomatica: false } },
    education: { category: 'Cursos e treinamentos', product: { nome: 'Treinamento completo', preco: 97, descricaoCurta: 'Aprenda com um método organizado e prático.', descricao: 'Explique módulos, nível, duração e resultado do treinamento.', beneficios: ['Conteúdo organizado', 'Aprendizado passo a passo', 'Acesso ao material'], inclui: ['Aulas', 'Materiais', 'Suporte conforme o plano'], publicoAlvo: 'Iniciantes e pessoas que desejam evoluir no tema.', garantia: 'Informe as condições reais de acesso e reembolso.', ctaTexto: 'QUERO APRENDER', deliveryType: 'link', ativo: true, entregaAutomatica: true } },
    agency: { category: 'Soluções profissionais', product: { nome: 'Projeto profissional', preco: 497, descricaoCurta: 'Solução planejada para acelerar seu negócio.', descricao: 'Apresente diagnóstico, escopo, entregáveis, prazo e diferenciais.', beneficios: ['Estratégia personalizada', 'Execução especializada', 'Acompanhamento'], inclui: ['Planejamento', 'Implementação', 'Relatório ou entrega final'], publicoAlvo: 'Negócios que buscam crescimento e profissionalização.', garantia: 'O resultado depende do escopo e da colaboração do cliente.', ctaTexto: 'QUERO UMA PROPOSTA', deliveryType: 'manual', ativo: true, entregaAutomatica: false } },
    subscription: { category: 'Planos', product: { nome: 'Plano mensal', preco: 49.9, descricaoCurta: 'Acesso recorrente com renovação simplificada.', descricao: 'Explique recursos, limites, suporte e regras de renovação.', beneficios: ['Acesso contínuo', 'Atualizações', 'Suporte do plano'], inclui: ['Acesso por 30 dias', 'Recursos descritos'], publicoAlvo: 'Clientes que desejam acesso contínuo.', garantia: 'Acesso válido pelo período contratado.', ctaTexto: 'QUERO ASSINAR', deliveryType: 'stock', validityDays: 30, ativo: true, entregaAutomatica: true } },
    ecommerce: { category: 'Loja', product: { nome: 'Produto da loja', preco: 99.9, descricaoCurta: 'Produto com informações claras, benefícios e condições de entrega.', descricao: 'Explique material, tamanho, variações, uso, prazo, frete e diferenciais.', beneficios: ['Compra orientada', 'Detalhes antes do pagamento', 'Acompanhamento do pedido'], inclui: ['Produto descrito na oferta'], publicoAlvo: 'Clientes que procuram este tipo de produto.', garantia: 'Informe troca, devolução e garantia reais.', ctaTexto: 'QUERO COMPRAR', deliveryType: 'manual', ativo: true, entregaAutomatica: false } },
    restaurant: { category: 'Cardápio', product: { nome: 'Combo especial', preco: 39.9, descricaoCurta: 'Pedido completo com itens e adicionais descritos.', descricao: 'Informe ingredientes, tamanho, serve quantas pessoas, adicionais, entrega e horário.', beneficios: ['Pedido rápido', 'Itens claros', 'Atendimento pelo WhatsApp'], inclui: ['Itens do combo'], publicoAlvo: 'Clientes na área de atendimento.', garantia: 'Sujeito à disponibilidade e área de entrega.', ctaTexto: 'FAZER PEDIDO', deliveryType: 'manual', ativo: true, entregaAutomatica: false } },
    beauty: { category: 'Procedimentos', product: { nome: 'Procedimento / sessão', preco: 120, descricaoCurta: 'Atendimento com avaliação, benefícios e agendamento.', descricao: 'Explique procedimento, duração, cuidados, contraindicações e resultado esperado sem promessas irreais.', beneficios: ['Avaliação orientada', 'Agendamento simples', 'Informações claras'], inclui: ['Sessão conforme descrição'], publicoAlvo: 'Pessoas elegíveis após avaliação.', garantia: 'Resultados variam e dependem de avaliação.', ctaTexto: 'QUERO AGENDAR', deliveryType: 'manual', ativo: true, entregaAutomatica: false } },
    health: { category: 'Atendimentos', product: { nome: 'Consulta / atendimento', preco: 150, descricaoCurta: 'Atendimento profissional com horário agendado.', descricao: 'Explique especialidade, formato, duração e preparo. Não prometa diagnóstico automático.', beneficios: ['Orientação profissional', 'Agendamento organizado', 'Suporte de atendimento'], inclui: ['Atendimento conforme descrição'], publicoAlvo: 'Pessoas que precisam deste atendimento.', garantia: 'Sujeito à avaliação profissional e disponibilidade.', ctaTexto: 'QUERO AGENDAR', deliveryType: 'manual', ativo: true, entregaAutomatica: false } },
    real_estate: { category: 'Imóveis', product: { nome: 'Imóvel em destaque', preco: 0, descricaoCurta: 'Opção de imóvel com localização, características e condições.', descricao: 'Informe região, quartos, metragem, diferenciais, valores e disponibilidade.', beneficios: ['Triagem rápida', 'Informações organizadas', 'Agendamento de visita'], inclui: ['Atendimento e apresentação do imóvel'], publicoAlvo: 'Compradores ou locatários com perfil compatível.', garantia: 'Disponibilidade e valores sujeitos a confirmação.', ctaTexto: 'QUERO SABER MAIS', deliveryType: 'manual', ativo: true, entregaAutomatica: false } },
    automotive: { category: 'Veículos e serviços', product: { nome: 'Veículo / serviço', preco: 0, descricaoCurta: 'Informações completas para comparação e atendimento.', descricao: 'Informe modelo, ano, condição, itens, serviço, prazo e condições.', beneficios: ['Atendimento rápido', 'Detalhes organizados', 'Agendamento'], inclui: ['Item ou serviço descrito'], publicoAlvo: 'Clientes interessados neste veículo ou serviço.', garantia: 'Condições sujeitas a vistoria e confirmação.', ctaTexto: 'QUERO NEGOCIAR', deliveryType: 'manual', ativo: true, entregaAutomatica: false } },
    events: { category: 'Pacotes', product: { nome: 'Pacote para evento', preco: 500, descricaoCurta: 'Pacote com estrutura, duração e entregáveis definidos.', descricao: 'Informe data, local, quantidade, duração, equipe, equipamentos e prazo.', beneficios: ['Planejamento organizado', 'Pacote claro', 'Atendimento personalizado'], inclui: ['Itens listados no pacote'], publicoAlvo: 'Pessoas ou empresas organizando eventos.', garantia: 'Data sujeita à disponibilidade e contrato.', ctaTexto: 'QUERO ORÇAMENTO', deliveryType: 'manual', ativo: true, entregaAutomatica: false } },
    custom: { category: 'Produtos e serviços', product: { nome: 'Sua oferta principal', preco: 0, descricaoCurta: 'Explique de forma simples o principal benefício da sua oferta.', descricao: 'Descreva problema, solução, funcionamento, prazo e resultado esperado.', beneficios: ['Benefício principal', 'Atendimento organizado'], inclui: ['O que o cliente recebe'], publicoAlvo: 'Seu público ideal.', garantia: 'Cadastre condições verdadeiras.', ctaTexto: 'QUERO SABER MAIS', deliveryType: 'manual', ativo: true, entregaAutomatica: false } }
  };
  return templates[type] || templates.digital_products;
}

function startWebServer() {
  const app = express();
  const port = Number(process.env.PORT || 80);
  const username = process.env.PANEL_USERNAME || 'admin';
  const password = process.env.PANEL_PASSWORD || 'troque-esta-senha';
  const sessionSecret = process.env.SESSION_SECRET || crypto.createHash('sha256').update(`jetbot-${process.cwd()}`).digest('hex');
  if (password === 'troque-esta-senha') console.warn('⚠️ Altere PANEL_PASSWORD antes de publicar o painel.');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'https:'], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"], connectSrc: ["'self'"] } } }));
  app.use(compression());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: false, limit: '5mb' }));
  app.use(session({ name: 'jetbot.sid', secret: sessionSecret, resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 12 * 60 * 60 * 1000 } }));
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
  const webhookLimiter = rateLimit({ windowMs: 60 * 1000, limit: 180, standardHeaders: true, legacyHeaders: false });
  const importLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
  const auth = (req, res, next) => req.session?.authenticated ? next() : res.status(401).json({ error: 'Não autenticado.' });
  const csrf = (req, res, next) => ['GET','HEAD','OPTIONS'].includes(req.method) || ['jetbot-panel','jetflix-panel'].includes(req.get('x-requested-with')) ? next() : res.status(403).json({ error: 'Requisição bloqueada.' });

  app.post('/api/auth/login', loginLimiter, (req, res) => {
    if (safeEqual(req.body.username, username) && safeEqual(req.body.password, password)) { req.session.authenticated = true; req.session.user = username; logAudit('panel.login', {}, username); return res.json({ ok: true, user: username }); }
    logAudit('panel.login_failed', { username: String(req.body.username || '').slice(0, 80), ip: req.ip }, 'anonymous'); return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  });
  app.post('/api/auth/logout', auth, csrf, (req, res) => req.session.destroy(() => res.json({ ok: true })));
  app.get('/api/auth/me', (req, res) => res.json({ authenticated: Boolean(req.session?.authenticated), user: req.session?.user || '' }));

  app.get('/api/setup', auth, (req, res) => res.json({ ...setupManager.status(), config: configManager.getPublicConfig(), integrations: integrationManager.publicIntegrations(), templates: Object.keys(configManager.templates) }));
  app.put('/api/setup', auth, csrf, (req, res) => res.json(setupManager.saveSetup(req.body)));
  app.post('/api/setup/template', auth, csrf, (req, res) => res.json(configManager.applyTemplate(req.body.type, req.body.brand, req.session.user)));
  app.post('/api/setup/first-product', auth, csrf, (req, res) => {
    const template = productTemplate(req.body.type); const categoryId = databaseManager.addCategory(req.body.category || template.category, req.session.user);
    const id = databaseManager.addProduct({ ...template.product, ativo: false, ...(req.body.product || {}), categoriaId }, req.session.user);
    if (req.body.stock) stockManager.addStock(id, req.body.stock, req.session.user);
    return res.status(201).json(productManager.getProductById(id));
  });
  app.post('/api/setup/complete', auth, csrf, (req, res) => { const result = setupManager.complete(); return result.ready ? res.json(result) : res.status(409).json({ ...result, error: 'Finalize marca, administrador, provedor, conexão do WhatsApp, produto com explicação, pagamento e automação.' }); });

  app.get('/api/status', auth, (req, res) => res.json(runtimeState.getPublicState()));
  app.get('/api/dashboard', auth, (req, res) => {
    const products = productManager.getProducts();
    res.json({ runtime: runtimeState.getPublicState(), setup: setupManager.status(), orders: orderManager.orderStats(), tickets: ticketManager.ticketStats(), leads: crmManager.leadStats(), automations: automationManager.queueStats(), alerts: automationManager.listAlerts({ status: 'open', limit: 20 }), health: automationManager.getHealth(), funnel: funnelManager.loadFunnel(), products: { total: products.length, active: products.filter((p) => p.ativo !== false).length, outOfStock: products.filter((p) => p.deliveryType === 'stock' && p.estoque <= 0).length, stock: products.reduce((n, p) => n + Number(p.estoque || 0), 0) } });
  });

  app.get('/api/categories', auth, (req, res) => res.json(productManager.getCategories()));
  app.post('/api/categories', auth, csrf, (req, res) => { const id = databaseManager.addCategory(req.body.nome, req.session.user); return id ? res.status(201).json({ id }) : res.status(400).json({ error: 'Nome inválido.' }); });
  app.put('/api/categories/:id', auth, csrf, (req, res) => { const item = databaseManager.updateCategory(req.params.id, req.body, req.session.user); return item ? res.json(item) : res.status(404).json({ error: 'Categoria não encontrada.' }); });
  app.delete('/api/categories/:id', auth, csrf, (req, res) => { const ids = databaseManager.deleteCategory(req.params.id, req.session.user); ids.forEach((id) => stockManager.deleteStockForProduct(id, req.session.user)); res.json({ ok: true, deletedProducts: ids.length }); });
  app.get('/api/product-template/:type', auth, (req, res) => res.json(productTemplate(req.params.type)));
  app.get('/api/products', auth, (req, res) => res.json(productManager.getProducts()));
  app.post('/api/products', auth, csrf, (req, res) => { const id = databaseManager.addProduct(req.body, req.session.user); if (!id) return res.status(400).json({ error: 'Dados inválidos.' }); if (req.body.stock) stockManager.addStock(id, req.body.stock, req.session.user); return res.status(201).json(productManager.getProductById(id)); });
  app.put('/api/products/:id', auth, csrf, (req, res) => { const item = databaseManager.updateProduct(req.params.id, req.body, req.session.user); return item ? res.json(productManager.getProductById(req.params.id)) : res.status(404).json({ error: 'Produto não encontrado.' }); });
  app.delete('/api/products/:id', auth, csrf, (req, res) => { if (!databaseManager.deleteProduct(req.params.id, req.session.user)) return res.status(404).json({ error: 'Produto não encontrado.' }); stockManager.deleteStockForProduct(req.params.id, req.session.user); return res.json({ ok: true }); });
  app.get('/api/products/:id/stock', auth, (req, res) => res.json({ items: stockManager.listStockItems(req.params.id) }));
  app.post('/api/products/:id/stock', auth, csrf, (req, res) => { const items = Array.isArray(req.body.items) ? req.body.items : String(req.body.items || '').split('\n'); req.body.mode === 'replace' ? stockManager.setStock(req.params.id, items, req.session.user) : stockManager.addStock(req.params.id, items, req.session.user); res.json({ ok: true, count: stockManager.getStockCount(req.params.id) }); });

  app.get('/api/orders', auth, (req, res) => res.json(orderManager.listOrders(req.query)));
  app.post('/api/orders/:id/deliver', auth, csrf, asyncRoute(async (req, res) => { const order = orderManager.getOrder(req.params.id); if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' }); if (!runtimeState.getPublicState().whatsapp.connected) return res.status(409).json({ error: 'WhatsApp não conectado.' }); const result = await fulfillApprovedPayment(runtimeState.getClient(), order.paymentId, 'Confirmação manual'); return result.ok ? res.json(result) : res.status(409).json(result); }));
  app.put('/api/orders/:id', auth, csrf, (req, res) => { const item = orderManager.updateOrder(req.params.id, req.body, req.session.user); return item ? res.json(item) : res.status(404).json({ error: 'Pedido não encontrado.' }); });

  app.get('/api/leads', auth, (req, res) => res.json(crmManager.listLeads()));
  app.put('/api/leads/:id', auth, csrf, (req, res) => { const item = crmManager.updateLead(decodeURIComponent(req.params.id), req.body, req.session.user); return item ? res.json(item) : res.status(404).json({ error: 'Lead não encontrado.' }); });
  app.post('/api/leads/import', auth, csrf, (req, res) => { const items = req.body.csv ? parseCsv(req.body.csv) : req.body.items; res.json(importLeads(items, req.body.options || {}, req.session.user)); });

  app.options('/api/public/leads/import', (req, res) => { res.set({ 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-api-key' }); res.status(204).end(); });
  app.post('/api/public/leads/import', importLimiter, (req, res) => {
    res.set('access-control-allow-origin', '*');
    const provided = req.get('x-api-key') || req.query.token || req.body.token || '';
    if (!safeEqual(provided, integrationManager.ensureLeadToken())) return res.status(401).json({ error: 'Token inválido.' });
    const cfg = integrationManager.loadIntegrations().leadCapture;
    if (!cfg.enabled || !cfg.allowApi) return res.status(403).json({ error: 'Importação via API desativada.' });
    const items = req.body.csv ? parseCsv(req.body.csv) : req.body.items || req.body.contacts || [];
    return res.json(importLeads(items, { source: req.body.source || cfg.defaultSource, defaultConsent: cfg.defaultConsent, consentSource: req.body.consentSource }, 'lead-api'));
  });

  app.get('/api/tickets', auth, (req, res) => res.json(ticketManager.listTickets()));
  app.put('/api/tickets/:id', auth, csrf, (req, res) => { const item = ticketManager.updateTicket(req.params.id, req.body, req.session.user); if (item && ['resolved','cancelled'].includes(item.status)) cancelTicketAutomation(item.id); return item ? res.json(item) : res.status(404).json({ error: 'Chamado não encontrado.' }); });
  app.post('/api/tickets/:id/reply', auth, csrf, asyncRoute(async (req, res) => { const ticket = ticketManager.getTicket(req.params.id); if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado.' }); const text = String(req.body.text || '').trim(); if (!text) return res.status(400).json({ error: 'Mensagem vazia.' }); if (!runtimeState.getPublicState().whatsapp.connected) return res.status(409).json({ error: 'WhatsApp não conectado.' }); await runtimeState.getClient().sendMessage(ticket.customerPhone, text); ticketManager.addMessage(ticket.id, 'agent', text); const updated = ticketManager.updateTicket(ticket.id, { status: req.body.resolve ? 'resolved' : 'waiting_customer', assignedTo: req.session.user }, req.session.user); if (req.body.resolve) cancelTicketAutomation(ticket.id); return res.json(updated); }));

  app.get('/api/settings', auth, (req, res) => res.json(configManager.getPublicConfig()));
  app.put('/api/settings', auth, csrf, (req, res) => { configManager.updateSettings(req.body.config || req.body, req.body.secrets || {}, req.session.user); res.json(configManager.getPublicConfig()); });
  app.post('/api/settings/template', auth, csrf, (req, res) => res.json(configManager.applyTemplate(req.body.type, req.body.brand, req.session.user)));
  app.get('/api/ai', auth, (req, res) => res.json(aiConfigManager.getPublicAiConfig()));
  app.put('/api/ai', auth, csrf, (req, res) => { aiConfigManager.updateAiConfig(req.body.config || req.body, req.body.token || '', req.session.user); res.json(aiConfigManager.getPublicAiConfig()); });

  app.get('/api/integrations', auth, (req, res) => {
    const detected = publicBase(req); const current = integrationManager.loadIntegrations();
    if (!current.publicBaseUrl && detected && !/localhost|127\.0\.0\.1/i.test(detected)) { current.publicBaseUrl = detected; integrationManager.saveIntegrations(current, 'auto-detect'); }
    const config = integrationManager.publicIntegrations(); const base = config.publicBaseUrl || detected;
    res.json({ config, publicBaseUrl: base, leadEndpoint: `${base}/api/public/leads/import`, extensionUrl: `${base}/downloads/JetLeads_Connector.zip`, restartRequired: true });
  });
  app.put('/api/integrations', auth, csrf, (req, res) => res.json(integrationManager.updateIntegrations(req.body.config || req.body, req.body.secrets || {}, req.session.user)));
  app.post('/api/integrations/evolution/test', auth, csrf, asyncRoute(async (req, res) => { const { data } = await evoRequest('get', `/instance/connectionState/${encodeURIComponent(evolutionConfig().instance)}`); res.json({ ok: true, data }); }));
  app.get('/api/integrations/evolution/qr', auth, asyncRoute(async (req, res) => { const { data } = await evoRequest('get', `/instance/connect/${encodeURIComponent(evolutionConfig().instance)}`); const code = data?.code || data?.qrcode?.code || ''; const qrDataUrl = code ? await QRCode.toDataURL(code) : (data?.base64 || data?.qrcode?.base64 || ''); res.json({ ...data, qrDataUrl }); }));
  app.post('/api/integrations/evolution/create', auth, csrf, asyncRoute(async (req, res) => {
    const current = integrationManager.loadIntegrations(); const evo = current.whatsapp.evolution; const token = integrationManager.ensureEvolutionWebhookToken(); const url = `${cleanUrl(req.body.publicBaseUrl || publicBase(req))}/webhooks/evolution/${encodeURIComponent(evo.instance)}/${token}`;
    const payload = { instanceName: evo.instance, integration: 'WHATSAPP-BAILEYS', qrcode: true, groupsIgnore: true, alwaysOnline: true, readMessages: false, readStatus: false, syncFullHistory: false, webhook: { url, byEvents: false, base64: true, events: ['MESSAGES_UPSERT','CONNECTION_UPDATE','QRCODE_UPDATED'] } };
    const { data } = await evoRequest('post', '/instance/create', payload); res.status(201).json({ ok: true, data, webhookUrl: url });
  }));
  app.post('/api/integrations/evolution/configure-webhook', auth, csrf, asyncRoute(async (req, res) => {
    const cfg = integrationManager.loadIntegrations(); const evo = cfg.whatsapp.evolution; const token = integrationManager.ensureEvolutionWebhookToken(); const url = `${cleanUrl(req.body.publicBaseUrl || publicBase(req))}/webhooks/evolution/${encodeURIComponent(evo.instance)}/${token}`;
    const { data } = await evoRequest('post', `/webhook/set/${encodeURIComponent(evo.instance)}`, { enabled: true, url, webhookByEvents: false, webhookBase64: true, events: ['MESSAGES_UPSERT','CONNECTION_UPDATE','QRCODE_UPDATED'] });
    cfg.whatsapp.evolution.webhookConfigured = true; cfg.whatsapp.evolution.lastTestAt = new Date().toISOString(); integrationManager.saveIntegrations(cfg, req.session.user); res.json({ ok: true, data, webhookUrl: url });
  }));
  app.post('/api/integrations/test-message', auth, csrf, asyncRoute(async (req, res) => { if (!runtimeState.getPublicState().whatsapp.connected) return res.status(409).json({ error: 'WhatsApp não conectado.' }); const number = String(req.body.number || '').replace(/\D/g, ''); if (!number) return res.status(400).json({ error: 'Número inválido.' }); await runtimeState.getClient().sendMessage(`${number}@c.us`, req.body.text || '✅ Mensagem de teste enviada pelo painel.'); res.json({ ok: true }); }));

  app.get('/api/funnel', auth, (req, res) => {
    const config = funnelManager.loadFunnel(); const leads = crmManager.listLeads();
    const funnelLeads = leads.filter((lead) => lead.source === config.sourceTag || lead.origem === config.sourceTag || (lead.tags || []).includes('presentes-gratis'));
    const stats = { entered: funnelLeads.length, optedIn: funnelLeads.filter((x) => x.optIn === true).length, checkout: funnelLeads.filter((x) => x.stage === 'checkout').length, customers: funnelLeads.filter((x) => x.stage === 'customer').length };
    res.json({ config, groups: readJson(campaignFiles.groups, []), agenda: readJson(campaignFiles.agenda, { config: {}, dias: {} }), stats });
  });
  app.put('/api/funnel', auth, csrf, (req, res) => {
    const config = funnelManager.saveFunnel(req.body.config || req.body, req.session.user);
    if (Array.isArray(req.body.groups)) writeJson(campaignFiles.groups, req.body.groups);
    logAudit('funnel.panel.updated', { enabled: config.enabled, groups: Array.isArray(req.body.groups) ? req.body.groups.length : undefined }, req.session.user);
    res.json({ config, groups: readJson(campaignFiles.groups, []) });
  });
  app.post('/api/funnel/template', auth, csrf, (req, res) => {
    const brand = configManager.loadConfig().bot.nome || 'Sua marca';
    const config = funnelManager.applyTemplate(brand, req.session.user);
    const agenda = funnelManager.buildAgendaTemplate(brand, config);
    writeJson(campaignFiles.agenda, agenda);
    res.json({ config, agenda });
  });
  app.post('/api/funnel/generate-agenda', auth, csrf, (req, res) => {
    const config = funnelManager.saveFunnel(req.body.config || funnelManager.loadFunnel(), req.session.user);
    const agenda = funnelManager.buildAgendaTemplate(configManager.loadConfig().bot.nome || 'Sua marca', config);
    writeJson(campaignFiles.agenda, agenda);
    logAudit('funnel.agenda.generated', { giftsPerDay: config.groupWarmup.giftsPerDay, offersPerDay: config.groupWarmup.offersPerDay }, req.session.user);
    res.json({ ok: true, agenda });
  });

  app.get('/api/automation', auth, (req, res) => res.json({ config: automationManager.loadAutomationConfig(), stats: automationManager.queueStats(), jobs: automationManager.listJobs({ limit: req.query.limit || 300 }), alerts: automationManager.listAlerts({ limit: 200 }), health: automationManager.getHealth() }));
  app.put('/api/automation/config', auth, csrf, (req, res) => res.json(automationManager.saveAutomationConfig(req.body, req.session.user)));
  app.post('/api/automation/run', auth, csrf, asyncRoute(async (req, res) => res.json(await processDueJobs(runtimeState.getClient()))));
  app.post('/api/automation/monitor', auth, csrf, asyncRoute(async (req, res) => res.json(await runMonitor(runtimeState.getClient()))));
  app.post('/api/automation/jobs/:id/retry', auth, csrf, (req, res) => { const job = automationManager.rescheduleJob(req.params.id, new Date(), 'Reprocessamento manual.'); return job ? res.json(job) : res.status(404).json({ error: 'Tarefa não encontrada.' }); });
  app.post('/api/automation/jobs/:id/cancel', auth, csrf, (req, res) => { const job = automationManager.cancelJob(req.params.id, 'Cancelado pelo painel.'); return job ? res.json(job) : res.status(404).json({ error: 'Tarefa não encontrada.' }); });
  app.post('/api/automation/alerts/:id/resolve', auth, csrf, (req, res) => { const alert = automationManager.resolveAlert(req.params.id, req.session.user); return alert ? res.json(alert) : res.status(404).json({ error: 'Alerta não encontrado.' }); });

  app.get('/api/campaign-config', auth, (req, res) => res.json(Object.fromEntries(Object.entries(campaignFiles).map(([key, file]) => [key, readJson(file, key === 'groups' ? [] : {})]))));
  app.put('/api/campaign-config/:type', auth, csrf, (req, res) => { const file = campaignFiles[req.params.type]; if (!file) return res.status(404).json({ error: 'Configuração inválida.' }); writeJson(file, req.body); logAudit('campaign.config.updated', { type: req.params.type }, req.session.user); res.json({ ok: true }); });
  app.get('/api/campaigns', auth, (req, res) => res.json({ disparos: readJson(path.join(ROOT, 'data/disparos_state.json'), {}), marketing: readJson(path.join(ROOT, 'data/marketing_state.json'), {}), groups: readJson(campaignFiles.groups, []), agenda: readJson(campaignFiles.agenda, {}) }));
  app.post('/api/campaigns/disparos/start', auth, csrf, (req, res) => { if (!runtimeState.getPublicState().whatsapp.connected) return res.status(409).json({ error: 'WhatsApp não conectado.' }); try { res.json(disparosService.startCampaignFromPanel(runtimeState.getClient(), req.body.modelId, req.body.destination)); } catch (error) { res.status(409).json({ error: error.message }); } });
  app.post('/api/campaigns/disparos/pause', auth, csrf, (req, res) => { try { res.json(disparosService.pauseCampaignFromPanel()); } catch (error) { res.status(409).json({ error: error.message }); } });
  app.post('/api/campaigns/disparos/resume', auth, csrf, (req, res) => { try { res.json(disparosService.resumeCampaignFromPanel(runtimeState.getClient())); } catch (error) { res.status(409).json({ error: error.message }); } });
  app.post('/api/campaigns/disparos/cancel', auth, csrf, (req, res) => res.json(disparosService.cancelCampaignFromPanel()));
  app.post('/api/campaigns/remarketing/start', auth, csrf, (req, res) => { if (!runtimeState.getPublicState().whatsapp.connected) return res.status(409).json({ error: 'WhatsApp não conectado.' }); try { res.json(marketingService.startRemarketingFromPanel(runtimeState.getClient(), req.body.modelId, req.body.segment)); } catch (error) { res.status(409).json({ error: error.message }); } });
  app.post('/api/campaigns/remarketing/pause', auth, csrf, (req, res) => { try { res.json(marketingService.pauseRemarketingFromPanel()); } catch (error) { res.status(409).json({ error: error.message }); } });
  app.post('/api/campaigns/remarketing/resume', auth, csrf, (req, res) => { try { res.json(marketingService.resumeRemarketingFromPanel(runtimeState.getClient())); } catch (error) { res.status(409).json({ error: error.message }); } });
  app.post('/api/campaigns/remarketing/cancel', auth, csrf, (req, res) => res.json(marketingService.cancelRemarketingFromPanel()));

  app.post('/api/integrations/outbound/test', auth, csrf, asyncRoute(async (req, res) => {
    const cfg = integrationManager.loadIntegrations().outboundWebhook;
    if (!cfg.url) return res.status(400).json({ error: 'Informe a URL do webhook de saída.' });
    const secret = getSecret('outboundWebhookSecret');
    const payload = { event: 'integration.test', timestamp: new Date().toISOString(), source: 'JETBOT', data: { message: 'Teste de integração realizado com sucesso.' } };
    const { data, status } = await axios.post(cfg.url, payload, { timeout: Math.max(2000, Number(cfg.timeoutMs || 8000)), headers: { 'content-type': 'application/json', ...(secret ? { 'x-jetbot-secret': secret } : {}) } });
    res.json({ ok: true, status, response: data });
  }));
  app.post('/api/system/restart', auth, csrf, (req, res) => { logAudit('system.restart.requested', {}, req.session.user); res.json({ ok: true, message: 'Aplicação reiniciando.' }); setTimeout(() => process.exit(0), 800); });

  app.get('/api/backups', auth, (req, res) => res.json(backupManager.listBackups()));
  app.post('/api/backups', auth, csrf, (req, res) => res.status(201).json(backupManager.createBackup(req.session.user)));
  app.post('/api/backups/:filename/restore', auth, csrf, (req, res) => { try { backupManager.restoreBackup(req.params.filename, req.session.user); res.json({ ok: true, restartRecommended: true }); } catch (error) { res.status(400).json({ error: error.message }); } });
  app.get('/api/backups/:filename/download', auth, (req, res) => { const file = backupManager.getBackupPath(req.params.filename); return file ? res.download(file) : res.status(404).end(); });
  app.get('/api/audit', auth, (req, res) => res.json(listAudit(req.query.limit)));
  app.get('/api/diagnostics', auth, asyncRoute(async (req, res) => {
    const cfg = configManager.loadConfig(); const integrations = integrationManager.loadIntegrations(); const products = productManager.getProducts();
    const checks = [
      { id: 'panel', label: 'Painel web', ok: true },
      { id: 'brand', label: 'Marca configurada', ok: Boolean(cfg.bot.nome && !/SUA MARCA/i.test(cfg.bot.nome)) },
      { id: 'admin', label: 'Administrador cadastrado', ok: (cfg.bot.adminNumbers || []).length > 0 },
      { id: 'products', label: 'Produto ativo', ok: products.some((p) => p.ativo !== false) },
      { id: 'product-explanation', label: 'Produto explicado e pronto para entrega', ok: products.some(setupManager.productIsReady) },
      { id: 'payment', label: 'Pagamento ativo', ok: cfg.pagamentos.mercadoPago.ativo || cfg.pagamentos.pushinpay.ativo || cfg.pagamentos.pixManual.ativo },
      { id: 'funnel', label: 'Funil de presentes configurado ou desativado', ok: !funnelManager.loadFunnel().enabled || Boolean(funnelManager.loadFunnel().groupLink || funnelManager.loadFunnel().pageLink || funnelManager.loadFunnel().storeLink) },
      { id: 'whatsapp', label: `WhatsApp (${integrations.whatsapp.provider})`, ok: runtimeState.getPublicState().whatsapp.connected },
      { id: 'automation', label: 'Automação ativada', ok: automationManager.loadAutomationConfig().enabled !== false }
    ];
    res.json({ ok: checks.every((c) => c.ok), checks, runtime: runtimeState.getPublicState(), setup: setupManager.status() });
  }));

  app.get('/api/public/catalog', (req, res) => {
    const cfg = configManager.loadConfig();
    if (cfg.vendas.catalogoPublicoAtivo === false) return res.status(404).json({ error: 'Catálogo público desativado.' });
    const allowed = (product) => ({
      id: product.id, nome: product.nome, preco: product.preco, precoDe: product.precoDe,
      categoriaId: product.categoriaId, descricaoCurta: product.descricaoCurta, descricao: product.descricao,
      beneficios: product.beneficios || [], inclui: product.inclui || [], publicoAlvo: product.publicoAlvo,
      garantia: product.garantia, provaSocial: product.provaSocial, faq: product.faq || [], imagemUrl: product.imagemUrl,
      videoUrl: product.videoUrl, ctaTexto: product.ctaTexto, destaque: Boolean(product.destaque), validadeDias: product.validityDays || 0
    });
    const products = productManager.getProducts().filter((p) => p.ativo !== false).map(allowed);
    const categoryIds = new Set(products.map((p) => p.categoriaId));
    const categories = productManager.getCategories().filter((c) => categoryIds.has(c.id)).map(({ id, nome, ordem }) => ({ id, nome, ordem }));
    res.set('cache-control', 'public, max-age=60');
    res.json({ brand: { nome: cfg.bot.nome, logoUrl: cfg.bot.logoUrl || '', primaryColor: cfg.bot.primaryColor || '#00e676', catalogTitle: cfg.bot.catalogTitle, catalogSubtitle: cfg.bot.catalogSubtitle, whatsapp: cfg.bot.whatsappPublicNumber || '' }, categories, products });
  });

  app.post('/webhooks/evolution/:instance/:token', webhookLimiter, (req, res) => {
    if (!safeEqual(req.params.token, integrationManager.ensureEvolutionWebhookToken())) return res.status(401).json({ error: 'Token inválido.' });
    const configured = integrationManager.loadIntegrations().whatsapp.evolution.instance;
    if (configured && configured !== req.params.instance) return res.status(404).json({ error: 'Instância inválida.' });
    const client = runtimeState.getClient(); if (client?.handleWebhook) client.handleWebhook(req.body); logAudit('webhook.evolution', { event: req.body?.event || '', instance: req.params.instance }); res.json({ received: true });
  });
  app.post('/webhooks/mercadopago', webhookLimiter, asyncRoute(async (req, res) => { const validation = validateWebhook(req); if (!validation.ok) return res.status(validation.status).json({ error: validation.error }); const id = String(req.body?.data?.id || req.query?.['data.id'] || req.body?.id || ''); if (!id) return res.status(400).json({ error: 'Pagamento não identificado.' }); const status = String(await getMercadoPagoPaymentStatus(id)).toUpperCase(); if (status === 'APPROVED') await fulfillApprovedPayment(runtimeState.getClient(), id, 'Mercado Pago'); logAudit('webhook.mercadopago', { paymentId: id, status }); res.json({ received: true, status }); }));
  app.post('/webhooks/pushinpay', webhookLimiter, asyncRoute(async (req, res) => { const validation = validateWebhook(req); if (!validation.ok) return res.status(validation.status).json({ error: validation.error }); const raw = String(req.body?.id || req.body?.data?.id || req.body?.transaction_id || '').replace(/^pushinpay_/, ''); if (!raw) return res.status(400).json({ error: 'Pagamento não identificado.' }); const status = String(await getPushinPayPaymentStatus(raw)).toUpperCase(); if (['PAID','APPROVED','COMPLETED'].includes(status)) await fulfillApprovedPayment(runtimeState.getClient(), `pushinpay_${raw}`, 'PushinPay'); logAudit('webhook.pushinpay', { paymentId: raw, status }); res.json({ received: true, status }); }));

  app.get('/catalogo', (req, res) => res.sendFile(path.resolve(__dirname, 'public/catalogo.html')));
  app.use(express.static(path.resolve(__dirname, 'public')));
  app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'public/index.html')));
  app.use((error, req, res, next) => { console.error('[Painel]', error); if (res.headersSent) return next(error); res.status(500).json({ error: error.response?.data?.message || error.response?.data?.error || error.message || 'Erro interno.' }); });
  const server = app.listen(port, () => console.log(`🌐 JETBOT V7 disponível na porta ${port}`));
  return server;
}
module.exports = { startWebServer };
