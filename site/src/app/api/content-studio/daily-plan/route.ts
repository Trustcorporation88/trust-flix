import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Gera, a partir de um tema/breve relato dado pelo usuario, um plano de conteudo
 * do dia com modelos prontos para copiar e colar manualmente na publicacao:
 * Reel, Video de TikTok, Story, Imagem/Post estatico e Publicacao (legenda de feed).
 *
 * Usa a mesma chave de IA COMPARTILHADA (server-side) do Content Studio -- o
 * usuario final nunca ve nem precisa informar API key. Configure no ambiente:
 *   CONTENT_STUDIO_AI_PROVIDER  (padrao: 'deepseek')
 *   CONTENT_STUDIO_AI_API_KEY   (obrigatorio)
 *   CONTENT_STUDIO_AI_MODEL     (padrao: 'deepseek-chat')
 *   CONTENT_STUDIO_AI_BASE_URL  (opcional, so para provider 'custom')
 */

type Provider = 'openai' | 'deepseek' | 'anthropic' | 'google' | 'groq' | 'mistral' | 'openrouter' | 'custom';

const OPENAI_COMPATIBLE_BASE: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  mistral: 'https://api.mistral.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

interface RequestBody {
  tema: string;
  nicho?: string;
}

export interface DailyPlanItem {
  titulo: string;
  conteudo: string;
  hashtags: string[];
}

export interface DailyPlan {
  reel: DailyPlanItem;
  tiktok: DailyPlanItem;
  story: DailyPlanItem;
  imagem: DailyPlanItem;
  post: DailyPlanItem;
}

function isConfigured(): boolean {
  return Boolean(process.env.CONTENT_STUDIO_AI_API_KEY);
}

async function callOpenAICompatible(
  base: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.8,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`(${res.status}) ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 1800,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`(${res.status}) ${errText}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callGoogle(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`(${res.status}) ${errText}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function extractJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const jsonSlice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(jsonSlice);
}

function normalizeItem(raw: unknown, fallbackTitulo: string): DailyPlanItem {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const conteudoRaw = obj.conteudo ?? obj.roteiro ?? obj.legenda ?? obj.sequencia;
  const conteudo = Array.isArray(conteudoRaw) ? conteudoRaw.join('\n') : String(conteudoRaw ?? '');
  const hashtagsRaw = obj.hashtags;
  const hashtags = Array.isArray(hashtagsRaw) ? hashtagsRaw.map((h) => String(h)) : [];
  return {
    titulo: typeof obj.titulo === 'string' && obj.titulo ? obj.titulo : fallbackTitulo,
    conteudo,
    hashtags,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error: 'Gerador de IA do Content Studio nao configurado. Defina CONTENT_STUDIO_AI_API_KEY (veja README).',
        },
        { status: 400 }
      );
    }

    const body: RequestBody = await request.json();
    const tema = (body.tema || '').trim();
    if (!tema) {
      return NextResponse.json({ success: false, error: 'Informe o tema ou um breve relato do que precisa postar hoje.' }, { status: 400 });
    }

    const provider = (process.env.CONTENT_STUDIO_AI_PROVIDER || 'deepseek') as Provider;
    const apiKey = process.env.CONTENT_STUDIO_AI_API_KEY as string;
    const model = process.env.CONTENT_STUDIO_AI_MODEL || 'deepseek-chat';
    const baseUrl = process.env.CONTENT_STUDIO_AI_BASE_URL;

    const systemPrompt =
      'Voce e um estrategista de conteudo para Instagram e TikTok. A partir de um tema/briefing informado ' +
      'pelo cliente, voce cria um pacote de conteudo do dia, pronto para o cliente copiar e colar manualmente ' +
      'ao publicar. Responda SOMENTE com um JSON valido (sem markdown, sem texto fora do JSON) no formato:\n' +
      '{\n' +
      '  "reel": { "titulo": string, "conteudo": string (roteiro com gancho, cenas e CTA), "hashtags": string[] },\n' +
      '  "tiktok": { "titulo": string, "conteudo": string (roteiro adaptado ao ritmo/tendencias do TikTok), "hashtags": string[] },\n' +
      '  "story": { "titulo": string, "conteudo": string (sequencia numerada de 2-4 stories, uma linha por story), "hashtags": string[] },\n' +
      '  "imagem": { "titulo": string, "conteudo": string (legenda + descricao do que colocar na arte/imagem), "hashtags": string[] },\n' +
      '  "post": { "titulo": string, "conteudo": string (legenda completa de feed, pronta para publicar), "hashtags": string[] }\n' +
      '}\n' +
      'Escreva em portugues do Brasil, tom direto e com CTA claro em cada formato. Nao inclua explicacoes fora do JSON.';

    const userMessage = `Tema/briefing do dia: "${tema}".${body.nicho ? ` Nicho: ${body.nicho}.` : ''}`;

    let raw = '';
    if (provider === 'anthropic') {
      raw = await callAnthropic(apiKey, model, systemPrompt, userMessage);
    } else if (provider === 'google') {
      raw = await callGoogle(apiKey, model, systemPrompt, userMessage);
    } else {
      const base = provider === 'custom' ? baseUrl : OPENAI_COMPATIBLE_BASE[provider];
      if (!base) throw new Error(`Provider "${provider}" nao suportado ou CONTENT_STUDIO_AI_BASE_URL nao definido.`);
      raw = await callOpenAICompatible(base, apiKey, model, systemPrompt, userMessage);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = extractJson(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'A IA retornou um formato inesperado. Tente novamente.' },
        { status: 502 }
      );
    }

    const data: DailyPlan = {
      reel: normalizeItem(parsed.reel, 'Reel do dia'),
      tiktok: normalizeItem(parsed.tiktok, 'Video de TikTok do dia'),
      story: normalizeItem(parsed.story, 'Sequencia de Stories do dia'),
      imagem: normalizeItem(parsed.imagem, 'Imagem/Post estatico do dia'),
      post: normalizeItem(parsed.post, 'Publicacao do dia'),
    };

    return NextResponse.json({ success: true, tema, provider, model, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao gerar o plano de conteudo do dia' },
      { status: 500 }
    );
  }
}
