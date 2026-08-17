/**
 * Fotos do Copilot: o composer envia várias; o Instagram aceita carrossel de 2–10.
 * Mantém `image` (singular) como alias para clientes antigos.
 */

export const MAX_COPILOT_IMAGES = 10;

export interface CopilotImageInput {
  /** data URL completa: data:image/jpeg;base64,XXXX */
  dataUrl: string;
  name?: string;
  width?: number;
  height?: number;
}

export function collectVisionImages(body: {
  image?: CopilotImageInput | null;
  images?: CopilotImageInput[] | null;
}): CopilotImageInput[] {
  const fromArray = Array.isArray(body.images)
    ? body.images.filter((img) => typeof img?.dataUrl === 'string' && img.dataUrl.length > 0)
    : [];
  const merged = fromArray.length
    ? fromArray
    : body.image?.dataUrl
      ? [body.image]
      : [];
  return merged.slice(0, MAX_COPILOT_IMAGES);
}

export function describeImageMetadata(image: CopilotImageInput): string {
  const bits: string[] = [];
  if (image.name) bits.push(`arquivo "${image.name}"`);
  if (image.width && image.height) {
    bits.push(`${image.width}x${image.height}px`);
    const ratio = image.width / image.height;
    let orientation = 'quadrada (1:1)';
    if (ratio > 1.2) orientation = 'horizontal (paisagem)';
    else if (ratio < 0.7) orientation = 'vertical alta (9:16 — ideal para Reels/Story)';
    else if (ratio < 0.95) orientation = 'vertical (4:5 — ideal para feed)';
    bits.push(orientation);
  }
  return bits.join(', ') || 'sem metadados';
}

export function describeImagesMetadata(images: CopilotImageInput[]): string {
  if (images.length === 1) return describeImageMetadata(images[0]);
  return images
    .map((img, i) => `foto ${i + 1} (${describeImageMetadata(img)})`)
    .join('; ');
}

export function defaultPostPrompt(count: number): string {
  if (count <= 1) return 'Monta um post completo com esta foto.';
  return `Monta um post (carrossel) com estas ${count} fotos, na ordem em que foram anexadas.`;
}

export function visionCanSeeHint(count: number): string {
  const n = count <= 1 ? 'uma FOTO' : `${count} FOTOS (carrossel)`;
  return (
    `O usuário anexou ${n} e você as está recebendo. Baseie a legenda no que ` +
    'realmente aparece nelas — objeto, cenário, cores, texto visível e clima da cena. ' +
    'Seja concreto: mencione elementos que você vê, não generalidades. ' +
    (count > 1
      ? 'Trate como um carrossel: uma legenda única que amarra todas as fotos, na ordem. '
      : '') +
    'Não fale de ChatGPT, DeepSeek nem de limites de outros modelos.'
  );
}

export function visionCannotSeeHint(count: number, metadata: string, provider: string): string {
  const n = count <= 1 ? 'uma FOTO' : `${count} FOTOS (carrossel)`;
  return (
    `O usuário anexou ${n}, mas você (${provider}) é um modelo só de texto ` +
    'e NÃO recebeu os pixels. ' +
    `Metadados disponíveis: ${metadata}. ` +
    'Escreva a legenda a partir do texto do usuário e do nicho. ' +
    'NÃO invente nem descreva detalhes visuais. ' +
    'NÃO mencione ChatGPT, GPT, Claude ou qualquer outro produto. ' +
    'NÃO diga que "não consegue ler imagens" como se fosse um limite do ChatGPT. ' +
    'Use a proporção apenas para sugerir o formato de publicação. ' +
    (count > 1 ? 'Com várias fotos, sugira carrossel. ' : '') +
    'Se o texto do usuário não disser o que as fotos mostram, peça em UMA linha curta ' +
    'no fim que ele descreva a cena para você refinar a legenda.'
  );
}
