const fs = require('fs');
const path = require('path');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath, fallback) {
  ensureDir(filePath);
  if (!fs.existsSync(filePath)) {
    writeJson(filePath, fallback);
    return clone(fallback);
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return clone(fallback);
    return JSON.parse(raw);
  } catch (error) {
    const corruptPath = `${filePath}.corrupt-${Date.now()}`;
    try { fs.copyFileSync(filePath, corruptPath); } catch (_) {}
    console.error(`❌ JSON inválido em ${filePath}. Cópia preservada em ${corruptPath}:`, error.message);
    writeJson(filePath, fallback);
    return clone(fallback);
  }
}

function writeJson(filePath, data) {
  ensureDir(filePath);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const content = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(tempPath, content, { encoding: 'utf8', mode: 0o600 });
  try {
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (process.platform === 'win32' && (error.code === 'EPERM' || error.code === 'EACCES' || error.code === 'EBUSY')) {
      try {
        fs.copyFileSync(tempPath, filePath);
        fs.unlinkSync(tempPath);
      } catch (innerError) {
        throw new Error(`Falha no fallback atômico no Windows: ${innerError.message} (original: ${error.message})`);
      }
    } else {
      throw error;
    }
  }
  return true;
}

function updateJson(filePath, fallback, updater) {
  const current = readJson(filePath, fallback);
  const draft = clone(current);
  const result = updater(draft);
  writeJson(filePath, draft);
  return result === undefined ? draft : result;
}

module.exports = { readJson, writeJson, updateJson, ensureDir };
