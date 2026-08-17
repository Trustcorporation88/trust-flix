/**
 * 🧹 Limpeza de texto para publicação.
 *
 * Instagram e TikTok NÃO renderizam markdown. Se o modelo devolver "**Chama no
 * direct**", os asteriscos vão literalmente para o post. O prompt já proíbe
 * markdown, mas isto é a rede de segurança: modelos ocasionalmente escapam da
 * instrução, e o custo de um post publicado com `**` é alto.
 */

/** Remove marcações markdown, preservando o texto e as quebras de linha. */
export function stripMarkdown(text: string): string {
  return (
    text
      // **negrito** e __negrito__
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      // *itálico* e _itálico_ (evita mexer em *asterisco solto* usado como bullet)
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,!?)]|$)/g, '$1$2')
      .replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,!?)]|$)/g, '$1$2')
      // `código`
      .replace(/`([^`]+)`/g, '$1')
      // ### títulos → texto puro
      .replace(/^#{1,6}\s+/gm, '')
      // bullets "- " ou "* " no início da linha → "• "
      .replace(/^[-*]\s+/gm, '• ')
      // links [texto](url) → texto (url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
      .trim()
  );
}

/**
 * Extrai apenas a legenda de uma resposta estruturada da skill "post".
 * A skill "post" agora devolve só a legenda. Respostas antigas ainda podem
 * ter seções (Legenda / Título TikTok / Hashtags / Formato) — extraímos a
 * legenda + hashtags e ignoramos o resto.
 */
export function extractCaption(reply: string): string {
  const clean = stripMarkdown(reply);

  const legendaMatch = clean.match(
    /(?:^|\n)\s*Legenda\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:T[íi]tulo TikTok|Hashtags|Formato)\s*:?|\s*$)/i
  );
  const hashtagsMatch = clean.match(
    /(?:^|\n)\s*Hashtags\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:T[íi]tulo TikTok|Formato)\s*:?|\s*$)/i
  );

  if (!legendaMatch) return clean;

  const legenda = legendaMatch[1].trim();
  const hashtags = hashtagsMatch?.[1]?.trim();
  return hashtags ? `${legenda}\n\n${hashtags}` : legenda;
}

/** Extrai o título de TikTok, se a resposta tiver essa seção (máx 90 chars). */
export function extractTikTokTitle(reply: string): string | undefined {
  const clean = stripMarkdown(reply);
  const m = clean.match(
    /(?:^|\n)\s*T[íi]tulo TikTok\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:Legenda|Hashtags|Formato)\s*:?|\s*$)/i
  );
  const title = m?.[1]?.trim().split('\n')[0]?.trim();
  return title ? title.slice(0, 90) : undefined;
}
