const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const MARKETING_CONFIG_PATH = path.join(ROOT_DIR, 'marketing.json');
const LEADS_PATH = path.join(DATA_DIR, 'marketing_leads.json');
const DISPAROS_PATH = path.join(ROOT_DIR, 'disparos.json');
const STATE_PATH = path.join(DATA_DIR, 'marketing_state.json');
const automationManager = require('../utils/automationManager');
const { emitIntegrationEvent } = require('./integrationEvents');

const DEFAULT_CONFIG = {
    nomeSistema: 'JETBOT — Remarketing',
    timezone: 'America/Sao_Paulo',
    intervaloMinSegundos: 35,
    intervaloMaxSegundos: 90,
    limitePorCampanha: 150,
    cooldownHorasPorContato: 24,
    modoSeguro: true,
    linkPrincipal: '',
    cupomPadrao: '',
    upsell: {
        ativo: true,
        delaySegundos: 8,
        evitarRepetirPorHoras: 24,
        valorUpsell: 'R$ 97,00',
        produtoUpsell: 'Upgrade / Oferta especial Sua Marca',
    },
};

const DEFAULT_MARKETING = {
    config: DEFAULT_CONFIG,
    modelos: [
        {
            id: 'upsell-pos-compra',
            titulo: 'Upsell depois da compra',
            ativo: true,
            texto: '🎁 {{primeiroNome}}, seu acesso foi entregue com sucesso!\n\nTenho uma oferta especial para quem acabou de comprar: *{{produtoUpsell}}* por *{{valorUpsell}}*.\n\nEssa opção é ideal para vender mais, automatizar atendimento e aproveitar melhor o produto que você já pegou.\n\nResponda *UPGRADE* que eu te envio os detalhes.'
        },
        {
            id: 'remarketing-carrinho',
            titulo: 'Carrinho / PIX pendente',
            ativo: true,
            texto: 'Oi {{primeiroNome}}! Vi que você começou a compra de *{{produto}}*, mas ainda não finalizou.\n\nSe ainda quiser, posso te ajudar a concluir agora. Responda *QUERO* ou digite *menu* para gerar novamente.'
        },
        {
            id: 'remarketing-clientes',
            titulo: 'Clientes que já compraram',
            ativo: true,
            texto: '🔥 Oi {{primeiroNome}}! Passando para liberar uma condição especial para clientes Sua Marca.\n\nComo você já pegou *{{produto}}*, posso te mostrar um upgrade/oferta que combina com seu perfil.\n\nResponda *OFERTA* que eu te mando.'
        },
        {
            id: 'remarketing-leads',
            titulo: 'Leads que chamaram no bot',
            ativo: true,
            texto: '🎁 Oi {{primeiroNome}}! Separei uma oportunidade da Sua Marca para você.\n\nAcesse: {{link}}\n\nOu responda *MENU* para ver as opções disponíveis.'
        }
    ]
};

let isProcessing = false;
let paused = false;
let cancelled = false;

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        const raw = fs.readFileSync(filePath, 'utf8').trim();
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (error) {
        console.error(`[Marketing] Erro ao ler ${filePath}:`, error.message);
        return fallback;
    }
}

function writeJson(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // CORREÇÃO: escrita atômica via arquivo temporário + renomeação.
    // fs.renameSync é atômico no Linux (Square Cloud), garantindo que uma leitura
    // concorrente nunca veja o arquivo pela metade caso o processo seja interrompido.
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmpPath, filePath);
}

function mergeConfig(config) {
    return {
        ...DEFAULT_CONFIG,
        ...(config || {}),
        upsell: {
            ...DEFAULT_CONFIG.upsell,
            ...((config && config.upsell) || {}),
        },
    };
}

function loadMarketing() {
    const data = readJson(MARKETING_CONFIG_PATH, null);
    if (!data) {
        writeJson(MARKETING_CONFIG_PATH, DEFAULT_MARKETING);
        return JSON.parse(JSON.stringify(DEFAULT_MARKETING));
    }

    data.config = mergeConfig(data.config);
    if (!Array.isArray(data.modelos)) data.modelos = DEFAULT_MARKETING.modelos;
    return data;
}

function saveMarketing(data) {
    data.config = mergeConfig(data.config);
    writeJson(MARKETING_CONFIG_PATH, data);
}

function loadLeads() {
    ensureDataDir();
    return readJson(LEADS_PATH, []);
}

function saveLeads(leads) {
    ensureDataDir();
    writeJson(LEADS_PATH, Array.isArray(leads) ? leads : []);
}

function loadState() {
    ensureDataDir();
    return readJson(STATE_PATH, {
        status: 'idle',
        campanhaId: null,
        modeloId: null,
        segmento: null,
        total: 0,
        enviados: 0,
        falhas: 0,
        pulados: 0,
        indiceAtual: 0,
        iniciadaEm: null,
        atualizadaEm: null,
        ultimoErro: null,
        logs: [],
        fila: [],
    });
}

function saveState(state) {
    ensureDataDir();
    state.atualizadaEm = new Date().toISOString();
    if (Array.isArray(state.logs) && state.logs.length > 300) state.logs = state.logs.slice(-300);
    writeJson(STATE_PATH, state);
}

function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return null;
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
    if (withCountry.length < 12 || withCountry.length > 14) return null;
    return `${withCountry}@c.us`;
}

function phoneFromChatId(chatId) {
    const normalized = String(chatId || '').replace('@c.us', '').replace('@g.us', '');
    return normalized.replace(/\D/g, '');
}

function sanitizeName(name, fallback = 'amigo') {
    const cleaned = String(name || '').trim();
    return cleaned || fallback;
}

function nowIso() {
    return new Date().toISOString();
}

function getNowText(timezone) {
    const now = new Date();
    const data = new Intl.DateTimeFormat('pt-BR', {
        timeZone: timezone || 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(now);
    const hora = new Intl.DateTimeFormat('pt-BR', {
        timeZone: timezone || 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(now);
    return { data, hora };
}

function hoursSince(iso) {
    if (!iso) return Infinity;
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return Infinity;
    return (Date.now() - then) / 36e5;
}

function getDisplayNameFromChatId(chatId) {
    const phone = phoneFromChatId(chatId);
    return phone ? `Cliente ${phone.slice(-4)}` : 'amigo';
}

function findLeadIndex(leads, chatId) {
    const phone = phoneFromChatId(chatId);
    return leads.findIndex(lead => phoneFromChatId(lead.chatId || lead.telefone) === phone);
}

function upsertLead(chatId, patch = {}) {
    const normalizedChatId = normalizePhone(chatId) || chatId;
    if (!String(normalizedChatId || '').endsWith('@c.us')) return null;

    const leads = loadLeads();
    const index = findLeadIndex(leads, normalizedChatId);
    const existing = index >= 0 ? leads[index] : null;
    const existingOptOut = existing && existing.optIn === false;
    const forcedOptIn = patch.forceOptIn === true;

    const lead = {
        id: existing?.id || `lead_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
        chatId: normalizedChatId,
        telefone: phoneFromChatId(normalizedChatId),
        nome: sanitizeName(patch.nome || existing?.nome || getDisplayNameFromChatId(normalizedChatId)),
        status: patch.status || existing?.status || 'lead',
        ativo: patch.ativo !== undefined ? patch.ativo : (existing?.ativo !== undefined ? existing.ativo : true),
        optIn: forcedOptIn ? true : (existingOptOut ? false : (patch.optIn !== undefined ? patch.optIn : (existing?.optIn !== undefined ? existing.optIn : false))),
        origem: patch.origem || existing?.origem || 'whatsapp',
        tags: Array.from(new Set([...(existing?.tags || []), ...((patch.tags || []))])),
        primeiroContatoEm: existing?.primeiroContatoEm || nowIso(),
        ultimaInteracaoEm: patch.ultimaInteracaoEm || nowIso(),
        ultimoProdutoId: patch.ultimoProdutoId !== undefined ? patch.ultimoProdutoId : existing?.ultimoProdutoId,
        ultimoProdutoNome: patch.ultimoProdutoNome !== undefined ? patch.ultimoProdutoNome : existing?.ultimoProdutoNome,
        ultimoCheckoutEm: patch.ultimoCheckoutEm !== undefined ? patch.ultimoCheckoutEm : existing?.ultimoCheckoutEm,
        ultimaCompraEm: patch.ultimaCompraEm !== undefined ? patch.ultimaCompraEm : existing?.ultimaCompraEm,
        totalCompras: patch.totalCompras !== undefined ? patch.totalCompras : (existing?.totalCompras || 0),
        ultimoUpsellEm: patch.ultimoUpsellEm !== undefined ? patch.ultimoUpsellEm : existing?.ultimoUpsellEm,
        ultimoRemarketingEm: patch.ultimoRemarketingEm !== undefined ? patch.ultimoRemarketingEm : existing?.ultimoRemarketingEm,
        totalRemarketing: patch.totalRemarketing !== undefined ? patch.totalRemarketing : (existing?.totalRemarketing || 0),
    };

    if (index >= 0) leads[index] = lead;
    else leads.push(lead);

    saveLeads(leads);
    if (!existing) emitIntegrationEvent('lead.created', { lead }).catch(() => {});
    return lead;
}

function registerLeadInteraction(chatId, nome = '') {
    return upsertLead(chatId, {
        nome: nome || undefined,
        origem: 'mensagem_recebida',
        ultimaInteracaoEm: nowIso(),
        tags: ['interagiu'],
    });
}

function registerCheckout(chatId, product) {
    const lead = upsertLead(chatId, {
        status: 'carrinho',
        origem: 'checkout_pix',
        ultimoProdutoId: product?.id,
        ultimoProdutoNome: product?.nome,
        ultimoCheckoutEm: nowIso(),
        ultimaInteracaoEm: nowIso(),
        tags: ['checkout', 'pix_gerado'],
    });
    if (lead) emitIntegrationEvent('checkout.created', { lead, product: product ? { id: product.id, name: product.nome, price: product.preco } : null }).catch(() => {});
    return lead;
}

function registerSale(chatId, product) {
    const current = upsertLead(chatId, {});
    const lead = upsertLead(chatId, {
        status: 'comprador',
        origem: 'compra',
        ultimoProdutoId: product?.id,
        ultimoProdutoNome: product?.nome,
        ultimaCompraEm: nowIso(),
        ultimaInteracaoEm: nowIso(),
        totalCompras: (current?.totalCompras || 0) + 1,
        tags: ['comprador'],
    });
    if (lead) emitIntegrationEvent('customer.updated', { lead, product: product ? { id: product.id, name: product.nome, price: product.preco } : null }).catch(() => {});
    return lead;
}

function optOutLead(chatId) {
    return upsertLead(chatId, {
        optIn: false,
        ativo: false,
        ultimaInteracaoEm: nowIso(),
        tags: ['optout'],
    });
}

function optInLead(chatId) {
    return upsertLead(chatId, {
        forceOptIn: true,
        optIn: true,
        ativo: true,
        ultimaInteracaoEm: nowIso(),
        tags: ['optin'],
    });
}

function importLeadsFromDisparos() {
    const disparos = readJson(DISPAROS_PATH, { contatos: [] });
    const contacts = Array.isArray(disparos.contatos) ? disparos.contatos : [];
    let imported = 0;
    let skipped = 0;

    for (const contato of contacts) {
        if (!contato || contato.ativo === false || contato.optIn === false) {
            skipped += 1;
            continue;
        }

        const chatId = normalizePhone(contato.telefone || contato.numero || contato.phone || contato.whatsapp);
        if (!chatId) {
            skipped += 1;
            continue;
        }

        upsertLead(chatId, {
            nome: contato.nome || contato.name || undefined,
            status: 'lead',
            origem: 'disparos_json',
            tags: ['importado_disparos'],
        });
        imported += 1;
    }

    return { imported, skipped, total: contacts.length };
}

function findModel(marketing, modeloId) {
    return (marketing.modelos || []).find(modelo => modelo && modelo.ativo !== false && String(modelo.id).toLowerCase() === String(modeloId || '').toLowerCase());
}

function replaceTokens(text, lead, config = {}, extra = {}) {
    const nome = sanitizeName(extra.nome || lead?.nome, 'amigo');
    const primeiroNome = nome.split(/\s+/)[0] || nome;
    const produto = extra.produto || lead?.ultimoProdutoNome || 'produto Sua Marca';
    const now = getNowText(config.timezone);

    const replacements = {
        nome,
        primeiroNome,
        telefone: phoneFromChatId(lead?.chatId || lead?.telefone),
        produto,
        ultimoProduto: produto,
        produtoUpsell: extra.produtoUpsell || config.upsell?.produtoUpsell || 'Upgrade Sua Marca',
        valorUpsell: extra.valorUpsell || config.upsell?.valorUpsell || 'condição especial',
        link: extra.link || config.linkPrincipal || '',
        cupom: extra.cupom || config.cupomPadrao || '',
        data: now.data,
        hora: now.hora,
    };

    let result = String(text || '');
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), String(value || ''));
    }
    return result.trim();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

function getTargets(segmento) {
    const marketing = loadMarketing();
    const cooldown = Math.max(0, Number(marketing.config.cooldownHorasPorContato || DEFAULT_CONFIG.cooldownHorasPorContato));
    const leads = loadLeads();

    return leads.filter(lead => {
        if (!lead || lead.ativo === false) return false;
        if (marketing.config.modoSeguro !== false && lead.optIn !== true) return false;
        if (!String(lead.chatId || '').endsWith('@c.us')) return false;
        if (hoursSince(lead.ultimoRemarketingEm) < cooldown) return false;

        if (segmento === 'todos') return true;
        if (segmento === 'leads') return lead.status === 'lead';
        if (segmento === 'carrinho' || segmento === 'perdidos') return lead.status === 'carrinho';
        if (segmento === 'clientes' || segmento === 'compradores') return lead.status === 'comprador';
        return false;
    });
}

async function sendMarketingMessage(client, lead, modelo, config, extra = {}) {
    const text = replaceTokens(modelo.texto || modelo.mensagem || modelo.titulo || '', lead, config, extra);
    await client.sendMessage(lead.chatId, text || modelo.titulo || 'Mensagem');
}

function createInitialState(modeloId, segmento, fila) {
    return {
        status: 'running',
        campanhaId: `remarketing_${Date.now()}`,
        modeloId,
        segmento,
        total: fila.length,
        enviados: 0,
        falhas: 0,
        pulados: 0,
        indiceAtual: 0,
        iniciadaEm: nowIso(),
        atualizadaEm: nowIso(),
        ultimoErro: null,
        logs: [],
        fila,
    };
}

async function processRemarketing(client, modelo, config) {
    if (isProcessing) return;
    isProcessing = true;
    cancelled = false;

    try {
        let state = loadState();
        if (!Array.isArray(state.fila)) state.fila = [];

        while (state.indiceAtual < state.fila.length) {
            if (cancelled) {
                state.status = 'cancelled';
                saveState(state);
                break;
            }

            if (paused || state.status === 'paused') {
                state.status = 'paused';
                saveState(state);
                break;
            }

            const lead = state.fila[state.indiceAtual];
            if (!lead || !lead.chatId) {
                state.pulados += 1;
                state.indiceAtual += 1;
                saveState(state);
                continue;
            }

            const freshLeads = loadLeads();
            const freshIndex = findLeadIndex(freshLeads, lead.chatId);
            const freshLead = freshIndex >= 0 ? freshLeads[freshIndex] : null;
            if (config.modoSeguro !== false && (!freshLead || freshLead.optIn !== true || freshLead.ativo === false)) {
                state.pulados += 1;
                state.indiceAtual += 1;
                state.logs.push({ at: nowIso(), status: 'pulado_sem_consentimento', destino: lead.chatId });
                saveState(state);
                continue;
            }

            try {
                await sendMarketingMessage(client, freshLead || lead, modelo, config);
                const currentLead = upsertLead(lead.chatId, {
                    ultimoRemarketingEm: nowIso(),
                    totalRemarketing: (lead.totalRemarketing || 0) + 1,
                    tags: ['remarketing'],
                });

                state.enviados += 1;
                state.logs.push({
                    at: nowIso(),
                    status: 'enviado',
                    destino: lead.chatId,
                    nome: currentLead?.nome || lead.nome,
                });
                console.log(`[Remarketing] Mensagem enviada para ${lead.nome || lead.chatId}.`.green);
            } catch (error) {
                state.falhas += 1;
                state.ultimoErro = error.message;
                state.logs.push({
                    at: nowIso(),
                    status: 'falha',
                    destino: lead.chatId,
                    nome: lead.nome,
                    erro: error.message,
                });
                console.error(`[Remarketing] Falha ao enviar para ${lead.chatId}:`, error.message);
            }

            state.indiceAtual += 1;
            saveState(state);

            if (state.indiceAtual < state.fila.length) {
                const minMs = Math.max(10, Number(config.intervaloMinSegundos || DEFAULT_CONFIG.intervaloMinSegundos)) * 1000;
                const maxMs = Math.max(minMs, Number(config.intervaloMaxSegundos || DEFAULT_CONFIG.intervaloMaxSegundos) * 1000);
                await delay(randomDelay(minMs, maxMs));
            }

            state = loadState();
        }

        state = loadState();
        if (state.status === 'running' && state.indiceAtual >= state.total) {
            state.status = 'finished';
            saveState(state);
            console.log(`[Remarketing] Campanha finalizada: ${state.enviados} enviados, ${state.falhas} falhas.`.cyan);
        }
    } finally {
        isProcessing = false;
    }
}

function formatState(state) {
    const percent = state.total > 0 ? Math.round(((state.indiceAtual || 0) / state.total) * 100) : 0;
    return `📢 *STATUS DO REMARKETING*\n\n` +
        `Status: *${state.status || 'idle'}*\n` +
        `Modelo: *${state.modeloId || '-'}*\n` +
        `Segmento: *${state.segmento || '-'}*\n` +
        `Progresso: *${state.indiceAtual || 0}/${state.total || 0}* (${percent}%)\n` +
        `Enviados: *${state.enviados || 0}*\n` +
        `Falhas: *${state.falhas || 0}*\n` +
        `Pulados: *${state.pulados || 0}*\n` +
        `Último erro: ${state.ultimoErro || '-'}`;
}

function buildHelpText() {
    return `📈 *UPSELL E REMARKETING*\n\n` +
        `*/upsell status* - Ver configuração do upsell\n` +
        `*/upsell ligar* - Ativar upsell pós-compra\n` +
        `*/upsell desligar* - Desativar upsell pós-compra\n` +
        `*/upsell teste <numero>* - Enviar teste do upsell\n` +
        `*/upsell texto <mensagem>* - Trocar texto do upsell\n\n` +
        `*/remarketing status* - Ver campanha atual\n` +
        `*/remarketing leads* - Ver contagem por segmento\n` +
        `*/remarketing importar* - Puxar contatos do disparos.json\n` +
        `*/remarketing modelos* - Listar modelos\n` +
        `*/remarketing iniciar <modelo> <segmento>* - Iniciar campanha\n` +
        `Segmentos: *leads*, *carrinho*, *clientes*, *todos*\n` +
        `*/remarketing teste <modelo> <numero>* - Testar modelo\n` +
        `*/remarketing pausar* - Pausar campanha\n` +
        `*/remarketing continuar* - Continuar campanha\n` +
        `*/remarketing cancelar* - Cancelar campanha\n\n` +
        `Use somente com leads/clientes que autorizaram contato. O cliente pode mandar *SAIR* para parar mensagens.`;
}

function leadStatsText() {
    const leads = loadLeads();
    const ativos = leads.filter(l => l.ativo !== false && l.optIn !== false);
    const stats = {
        total: leads.length,
        ativos: ativos.length,
        leads: ativos.filter(l => l.status === 'lead').length,
        carrinho: ativos.filter(l => l.status === 'carrinho').length,
        clientes: ativos.filter(l => l.status === 'comprador').length,
        optout: leads.filter(l => l.optIn === false || l.ativo === false).length,
    };

    return `📊 *LEADS DE MARKETING*\n\n` +
        `Total salvo: *${stats.total}*\n` +
        `Ativos/opt-in: *${stats.ativos}*\n` +
        `Leads: *${stats.leads}*\n` +
        `Carrinho/PIX pendente: *${stats.carrinho}*\n` +
        `Clientes/compradores: *${stats.clientes}*\n` +
        `Descadastrados: *${stats.optout}*`;
}

async function startRemarketing(client, sender, modeloId, segmento) {
    const currentState = loadState();
    if (currentState.status === 'running') {
        await client.sendMessage(sender, '⚠️ Já existe uma campanha de remarketing rodando. Use */remarketing status*, */remarketing pausar* ou */remarketing cancelar* primeiro.');
        return true;
    }

    const marketing = loadMarketing();
    const modelo = findModel(marketing, modeloId);
    if (!modelo) {
        await client.sendMessage(sender, `❌ Modelo não encontrado ou inativo: *${modeloId}*\n\nUse */remarketing modelos* para ver os modelos.`);
        return true;
    }

    if (!['leads', 'carrinho', 'perdidos', 'clientes', 'compradores', 'todos'].includes(segmento)) {
        await client.sendMessage(sender, '❌ Segmento inválido. Use: *leads*, *carrinho*, *clientes* ou *todos*.');
        return true;
    }

    const allTargets = getTargets(segmento);
    const limit = Math.max(1, Number(marketing.config.limitePorCampanha || DEFAULT_CONFIG.limitePorCampanha));
    const targets = allTargets.slice(0, limit);

    if (targets.length === 0) {
        await client.sendMessage(sender, `❌ Nenhum lead ativo encontrado para o segmento *${segmento}*.\n\nDica: gere PIX, faça vendas ou receba mensagens no bot para alimentar a base.`);
        return true;
    }

    const state = createInitialState(modelo.id, segmento, targets);
    saveState(state);
    paused = false;
    cancelled = false;

    await client.sendMessage(sender,
        `✅ *Remarketing iniciado*\n\n` +
        `Modelo: *${modelo.titulo || modelo.id}*\n` +
        `Segmento: *${segmento}*\n` +
        `Total na fila: *${targets.length}*\n` +
        `Intervalo: *${marketing.config.intervaloMinSegundos}-${marketing.config.intervaloMaxSegundos}s*\n\n` +
        `Use */remarketing status* para acompanhar.`
    );

    processRemarketing(client, modelo, marketing.config).catch(error => {
        const erroState = loadState();
        erroState.status = 'error';
        erroState.ultimoErro = error.message;
        saveState(erroState);
        console.error('[Remarketing] Erro geral:', error.message);
    });

    return true;
}

async function continueRemarketing(client, sender) {
    const state = loadState();
    if (state.status !== 'paused') {
        await client.sendMessage(sender, '⚠️ Não existe campanha pausada para continuar.');
        return true;
    }

    const marketing = loadMarketing();
    const modelo = findModel(marketing, state.modeloId);
    if (!modelo) {
        await client.sendMessage(sender, `❌ Modelo da campanha pausada não encontrado: *${state.modeloId}*`);
        return true;
    }

    paused = false;
    cancelled = false;
    state.status = 'running';
    saveState(state);
    await client.sendMessage(sender, '▶️ Remarketing retomado.');
    processRemarketing(client, modelo, marketing.config).catch(error => console.error('[Remarketing] Erro ao continuar:', error.message));
    return true;
}

function setUpsellStatus(active) {
    const marketing = loadMarketing();
    marketing.config.upsell.ativo = Boolean(active);
    saveMarketing(marketing);
    return marketing.config.upsell.ativo;
}

function updateUpsellText(text) {
    const marketing = loadMarketing();
    const modelo = findModel(marketing, 'upsell-pos-compra');
    if (!modelo) {
        marketing.modelos.push({ id: 'upsell-pos-compra', titulo: 'Upsell depois da compra', ativo: true, texto });
    } else {
        modelo.texto = text;
    }
    saveMarketing(marketing);
}

function formatUpsellStatus() {
    const marketing = loadMarketing();
    const upsell = marketing.config.upsell;
    const modelo = findModel(marketing, 'upsell-pos-compra');

    return `🎯 *STATUS DO UPSELL*\n\n` +
        `Ativo: *${upsell.ativo ? 'Sim' : 'Não'}*\n` +
        `Delay pós-compra: *${upsell.delaySegundos}s*\n` +
        `Produto upsell: *${upsell.produtoUpsell}*\n` +
        `Valor upsell: *${upsell.valorUpsell}*\n` +
        `Modelo: *${modelo?.id || '-'}*\n\n` +
        `Texto atual:\n${modelo?.texto || '-'}`;
}

async function sendUpsellNow(client, chatId, product = null) {
    const marketing = loadMarketing();
    if (!marketing.config.upsell.ativo) return false;

    const normalizedChatId = normalizePhone(chatId) || chatId;
    const lead = upsertLead(normalizedChatId, { nome: undefined });
    if (!lead || lead.optIn === false || lead.ativo === false) return false;

    const waitHours = Math.max(0, Number(marketing.config.upsell.evitarRepetirPorHoras || DEFAULT_CONFIG.upsell.evitarRepetirPorHoras));
    if (hoursSince(lead.ultimoUpsellEm) < waitHours) return false;

    const modelo = findModel(marketing, 'upsell-pos-compra');
    if (!modelo) return false;

    await sendMarketingMessage(client, lead, modelo, marketing.config, {
        produto: product?.nome || lead.ultimoProdutoNome,
    });

    upsertLead(normalizedChatId, {
        ultimoUpsellEm: nowIso(),
        tags: ['upsell_enviado'],
    });

    return true;
}

function scheduleUpsellAfterSale(client, chatId, product = null) {
    const marketing = loadMarketing();
    if (!marketing.config.upsell.ativo) return false;
    const modelo = findModel(marketing, 'upsell-pos-compra');
    if (!modelo) return false;
    const delaySeconds = Math.max(0, Number(marketing.config.upsell.delaySegundos || DEFAULT_CONFIG.upsell.delaySegundos));
    const groupKey = `legacy_upsell:${phoneFromChatId(chatId)}:${Date.now()}`;
    automationManager.enqueueJob({
        type: 'message',
        kind: 'marketing',
        chatId: normalizePhone(chatId) || chatId,
        runAt: new Date(Date.now() + delaySeconds * 1000),
        groupKey,
        dedupeKey: `${groupKey}:send`,
        payload: { condition: 'always', product, text: modelo.texto }
    });
    return true;
}

async function handleMarketingCommand(client, message) {
    const sender = message.from;
    const bodyOriginal = String(message.body || '').trim();
    const body = bodyOriginal.toLowerCase();
    const parts = bodyOriginal.split(/\s+/);

    if (body === '/marketing' || body === '/marketing ajuda' || body === '/upsell' || body === '/remarketing') {
        await client.sendMessage(sender, buildHelpText());
        return true;
    }

    if (body === '/upsell status') {
        await client.sendMessage(sender, formatUpsellStatus());
        return true;
    }

    if (body === '/upsell ligar') {
        setUpsellStatus(true);
        await client.sendMessage(sender, '✅ Upsell pós-compra ativado.');
        return true;
    }

    if (body === '/upsell desligar') {
        setUpsellStatus(false);
        await client.sendMessage(sender, '✅ Upsell pós-compra desativado.');
        return true;
    }

    if (body.startsWith('/upsell texto ')) {
        const text = bodyOriginal.replace(/^\/upsell\s+texto\s+/i, '').trim();
        if (!text) {
            await client.sendMessage(sender, 'Envie assim: */upsell texto sua mensagem aqui*');
            return true;
        }
        updateUpsellText(text);
        await client.sendMessage(sender, '✅ Texto do upsell atualizado.');
        return true;
    }

    if (body.startsWith('/upsell teste')) {
        const numero = parts[2];
        const chatId = numero ? normalizePhone(numero) : sender;
        if (!chatId) {
            await client.sendMessage(sender, '❌ Número inválido. Use: */upsell teste 5599999999999*');
            return true;
        }
        await sendUpsellNow(client, chatId, { nome: 'Produto Teste' });
        await client.sendMessage(sender, `✅ Teste de upsell enviado para ${chatId}.`);
        return true;
    }

    if (body === '/remarketing status') {
        await client.sendMessage(sender, formatState(loadState()));
        return true;
    }

    if (body === '/remarketing leads') {
        await client.sendMessage(sender, leadStatsText());
        return true;
    }

    if (body === '/remarketing importar') {
        const result = importLeadsFromDisparos();
        await client.sendMessage(sender, `✅ Importação para remarketing finalizada.\nContatos lidos: *${result.total}*\nImportados/atualizados: *${result.imported}*\nPulados: *${result.skipped}*`);
        return true;
    }

    if (body === '/remarketing modelos') {
        const marketing = loadMarketing();
        let text = '🧾 *MODELOS DE MARKETING*\n\n';
        marketing.modelos.forEach(modelo => {
            text += `ID: *${modelo.id}*\nTítulo: ${modelo.titulo || '-'}\nStatus: ${modelo.ativo === false ? 'Inativo' : 'Ativo'}\n\n`;
        });
        await client.sendMessage(sender, text.trim());
        return true;
    }

    if (body.startsWith('/remarketing iniciar')) {
        const modeloId = parts[2];
        const segmento = String(parts[3] || '').toLowerCase();
        if (!modeloId || !segmento) {
            await client.sendMessage(sender, 'Use: */remarketing iniciar <modelo> <segmento>*\nExemplo: */remarketing iniciar remarketing-carrinho carrinho*');
            return true;
        }
        return startRemarketing(client, sender, modeloId, segmento);
    }

    if (body.startsWith('/remarketing teste')) {
        const modeloId = parts[2];
        const numero = parts[3];
        if (!modeloId) {
            await client.sendMessage(sender, 'Use: */remarketing teste <modelo> <numero>*\nExemplo: */remarketing teste remarketing-carrinho 5599999999999*');
            return true;
        }

        const marketing = loadMarketing();
        const modelo = findModel(marketing, modeloId);
        if (!modelo) {
            await client.sendMessage(sender, `❌ Modelo não encontrado: *${modeloId}*`);
            return true;
        }

        const chatId = numero ? normalizePhone(numero) : sender;
        if (!chatId) {
            await client.sendMessage(sender, '❌ Número inválido para teste.');
            return true;
        }

        const lead = upsertLead(chatId, { nome: 'Teste', ultimoProdutoNome: 'Produto Teste' });
        await sendMarketingMessage(client, lead, modelo, marketing.config);
        await client.sendMessage(sender, `✅ Teste enviado para ${chatId}.`);
        return true;
    }

    if (body === '/remarketing pausar') {
        const state = loadState();
        if (state.status !== 'running') {
            await client.sendMessage(sender, '⚠️ Não existe campanha rodando para pausar.');
            return true;
        }
        paused = true;
        state.status = 'paused';
        saveState(state);
        await client.sendMessage(sender, '⏸️ Remarketing pausado.');
        return true;
    }

    if (body === '/remarketing continuar') {
        return continueRemarketing(client, sender);
    }

    if (body === '/remarketing cancelar') {
        const state = loadState();
        cancelled = true;
        paused = false;
        state.status = 'cancelled';
        saveState(state);
        await client.sendMessage(sender, '🛑 Remarketing cancelado.');
        return true;
    }

    await client.sendMessage(sender, buildHelpText());
    return true;
}


function requireConnectedClient(client) {
    if (!client || typeof client.sendMessage !== 'function') throw new Error('WhatsApp não conectado.');
}
function startRemarketingFromPanel(client, modeloId, segmento) {
    requireConnectedClient(client);
    const currentState = loadState();
    if (currentState.status === 'running') throw new Error('Já existe remarketing em execução.');
    const marketing = loadMarketing(); const modelo = findModel(marketing, modeloId);
    if (!modelo) throw new Error('Modelo não encontrado ou inativo.');
    if (!['leads','carrinho','perdidos','clientes','compradores','todos'].includes(segmento)) throw new Error('Segmento inválido.');
    const limit = Math.max(1, Number(marketing.config.limitePorCampanha || DEFAULT_CONFIG.limitePorCampanha));
    const targets = getTargets(segmento).slice(0, limit);
    if (!targets.length) throw new Error('Nenhum lead autorizado encontrado neste segmento.');
    const state = createInitialState(modelo.id, segmento, targets); saveState(state); paused=false; cancelled=false;
    processRemarketing(client, modelo, marketing.config).catch(error => { const current=loadState(); current.status='error'; current.ultimoErro=error.message; saveState(current); });
    return { ok:true, campaignId:state.campanhaId, total:targets.length, model:modelo.id, segment:segmento };
}
function pauseRemarketingFromPanel() { const state=loadState(); if(state.status!=='running')throw new Error('Não existe remarketing em execução.'); paused=true; state.status='paused'; saveState(state); return state; }
function resumeRemarketingFromPanel(client) { requireConnectedClient(client); const state=loadState(); if(state.status!=='paused')throw new Error('Não existe remarketing pausado.'); const marketing=loadMarketing(); const modelo=findModel(marketing,state.modeloId); if(!modelo)throw new Error('Modelo não encontrado.'); paused=false; cancelled=false; state.status='running'; saveState(state); processRemarketing(client,modelo,marketing.config).catch(error=>{const current=loadState();current.status='error';current.ultimoErro=error.message;saveState(current)}); return state; }
function cancelRemarketingFromPanel() { const state=loadState(); cancelled=true; paused=false; state.status='cancelled'; saveState(state); return state; }

module.exports = { handleMarketingCommand, loadMarketing, loadLeads, loadState, registerLeadInteraction, registerCheckout, registerSale, optOutLead, optInLead, sendUpsellNow, scheduleUpsellAfterSale, startRemarketingFromPanel, pauseRemarketingFromPanel, resumeRemarketingFromPanel, cancelRemarketingFromPanel };
