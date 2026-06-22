const QRCode = require('qrcode');

function generateBrCode(pixKey, value, merchantName, merchantCity, txid) {
    const format = (id, val) => {
        const len = val.length.toString().padStart(2, '0');
        return `${id}${len}${val}`;
    };

    const payload = [
        format('00', '01'),
        format('26', `${format('00', 'br.gov.bcb.pix')}${format('01', pixKey)}`),
        format('52', '0000'),
        format('53', '986'),
        format('54', value.toFixed(2)),
        format('58', 'BR'),
        format('59', merchantName.substring(0, 25)),
        format('60', merchantCity.substring(0, 15)),
        format('62', `${format('05', txid || '***')}`),
    ].join('');

    const crc16 = (data) => {
        let crc = 0xFFFF;
        for (let i = 0; i < data.length; i++) {
            crc ^= data.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
            }
        }
        return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    };

    const payloadWithCrc = `${payload}6304`;
    const finalPayload = payloadWithCrc + crc16(payloadWithCrc);

    return finalPayload;
}

// BUG FIX: merchantName agora recebe o nome da marca em vez de "Vendedor" hardcoded.
// A cidade pode ser configurada futuramente; "SAO PAULO" é um padrão aceitável pelo Banco Central.
function sanitizePixText(value, fallback, maxLength) {
    const normalized = String(value || fallback)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return (normalized || fallback).substring(0, maxLength);
}

async function generatePix(pixKey, value, merchantName = 'VENDEDOR', merchantCity = 'SAO PAULO') {
    const safeName = sanitizePixText(merchantName, 'VENDEDOR', 25);
    const safeCity = sanitizePixText(merchantCity, 'SAO PAULO', 15);
    const brCode = generateBrCode(String(pixKey || '').trim(), Number(value), safeName, safeCity);
    try {
        const qrCodeDataURL = await QRCode.toDataURL(brCode);
        return {
            qrCodeBase64: qrCodeDataURL.replace('data:image/png;base64,', ''),
            pixCopyPaste: brCode,
        };
    } catch (err) {
        console.error('Erro ao gerar QR Code para PIX manual:', err);
        return null;
    }
}

module.exports = { generatePix };
