'use client';

/**
 * Preparo de mídia no navegador antes do upload para o Postiz.
 *
 * - Fotos viram JPEG (a Content Publishing API do Instagram recusa PNG/WebP)
 *   com no máximo 1440px no lado maior. Isso também resolve o limite de
 *   ~4.4MB por requisição da Vercel para quase toda foto de celular.
 * - "Ajustar ao feed" encaixa a foto em 4:5 ou 1.91:1 com fundo desfocado,
 *   sem cortar nada da imagem original.
 */
import { IG_LIMITS } from '@/lib/instagramRules';

export interface PreparedMedia {
  file: File;
  kind: 'image' | 'video';
  width: number;
  height: number;
  previewUrl: string;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível ler a imagem (HEIC? exporte como JPG).'));
    img.src = src;
  });
}

function readVideoMeta(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const done = () => resolve({ width: video.videoWidth || 0, height: video.videoHeight || 0 });
    video.onloadedmetadata = done;
    video.onerror = () => resolve({ width: 0, height: 0 });
    video.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao converter a imagem.'))),
      'image/jpeg',
      quality
    );
  });
}

function jpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'foto';
  return `${base}.jpg`;
}

async function encodeUnderLimit(canvas: HTMLCanvasElement): Promise<Blob> {
  let quality = 0.9;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > IG_LIMITS.directUploadMaxBytes && quality > 0.5) {
    quality -= 0.1;
    blob = await canvasToJpeg(canvas, quality);
  }
  return blob;
}

/** Desenha a imagem no canvas no tamanho final (e com moldura, se `targetRatio`). */
function drawToCanvas(img: HTMLImageElement, targetRatio?: number): HTMLCanvasElement {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  let outW = srcW;
  let outH = srcH;

  if (targetRatio) {
    const r = srcW / srcH;
    if (r < targetRatio) outW = Math.round(srcH * targetRatio);
    else outH = Math.round(srcW / targetRatio);
  }

  const scale = Math.min(1, IG_LIMITS.imageMaxEdge / Math.max(outW, outH));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(outW * scale);
  canvas.height = Math.round(outH * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');

  const drawW = Math.round(srcW * scale);
  const drawH = Math.round(srcH * scale);
  const dx = Math.round((canvas.width - drawW) / 2);
  const dy = Math.round((canvas.height - drawH) / 2);

  if (targetRatio && (drawW !== canvas.width || drawH !== canvas.height)) {
    ctx.fillStyle = '#f5f5f4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cover = Math.max(canvas.width / srcW, canvas.height / srcH);
    const bw = srcW * cover;
    const bh = srcH * cover;
    ctx.save();
    ctx.filter = 'blur(28px) brightness(0.9)';
    ctx.drawImage(img, (canvas.width - bw) / 2, (canvas.height - bh) / 2, bw, bh);
    ctx.restore();
  }

  ctx.drawImage(img, dx, dy, drawW, drawH);
  return canvas;
}

export async function prepareMedia(file: File): Promise<PreparedMedia> {
  if (file.type.startsWith('video/')) {
    const previewUrl = URL.createObjectURL(file);
    const { width, height } = await readVideoMeta(previewUrl);
    return { file, kind: 'video', width, height, previewUrl };
  }

  const srcUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(srcUrl);
    const isJpeg = file.type === 'image/jpeg';
    const needsResize = Math.max(img.naturalWidth, img.naturalHeight) > IG_LIMITS.imageMaxEdge;
    const tooHeavy = file.size > IG_LIMITS.directUploadMaxBytes;

    if (isJpeg && !needsResize && !tooHeavy) {
      return {
        file,
        kind: 'image',
        width: img.naturalWidth,
        height: img.naturalHeight,
        previewUrl: srcUrl,
      };
    }

    const canvas = drawToCanvas(img);
    const blob = await encodeUnderLimit(canvas);
    URL.revokeObjectURL(srcUrl);
    const out = new File([blob], jpegName(file.name), { type: 'image/jpeg' });
    return {
      file: out,
      kind: 'image',
      width: canvas.width,
      height: canvas.height,
      previewUrl: URL.createObjectURL(out),
    };
  } catch (err) {
    URL.revokeObjectURL(srcUrl);
    throw err;
  }
}

/** Encaixa a foto na proporção de feed mais próxima (4:5 ou 1.91:1). */
export async function fitImageToFeed(media: PreparedMedia): Promise<PreparedMedia> {
  if (media.kind !== 'image') return media;
  const ratio = media.width / media.height;
  const target =
    ratio < IG_LIMITS.feedRatioMin ? IG_LIMITS.feedRatioMin : ratio > IG_LIMITS.feedRatioMax ? IG_LIMITS.feedRatioMax : 0;
  if (!target) return media;

  const img = await loadImageElement(media.previewUrl);
  const canvas = drawToCanvas(img, target);
  const blob = await encodeUnderLimit(canvas);
  const out = new File([blob], jpegName(media.file.name), { type: 'image/jpeg' });
  URL.revokeObjectURL(media.previewUrl);
  return {
    file: out,
    kind: 'image',
    width: canvas.width,
    height: canvas.height,
    previewUrl: URL.createObjectURL(out),
  };
}
