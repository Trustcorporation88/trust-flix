const fs = require('fs');
const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { logAudit } = require('./auditLogger');

const root = path.resolve(__dirname, '../..');
const backupDir = path.join(root, 'backups');
const includeFiles = [
  'config.js', 'aiConfig.json', 'adminConfig.js', 'agenda.json', 'grupos.json', 'disparos.json', 'marketing.json', 'automation.json',
  'data/setup.json', 'data/integrations.json', 'data/funnel.json',
  'database/database.json', 'data/stock.json', 'data/orders.json', 'data/pending_payments.json', 'data/tickets.json',
  'data/marketing_leads.json', 'data/sales_log.json', 'data/disparos_state.json', 'data/marketing_state.json', 'data/audit_log.json',
  'data/automation_queue.json', 'data/automation_alerts.json', 'data/system_health.json',
];

function ensure() { fs.mkdirSync(backupDir, { recursive: true }); }
function createBackup(actor = 'admin') {
  ensure();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = { version: 1, createdAt: new Date().toISOString(), files: {} };
  for (const relative of includeFiles) {
    const absolute = path.join(root, relative);
    if (fs.existsSync(absolute)) backup.files[relative] = fs.readFileSync(absolute, 'utf8');
  }
  const filename = `backup-${stamp}.json`;
  writeJson(path.join(backupDir, filename), backup);
  logAudit('backup.created', { filename }, actor);
  return { filename, createdAt: backup.createdAt, size: fs.statSync(path.join(backupDir, filename)).size };
}

function listBackups() {
  ensure();
  return fs.readdirSync(backupDir).filter((name) => /^backup-.*\.json$/.test(name)).map((filename) => {
    const stat = fs.statSync(path.join(backupDir, filename));
    return { filename, size: stat.size, createdAt: stat.mtime.toISOString() };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getBackupPath(filename) {
  if (!/^backup-[a-zA-Z0-9_.-]+\.json$/.test(filename)) return null;
  const target = path.join(backupDir, filename);
  return fs.existsSync(target) ? target : null;
}

function restoreBackup(filename, actor = 'admin') {
  const target = getBackupPath(filename);
  if (!target) throw new Error('Backup não encontrado.');
  const backup = readJson(target, null);
  if (!backup || !backup.files) throw new Error('Backup inválido.');
  createBackup('system-before-restore');
  for (const [relative, content] of Object.entries(backup.files)) {
    const absolute = path.join(root, relative);
    if (!absolute.startsWith(root)) continue;
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content, 'utf8');
  }
  logAudit('backup.restored', { filename }, actor);
  return true;
}

module.exports = { createBackup, listBackups, getBackupPath, restoreBackup };
