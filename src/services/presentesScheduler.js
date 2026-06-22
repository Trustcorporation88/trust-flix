const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

const ROOT_DIR = path.resolve(__dirname, '../..');
const AGENDA_PATH = path.join(ROOT_DIR, 'agenda.json');
const GRUPOS_PATH = path.join(ROOT_DIR, 'grupos.json');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const LOG_PATH = path.join(DATA_DIR, 'presentes_enviados.json');

const CHECK_INTERVAL_MS = 30 * 1000;
const DEFAULT_MAX_DELAY_MINUTES = 5;

let schedulerInterval = null;
let checkingNow = false;
let schedulerEnabled = true;

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`[Presentes] Erro ao ler ${filePath}:`, error.message);
        return fallback;
    }
}

function writeJson(filePath, data) {
    ensureDataDir();
    // CORREÇÃO: escrita atômica via arquivo temporário + renomeação.
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmpPath, filePath);
}

function normalizeDayName(dayName) {
    return String(dayName || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace('-feira', '')
        .trim();
}

function getNowParts(timezone) {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: timezone || 'America/Sao_Paulo',
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    const parts = Object.fromEntries(
        formatter.formatToParts(new Date()).map(part => [part.type, part.value])
    );

    const hour = Number(parts.hour === '24' ? '0' : parts.hour);
    const minute = Number(parts.minute);

    return {
        dayKey: normalizeDayName(parts.weekday),
        dateKey: `${parts.year}-${parts.month}-${parts.day}`,
        hour,
        minute,
        minutesOfDay: (hour * 60) + minute,
    };
}

function parseTimeToMinutes(timeText) {
    const match = String(timeText || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return (hour * 60) + minute;
}

function loadAgenda() {
    return readJson(AGENDA_PATH, { config: {}, dias: {} });
}

function loadGrupos() {
    const grupos = readJson(GRUPOS_PATH, []);
    return Array.isArray(grupos) ? grupos : [];
}

function loadLog() {
    return readJson(LOG_PATH, { enviados: {} });
}

function saveLog(log, currentDateKey, resetDiario) {
    if (resetDiario && log && log.enviados) {
        Object.keys(log.enviados).forEach(key => {
            if (!key.startsWith(`${currentDateKey}|`)) delete log.enviados[key];
        });
    }
    writeJson(LOG_PATH, log);
}

function getTodayItems(agenda, dayKey) {
    const dayConfig = agenda && agenda.dias ? agenda.dias[dayKey] : null;
    if (!dayConfig) return [];

    const presentes = Array.isArray(dayConfig.presentes) ? dayConfig.presentes : [];
    const ofertas = Array.isArray(dayConfig.ofertas) ? dayConfig.ofertas : [];

    return [...presentes, ...ofertas]
        .filter(item => item && item.ativo !== false)
        .sort((a, b) => (parseTimeToMinutes(a.horario) || 0) - (parseTimeToMinutes(b.horario) || 0));
}

function getActiveGroups() {
    return loadGrupos().filter(group => group && group.ativo !== false && group.groupId && String(group.groupId).endsWith('@g.us'));
}

function wasSent(log, dateKey, itemId, groupId) {
    return Boolean(log.enviados && log.enviados[`${dateKey}|${itemId}|${groupId}`]);
}

function markSent(log, dateKey, itemId, groupId) {
    if (!log.enviados) log.enviados = {};
    log.enviados[`${dateKey}|${itemId}|${groupId}`] = new Date().toISOString();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

function resolveMediaPath(imagePath) {
    if (!imagePath) return null;
    const normalized = String(imagePath).replace(/^\.\//, '');
    const fullPath = path.isAbsolute(normalized) ? normalized : path.join(ROOT_DIR, normalized);
    return fs.existsSync(fullPath) ? fullPath : null;
}

async function sendAgendaItem(client, chatId, item, agendaConfig, prefix = '') {
    const text = `${prefix}${item.texto || item.titulo || ''}`.trim();
    const mediaPath = agendaConfig.enviarImagemComLegenda !== false ? resolveMediaPath(item.imagem) : null;

    if (mediaPath) {
        const media = MessageMedia.fromFilePath(mediaPath);
        await client.sendMessage(chatId, media, { caption: text });
        return 'imagem';
    }

    await client.sendMessage(chatId, text || item.titulo || '🎁 Presente grátis liberado!');
    return 'texto';
}

async function processDueItems(client) {
    if (!schedulerEnabled || checkingNow) return;
    checkingNow = true;

    try {
        const agenda = loadAgenda();
        const agendaConfig = agenda.config || {};
        const timezone = agendaConfig.timezone || 'America/Sao_Paulo';
        const now = getNowParts(timezone);
        const maxDelayMinutes = Number.isFinite(Number(agendaConfig.atrasoMaxMinutos))
            ? Number(agendaConfig.atrasoMaxMinutos)
            : DEFAULT_MAX_DELAY_MINUTES;

        const groups = getActiveGroups();
        if (groups.length === 0) return;

        const items = getTodayItems(agenda, now.dayKey);
        if (items.length === 0) return;

        const log = loadLog();
        let changedLog = false;

        for (const item of items) {
            const scheduledMinutes = parseTimeToMinutes(item.horario);
            if (scheduledMinutes === null) continue;

            const diff = now.minutesOfDay - scheduledMinutes;
            const isDueNow = diff >= 0 && diff <= maxDelayMinutes;
            if (!isDueNow) continue;

            for (const group of groups) {
                if (wasSent(log, now.dateKey, item.id, group.groupId)) continue;

                try {
                    const sentType = await sendAgendaItem(client, group.groupId, item, agendaConfig);
                    markSent(log, now.dateKey, item.id, group.groupId);
                    changedLog = true;
                    saveLog(log, now.dateKey, agendaConfig.resetDiario !== false);
                    console.log(`[Presentes] ${item.id} enviado para ${group.nome || group.groupId} (${sentType}).`.green);

                    if (agendaConfig.modoHumanizado !== false) {
                        await delay(randomDelay(2500, 6500));
                    }
                } catch (error) {
                    console.error(`[Presentes] Falha ao enviar ${item.id} para ${group.nome || group.groupId}:`, error.message);
                }
            }
        }

        if (changedLog) saveLog(log, now.dateKey, agendaConfig.resetDiario !== false);
    } finally {
        checkingNow = false;
    }
}

function startPresentesScheduler(client) {
    if (schedulerInterval) return;

    ensureDataDir();
    console.log('🎁 Agendador de Presentes Grátis carregado.'.magenta);
    processDueItems(client).catch(error => console.error('[Presentes] Erro inicial:', error.message));
    schedulerInterval = setInterval(() => {
        processDueItems(client).catch(error => console.error('[Presentes] Erro no agendador:', error.message));
    }, CHECK_INTERVAL_MS);
}

function getPresentesStatus() {
    const agenda = loadAgenda();
    const agendaConfig = agenda.config || {};
    const timezone = agendaConfig.timezone || 'America/Sao_Paulo';
    const now = getNowParts(timezone);
    const groups = getActiveGroups();
    const todayItems = getTodayItems(agenda, now.dayKey);

    return {
        enabled: schedulerEnabled,
        timezone,
        now,
        activeGroups: groups,
        todayItems,
        agendaName: agendaConfig.nomeSistema || 'Agendador de Presentes Grátis',
    };
}

function buildHelpText() {
    return `🎁 *COMANDOS DO AGENDADOR DE PRESENTES*\n\n` +
        `*/presentes status* - Ver se está ligado e resumo do dia\n` +
        `*/presentes hoje* - Listar presentes/ofertas de hoje\n` +
        `*/presentes grupos* - Listar grupos ativos\n` +
        `*/presentes teste* - Enviar a primeira mensagem de hoje no seu privado\n` +
        `*/presentes ligar* - Ligar agendador\n` +
        `*/presentes desligar* - Pausar agendador`;
}

async function handlePresentesCommand(client, message) {
    const sender = message.from;
    const body = String(message.body || '').trim().toLowerCase();
    const status = getPresentesStatus();

    if (body === '/presentes' || body === '/presentes ajuda') {
        await client.sendMessage(sender, buildHelpText());
        return true;
    }

    if (body === '/presentes ligar') {
        schedulerEnabled = true;
        await client.sendMessage(sender, '✅ Agendador de presentes ligado.');
        return true;
    }

    if (body === '/presentes desligar') {
        schedulerEnabled = false;
        await client.sendMessage(sender, '⏸️ Agendador de presentes pausado.');
        return true;
    }

    if (body === '/presentes status') {
        const totalPresentes = status.todayItems.filter(item => item.tipo === 'presente').length;
        const totalOfertas = status.todayItems.filter(item => item.tipo === 'oferta').length;
        await client.sendMessage(sender,
            `🎁 *STATUS DO AGENDADOR*\n\n` +
            `Sistema: *${status.agendaName}*\n` +
            `Status: *${status.enabled ? 'Ligado' : 'Pausado'}*\n` +
            `Timezone: *${status.timezone}*\n` +
            `Hoje: *${status.now.dayKey}*\n` +
            `Grupos ativos: *${status.activeGroups.length}*\n` +
            `Agenda de hoje: *${totalPresentes} presentes* e *${totalOfertas} ofertas*`
        );
        return true;
    }

    if (body === '/presentes grupos') {
        if (status.activeGroups.length === 0) {
            await client.sendMessage(sender, 'Nenhum grupo ativo encontrado em grupos.json.');
            return true;
        }

        let text = '👥 *GRUPOS ATIVOS PARA PRESENTES*\n\n';
        status.activeGroups.forEach((group, index) => {
            text += `*${index + 1}* - ${group.nome || 'Sem nome'}\n${group.groupId}\n\n`;
        });
        await client.sendMessage(sender, text.trim());
        return true;
    }

    if (body === '/presentes hoje') {
        if (status.todayItems.length === 0) {
            await client.sendMessage(sender, `Nenhum item ativo para hoje (${status.now.dayKey}).`);
            return true;
        }

        let text = `📅 *AGENDA DE HOJE - ${status.now.dayKey.toUpperCase()}*\n\n`;
        status.todayItems.forEach(item => {
            text += `⏰ *${item.horario}* - ${item.tipo === 'oferta' ? '🔥 Oferta' : '🎁 Presente'} - ${item.titulo || item.id}\nID: ${item.id}\n\n`;
        });
        await client.sendMessage(sender, text.trim());
        return true;
    }

    if (body === '/presentes teste') {
        const firstItem = status.todayItems[0];
        if (!firstItem) {
            await client.sendMessage(sender, 'Nenhum item ativo encontrado para testar hoje.');
            return true;
        }

        await sendAgendaItem(client, sender, firstItem, loadAgenda().config || {}, '🧪 TESTE DO AGENDADOR\n\n');
        return true;
    }

    await client.sendMessage(sender, buildHelpText());
    return true;
}

module.exports = {
    startPresentesScheduler,
    handlePresentesCommand,
    getPresentesStatus,
};
