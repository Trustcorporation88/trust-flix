const crypto = require('crypto');

function safeEqual(a, b) {
  // BUG FIX: comparar .length antes de timingSafeEqual vaza o tamanho do segredo
  // por timing side-channel. Solução: normalizar ambos os buffers para o mesmo
  // comprimento antes da comparação criptográfica.
  const maxLen = Math.max(String(a || '').length, String(b || '').length, 1);
  const left  = Buffer.alloc(maxLen);
  const right = Buffer.alloc(maxLen);
  left.write(String(a || ''));
  right.write(String(b || ''));
  return crypto.timingSafeEqual(left, right);
}

function extractSecret(req) {
  return String(
    req.get('x-webhook-secret') ||
    req.get('x-jetbot-webhook-secret') ||
    req.get('x-jetflix-webhook-secret') ||
    req.query?.secret ||
    ''
  );
}

function validateWebhook(req) {
  const expected = String(process.env.WEBHOOK_SECRET || '').trim();
  const production = process.env.NODE_ENV === 'production';
  const allowUnsigned = String(process.env.ALLOW_UNSIGNED_WEBHOOKS || '').toLowerCase() === 'true';
  if (!expected) {
    if (production && !allowUnsigned) return { ok: false, status: 503, error: 'Webhook desativado: configure WEBHOOK_SECRET.' };
    return { ok: true, unsigned: true };
  }
  const received = extractSecret(req);
  if (!received || !safeEqual(received, expected)) return { ok: false, status: 401, error: 'Assinatura do webhook inválida.' };
  return { ok: true };
}

module.exports = { validateWebhook, safeEqual };
