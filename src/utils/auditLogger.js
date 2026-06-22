const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');

const auditPath = path.resolve(__dirname, '../../data/audit_log.json');
const MAX_LOGS = 5000;

function logAudit(action, details = {}, actor = 'system') {
  const logs = readJson(auditPath, []);
  logs.push({ id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, timestamp: new Date().toISOString(), actor, action, details });
  if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
  writeJson(auditPath, logs);
}

function listAudit(limit = 200) {
  const logs = readJson(auditPath, []);
  return logs.slice(-Math.max(1, Math.min(Number(limit) || 200, 1000))).reverse();
}

module.exports = { logAudit, listAudit };
