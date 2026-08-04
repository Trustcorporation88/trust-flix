/**
 * 🖼️ Preparo de imagem no cliente, antes de enviar para a IA.
 *
 * Motivo: foto de celular tem 3–8MB e a Vercel limita o corpo da requisição a
 * ~4.5MB — pior ainda, base64 infla o payload em ~33%. Enviar a original faria
 * a chamada falhar com 413.
 *
 * Estratégia: a versão REDUZIDA vai para a IA (só precisa ser legível para o
 * modelo descrever a cena), e o arquivo ORIGINAL vai para o Postiz, preservando
 * a qualidade do post publicado.
 */

export interface PreparedImage {
  /** data URL já reduzida, pronta para o payload da IA */
  dataUrl: string;
  /** dimensões ORIGINAIS — usadas para sugerir formato (Reels 9:16, feed 4:5) */
  width: number;
  height: number;
  name: string;
}

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.85;

/** Lê dimensões de um arquivo de imagem. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    img.src = url;
  });
}

/**
 * Reduz a imagem para caber no payload da IA, preservando a proporção.
 * Retorna também as dimensões originais, que é o que importa para decidir formato.
 */
export async function prepareImageForVision(file: File): Promise<PreparedImage> {
  const img = await loadImage(file);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  const scale = Math.min(1, MAX_EDGE / Math.max(originalWidth, originalHeight));
  const w = Math.round(originalWidth * scale);
  const h = Math.round(originalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  ctx.drawImage(img, 0, 0, w, h);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
    width: originalWidth,
    height: originalHeight,
    name: file.name,
  };
}

/** Rótulo de formato a partir da proporção — mostrado na miniatura. */
export function aspectLabel(width: number, height: number): string {
  if (!width || !height) return '';
  const ratio = width / height;
  if (ratio > 1.2) return 'horizontal';
  if (ratio < 0.7) return '9:16 · Reels';
  if (ratio < 0.95) return '4:5 · feed';
  return '1:1 · quadrada';
}
