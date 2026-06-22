const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

const ROOT_DIR = path.resolve(__dirname, '../..');
const DISPAROS_PATH = path.join(ROOT_DIR, 'disparos.json');
const GRUPOS_PRESENTES_PATH = path.join(ROOT_DIR, 'grupos.json');
const CSV_PATH = path.join(ROOT_DIR, 'contatos_disparo.csv');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const STATE_PATH = path.join(DATA_DIR, 'disparos_state.json');

const DEFAULT_CONFIG = {
    nomeSistema: 'JETBOT — Campanhas',
    timezone: 'America/Sao_Paulo',
    intervaloMinSegundos: 25,
    intervaloMaxSegundos: 65,
    limitePorCampanha: 200,
    modoSeguro: true,
    enviarImagemComLegenda: true,
    usarGruposDoPresentes: true,
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
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`[Disparos] Erro ao ler ${filePath}:`, error.message);
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

function loadDisparos() {
    const data = readJson(DISPAROS_PATH, null);
    if (!data) {
        const initial = {
            config: DEFAULT_CONFIG,
            contatos: [],
            grupos: [],
            modelos: [
                {
                    id: 'presente-gratis',
                    titulo: 'Convite presentes grátis',
                    ativo: true,
                    imagem: '',
                    texto: '🎁 Oi {{nome}}!\n\nPassei para avisar que tem *presentes grátis* liberados hoje.\n\nAcesse aqui:\nhttps://seulink.com.br\n\nDepois me chama se quiser receber mais materiais.'
                },
                {
                    id: 'oferta-sua-marca',
                    titulo: 'Oferta Sua Marca',
                    ativo: true,
                    imagem: '',
                    texto: '🔥 Oi {{nome}}!\n\nTenho uma oportunidade pronta da sua empresa para vender online com estrutura, automação e suporte.\n\nResponda *QUERO* que te envio os detalhes.'
                }
            ]
        };
        writeJson(DISPAROS_PATH, initial);
        return initial;
    }

    data.config = { ...DEFAULT_CONFIG, ...(data.config || {}) };
    if (!Array.isArray(data.contatos)) data.contatos = [];
    if (!Array.isArray(data.grupos)) data.grupos = [];
    if (!Array.isArray(data.modelos)) data.modelos = [];
    return data;
}

function saveDisparos(data) {
    writeJson(DISPAROS_PATH, data);
}

function loadState() {
    ensureDataDir();
    return readJson(STATE_PATH, {
        status: 'idle',
        campanhaId: null,
        modeloId: null,
        destino: null,
        total: 0,
        enviados: 0,
        falhas: 0,
        pulados: 0,
        indiceAtual: 0,
        iniciadaEm: null,
        atualizadaEm: null,
        ultimoErro: null,
        logs: [],
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

function normalizeGroupId(groupId) {
    const text = String(groupId || '').trim();
    if (!text) return null;
    if (text.endsWith('@g.us')) return text;
    if (/^\d+$/.test(text)) return `${text}@g.us`;
    return null;
}

function getPhoneFromChatId(chatId) {
    return String(chatId || '').replace('@c.us', '').replace('@g.us', '');
}

function sanitizeName(name, fallback = 'amigo') {
    const cleaned = String(name || '').trim();
    return cleaned || fallback;
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

function replaceTokens(text, target, config) {
    const nome = sanitizeName(target.nome);
    const primeiroNome = nome.split(/\s+/)[0] || nome;
    const telefone = getPhoneFromChatId(target.chatId);
    const now = getNowText(config.timezone);

    return String(text || '')
        .replace(/{{\s*nome\s*}}/gi, nome)
        .replace(/{{\s*primeiroNome\s*}}/gi, primeiroNome)
        .replace(/{{\s*telefone\s*}}/gi, telefone)
        .replace(/{{\s*data\s*}}/gi, now.data)
        .replace(/{{\s*hora\s*}}/gi, now.hora);
}

function resolveMediaPath(imagePath) {
    if (!imagePath) return null;
    const normalized = String(imagePath).replace(/^\.\//, '');
    const fullPath = path.isAbsolute(normalized) ? normalized : path.join(ROOT_DIR, normalized);
    return fs.existsSync(fullPath) ? fullPath : null;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

function getActiveContacts(disparos) {
    const seen = new Set();
    const contacts = [];

    for (const contato of disparos.contatos || []) {
        if (!contato || contato.ativo === false) continue;
        if (disparos.config.modoSeguro !== false && contato.optIn !== true) continue;

        const chatId = normalizePhone(contato.telefone || contato.numero || contato.phone || contato.whatsapp);
        if (!chatId || seen.has(chatId)) continue;

        seen.add(chatId);
        contacts.push({
            tipo: 'contato',
            id: contato.id || chatId,
            nome: sanitizeName(contato.nome || contato.name, 'amigo'),
            chatId,
        });
    }

    return contacts;
}

function isContactStillOptedIn(chatId) {
    const disparos = loadDisparos();
    if (disparos.config.modoSeguro === false) return true;
    const digits = getPhoneFromChatId(chatId);
    return (disparos.contatos || []).some((contact) =>
        contact && contact.ativo !== false && contact.optIn === true &&
        String(contact.telefone || contact.numero || contact.phone || contact.whatsapp || '').replace(/\D/g, '') === digits
    );
}

function getPresentesGroups() {
    const grupos = readJson(GRUPOS_PRESENTES_PATH, []);
    return Array.isArray(grupos) ? grupos : [];
}

function getActiveGroups(disparos) {
    const seen = new Set();
    const groups = [];
    const sourceGroups = [
        ...(disparos.grupos || []),
        ...(disparos.config.usarGruposDoPresentes !== false ? getPresentesGroups() : []),
    ];

    for (const group of sourceGroups) {
        if (!group || group.ativo === false) continue;
        const chatId = normalizeGroupId(group.groupId || group.idGrupo || group.chatId);
        if (!chatId || seen.has(chatId)) continue;

        seen.add(chatId);
        groups.push({
            tipo: 'grupo',
            id: group.id || chatId,
            nome: sanitizeName(group.nome || group.name, 'grupo'),
            chatId,
        });
    }

    return groups;
}

function getTargets(disparos, destino) {
    const contacts = getActiveContacts(disparos);
    const groups = getActiveGroups(disparos);

    if (destino === 'contatos') return contacts;
    if (destino === 'grupos') return groups;
    if (destino === 'todos') return [...contacts, ...groups];
    return [];
}

function findModel(disparos, modeloId) {
    return (disparos.modelos || []).find(modelo => modelo && modelo.ativo !== false && String(modelo.id).toLowerCase() === String(modeloId || '').toLowerCase());
}

async function sendCampaignMessage(client, target, modelo, config) {
    const text = replaceTokens(modelo.texto || modelo.mensagem || modelo.titulo || '', target, config).trim();
    const mediaPath = config.enviarImagemComLegenda !== false ? resolveMediaPath(modelo.imagem) : null;

    if (mediaPath) {
        const media = MessageMedia.fromFilePath(mediaPath);
        await client.sendMessage(target.chatId, media, { caption: text || modelo.titulo || '' });
        return 'imagem';
    }

    await client.sendMessage(target.chatId, text || modelo.titulo || 'Mensagem');
    return 'texto';
}

function createInitialState(modeloId, destino, fila) {
    return {
        status: 'running',
        campanhaId: `camp_${Date.now()}`,
        modeloId,
        destino,
        total: fila.length,
        enviados: 0,
        falhas: 0,
        pulados: 0,
        indiceAtual: 0,
        iniciadaEm: new Date().toISOString(),
        atualizadaEm: new Date().toISOString(),
        ultimoErro: null,
        logs: [],
        fila,
    };
}

async function processCampaign(client, modelo, config) {
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

            const target = state.fila[state.indiceAtual];
            if (!target || !target.chatId) {
                state.pulados += 1;
                state.indiceAtual += 1;
                saveState(state);
                continue;
            }

            if (target.tipo === 'contato' && config.modoSeguro !== false && !isContactStillOptedIn(target.chatId)) {
                state.pulados += 1;
                state.indiceAtual += 1;
                state.logs.push({ at: new Date().toISOString(), status: 'pulado_sem_consentimento', destino: target.chatId, nome: target.nome });
                saveState(state);
                continue;
            }

            try {
                const tipoEnvio = await sendCampaignMessage(client, target, modelo, config);
                state.enviados += 1;
                state.logs.push({
                    at: new Date().toISOString(),
                    status: 'enviado',
                    tipoEnvio,
                    destino: target.chatId,
                    nome: target.nome,
                });
                console.log(`[Disparos] Mensagem enviada para ${target.nome} (${target.chatId}).`.green);
            } catch (error) {
                state.falhas += 1;
                state.ultimoErro = error.message;
                state.logs.push({
                    at: new Date().toISOString(),
                    status: 'falha',
                    destino: target.chatId,
                    nome: target.nome,
                    erro: error.message,
                });
                console.error(`[Disparos] Falha ao enviar para ${target.chatId}:`, error.message);
            }

            state.indiceAtual += 1;
            saveState(state);

            if (state.indiceAtual < state.fila.length) {
                const minMs = Math.max(5, Number(config.intervaloMinSegundos || DEFAULT_CONFIG.intervaloMinSegundos)) * 1000;
                const maxMs = Math.max(minMs, Number(config.intervaloMaxSegundos || DEFAULT_CONFIG.intervaloMaxSegundos) * 1000);
                await delay(randomDelay(minMs, maxMs));
            }

            state = loadState();
        }

        state = loadState();
        if (state.status === 'running' && state.indiceAtual >= state.total) {
            state.status = 'finished';
            saveState(state);
            console.log(`[Disparos] Campanha finalizada: ${state.enviados} enviados, ${state.falhas} falhas.`.cyan);
        }
    } finally {
        isProcessing = false;
    }
}

function buildHelpText() {
    return `📣 *COMANDOS DE DISPAROS*\n\n` +
        `*/disparos status* - Ver campanha atual\n` +
        `*/disparos modelos* - Listar modelos de mensagem\n` +
        `*/disparos contatos* - Contar contatos ativos\n` +
        `*/disparos grupos* - Contar grupos ativos\n` +
        `*/disparos iniciar <modelo> contatos* - Enviar para contatos opt-in\n` +
        `*/disparos iniciar <modelo> grupos* - Enviar para grupos ativos\n` +
        `*/disparos iniciar <modelo> todos* - Enviar para contatos e grupos\n` +
        `*/disparos teste <modelo> <numero>* - Testar envio\n` +
        `*/disparos add <numero> <nome>* - Adicionar contato opt-in\n` +
        `*/disparos importar* - Importar contatos_disparo.csv\n` +
        `*/disparos pausar* - Pausar campanha\n` +
        `*/disparos continuar* - Continuar campanha pausada\n` +
        `*/disparos cancelar* - Cancelar campanha\n\n` +
        `Use somente com pessoas que autorizaram receber mensagens.`;
}

function formatState(state) {
    const percent = state.total > 0 ? Math.round(((state.indiceAtual || 0) / state.total) * 100) : 0;
    return `📣 *STATUS DOS DISPAROS*\n\n` +
        `Status: *${state.status || 'idle'}*\n` +
        `Modelo: *${state.modeloId || '-'}*\n` +
        `Destino: *${state.destino || '-'}*\n` +
        `Progresso: *${state.indiceAtual || 0}/${state.total || 0}* (${percent}%)\n` +
        `Enviados: *${state.enviados || 0}*\n` +
        `Falhas: *${state.falhas || 0}*\n` +
        `Pulados: *${state.pulados || 0}*\n` +
        `Último erro: ${state.ultimoErro || '-'}`;
}

function parseCsvLine(line) {
    const parts = String(line || '').split(';');
    if (parts.length < 2) return null;
    const telefone = parts[0].trim();
    const nome = parts.slice(1).join(';').trim();
    if (!telefone) return null;
    return { telefone, nome: nome || 'amigo', ativo: true, optIn: true };
}

function importContactsFromCsv() {
    if (!fs.existsSync(CSV_PATH)) return { imported: 0, total: 0, error: 'Arquivo contatos_disparo.csv não encontrado.' };

    const disparos = loadDisparos();
    const existingPhones = new Set((disparos.contatos || []).map(c => String(c.telefone || '').replace(/\D/g, '')));
    const lines = fs.readFileSync(CSV_PATH, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let imported = 0;

    for (const line of lines) {
        if (/^telefone\s*;/i.test(line)) continue;
        const parsed = parseCsvLine(line);
        if (!parsed) continue;
        const key = String(parsed.telefone || '').replace(/\D/g, '');
        if (!key || existingPhones.has(key)) continue;
        disparos.contatos.push({ id: `contato_${Date.now()}_${imported}`, ...parsed });
        existingPhones.add(key);
        imported += 1;
    }

    saveDisparos(disparos);
    return { imported, total: lines.length };
}

async function startCampaign(client, sender, modeloId, destino) {
    const currentState = loadState();
    if (currentState.status === 'running') {
        await client.sendMessage(sender, '⚠️ Já existe uma campanha rodando. Use */disparos status*, */disparos pausar* ou */disparos cancelar* primeiro.');
        return true;
    }

    const disparos = loadDisparos();
    const modelo = findModel(disparos, modeloId);
    if (!modelo) {
        await client.sendMessage(sender, `❌ Modelo não encontrado ou inativo: *${modeloId}*\n\nUse */disparos modelos* para ver os modelos disponíveis.`);
        return true;
    }

    if (!['contatos', 'grupos', 'todos'].includes(destino)) {
        await client.sendMessage(sender, '❌ Destino inválido. Use: *contatos*, *grupos* ou *todos*.');
        return true;
    }

    const allTargets = getTargets(disparos, destino);
    const limit = Math.max(1, Number(disparos.config.limitePorCampanha || DEFAULT_CONFIG.limitePorCampanha));
    const targets = allTargets.slice(0, limit);

    if (targets.length === 0) {
        await client.sendMessage(sender, `❌ Nenhum destino ativo encontrado para *${destino}*. Verifique o disparos.json.`);
        return true;
    }

    const state = createInitialState(modelo.id, destino, targets);
    saveState(state);
    paused = false;
    cancelled = false;

    await client.sendMessage(sender,
        `✅ *Campanha iniciada*\n\n` +
        `Modelo: *${modelo.titulo || modelo.id}*\n` +
        `Destino: *${destino}*\n` +
        `Total na fila: *${targets.length}*\n` +
        `Intervalo: *${disparos.config.intervaloMinSegundos}-${disparos.config.intervaloMaxSegundos}s*\n\n` +
        `Use */disparos status* para acompanhar.`
    );

    processCampaign(client, modelo, disparos.config).catch(error => {
        const erroState = loadState();
        erroState.status = 'error';
        erroState.ultimoErro = error.message;
        saveState(erroState);
        console.error('[Disparos] Erro geral:', error.message);
    });

    return true;
}

async function continueCampaign(client, sender) {
    const state = loadState();
    if (state.status !== 'paused') {
        await client.sendMessage(sender, '⚠️ Não existe campanha pausada para continuar.');
        return true;
    }

    const disparos = loadDisparos();
    const modelo = findModel(disparos, state.modeloId);
    if (!modelo) {
        await client.sendMessage(sender, `❌ Modelo da campanha pausada não encontrado: *${state.modeloId}*`);
        return true;
    }

    paused = false;
    cancelled = false;
    state.status = 'running';
    saveState(state);
    await client.sendMessage(sender, '▶️ Campanha retomada.');
    processCampaign(client, modelo, disparos.config).catch(error => console.error('[Disparos] Erro ao continuar:', error.message));
    return true;
}

async function handleDisparosCommand(client, message) {
    const sender = message.from;
    const bodyOriginal = String(message.body || '').trim();
    const body = bodyOriginal.toLowerCase();
    const parts = bodyOriginal.split(/\s+/);

    if (body === '/disparos' || body === '/disparos ajuda' || body === '/disparos help') {
        await client.sendMessage(sender, buildHelpText());
        return true;
    }

    if (body === '/disparos status') {
        await client.sendMessage(sender, formatState(loadState()));
        return true;
    }

    if (body === '/disparos modelos') {
        const disparos = loadDisparos();
        if (!disparos.modelos.length) {
            await client.sendMessage(sender, 'Nenhum modelo cadastrado em disparos.json.');
            return true;
        }
        let text = '🧾 *MODELOS DE DISPARO*\n\n';
        disparos.modelos.forEach(modelo => {
            text += `ID: *${modelo.id}*\nTítulo: ${modelo.titulo || '-'}\nStatus: ${modelo.ativo === false ? 'Inativo' : 'Ativo'}\n\n`;
        });
        await client.sendMessage(sender, text.trim());
        return true;
    }

    if (body === '/disparos contatos') {
        const disparos = loadDisparos();
        const contacts = getActiveContacts(disparos);
        await client.sendMessage(sender, `👤 Contatos ativos para disparo: *${contacts.length}*\n\nArquivo: disparos.json\nModo seguro: *${disparos.config.modoSeguro !== false ? 'Ligado' : 'Desligado'}*`);
        return true;
    }

    if (body === '/disparos grupos') {
        const disparos = loadDisparos();
        const groups = getActiveGroups(disparos);
        await client.sendMessage(sender, `👥 Grupos ativos para disparo: *${groups.length}*\n\nUsando grupos do presentes: *${disparos.config.usarGruposDoPresentes !== false ? 'Sim' : 'Não'}*`);
        return true;
    }

    if (body.startsWith('/disparos iniciar')) {
        const modeloId = parts[2];
        const destino = String(parts[3] || '').toLowerCase();
        if (!modeloId || !destino) {
            await client.sendMessage(sender, 'Use: */disparos iniciar <modelo> contatos*\nExemplo: */disparos iniciar presente-gratis contatos*');
            return true;
        }
        return startCampaign(client, sender, modeloId, destino);
    }

    if (body.startsWith('/disparos teste')) {
        const modeloId = parts[2];
        const numero = parts[3];
        if (!modeloId) {
            await client.sendMessage(sender, 'Use: */disparos teste <modelo> <numero>*\nExemplo: */disparos teste presente-gratis 5599999999999*');
            return true;
        }

        const disparos = loadDisparos();
        const modelo = findModel(disparos, modeloId);
        if (!modelo) {
            await client.sendMessage(sender, `❌ Modelo não encontrado: *${modeloId}*`);
            return true;
        }

        const chatId = numero ? normalizePhone(numero) : sender;
        if (!chatId) {
            await client.sendMessage(sender, '❌ Número inválido para teste.');
            return true;
        }

        await sendCampaignMessage(client, { tipo: 'teste', nome: 'Teste', chatId }, modelo, disparos.config);
        await client.sendMessage(sender, `✅ Teste enviado para ${chatId}.`);
        return true;
    }

    if (body === '/disparos pausar') {
        const state = loadState();
        if (state.status !== 'running') {
            await client.sendMessage(sender, '⚠️ Não existe campanha rodando para pausar.');
            return true;
        }
        paused = true;
        state.status = 'paused';
        saveState(state);
        await client.sendMessage(sender, '⏸️ Campanha pausada.');
        return true;
    }

    if (body === '/disparos continuar') {
        return continueCampaign(client, sender);
    }

    if (body === '/disparos cancelar') {
        const state = loadState();
        cancelled = true;
        paused = false;
        state.status = 'cancelled';
        saveState(state);
        await client.sendMessage(sender, '🛑 Campanha cancelada.');
        return true;
    }

    if (body.startsWith('/disparos add ')) {
        const numero = parts[2];
        const nome = bodyOriginal.split(/\s+/).slice(3).join(' ').trim() || 'amigo';
        const chatId = normalizePhone(numero);
        if (!chatId) {
            await client.sendMessage(sender, '❌ Número inválido. Use: */disparos add 5599999999999 Nome*');
            return true;
        }

        const disparos = loadDisparos();
        const phoneDigits = getPhoneFromChatId(chatId);
        const exists = disparos.contatos.some(c => String(c.telefone || '').replace(/\D/g, '') === phoneDigits);
        if (exists) {
            await client.sendMessage(sender, '⚠️ Esse contato já existe em disparos.json.');
            return true;
        }

        disparos.contatos.push({
            id: `contato_${Date.now()}`,
            nome,
            telefone: phoneDigits,
            ativo: true,
            optIn: true,
        });
        saveDisparos(disparos);
        await client.sendMessage(sender, `✅ Contato adicionado: *${nome}* (${phoneDigits})`);
        return true;
    }

    if (body === '/disparos importar') {
        const result = importContactsFromCsv();
        if (result.error) {
            await client.sendMessage(sender, `❌ ${result.error}\n\nCrie o arquivo na raiz do bot com este formato:\ntelefone;nome\n5599999999999;João`);
            return true;
        }
        await client.sendMessage(sender, `✅ Importação finalizada.\nNovos contatos: *${result.imported}*\nLinhas lidas: *${result.total}*`);
        return true;
    }

    await client.sendMessage(sender, buildHelpText());
    return true;
}


function requireConnectedClient(client) {
    if (!client || typeof client.sendMessage !== 'function') throw new Error('WhatsApp não conectado.');
}
function startCampaignFromPanel(client, modeloId, destino) {
    requireConnectedClient(client);
    const currentState = loadState();
    if (currentState.status === 'running') throw new Error('Já existe uma campanha rodando. Pause ou cancele antes.');
    const disparos = loadDisparos();
    const modelo = findModel(disparos, modeloId);
    if (!modelo) throw new Error('Modelo não encontrado ou inativo.');
    if (!['contatos','grupos','todos'].includes(destino)) throw new Error('Destino inválido.');
    const limit = Math.max(1, Number(disparos.config.limitePorCampanha || DEFAULT_CONFIG.limitePorCampanha));
    const targets = getTargets(disparos, destino).slice(0, limit);
    if (!targets.length) throw new Error('Nenhum destino autorizado e ativo encontrado.');
    const state = createInitialState(modelo.id, destino, targets);
    saveState(state); paused = false; cancelled = false;
    processCampaign(client, modelo, disparos.config).catch(error => {
        const current = loadState(); current.status = 'error'; current.ultimoErro = error.message; saveState(current);
    });
    return { ok: true, campaignId: state.campanhaId, total: targets.length, model: modelo.id, destination: destino };
}
function pauseCampaignFromPanel() {
    const state = loadState();
    if (state.status !== 'running') throw new Error('Não existe campanha em execução.');
    paused = true; state.status = 'paused'; saveState(state); return state;
}
function resumeCampaignFromPanel(client) {
    requireConnectedClient(client);
    const state = loadState();
    if (state.status !== 'paused') throw new Error('Não existe campanha pausada.');
    const disparos = loadDisparos(); const modelo = findModel(disparos, state.modeloId);
    if (!modelo) throw new Error('Modelo da campanha não encontrado.');
    paused = false; cancelled = false; state.status = 'running'; saveState(state);
    processCampaign(client, modelo, disparos.config).catch(error => { const current = loadState(); current.status='error'; current.ultimoErro=error.message; saveState(current); });
    return state;
}
function cancelCampaignFromPanel() {
    const state = loadState(); cancelled = true; paused = false; state.status = 'cancelled'; saveState(state); return state;
}

module.exports = {
    handleDisparosCommand, loadDisparos, getActiveContacts, getActiveGroups, loadState, startCampaignFromPanel, pauseCampaignFromPanel, resumeCampaignFromPanel, cancelCampaignFromPanel
};
