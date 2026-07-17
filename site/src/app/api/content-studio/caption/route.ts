import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Gera a legenda/roteiro de um template do Content Studio usando a chave de IA
 * COMPARTILHADA da TrustFlix (server-side) — diferente do Arsenal de Agentes,
 * que usa BYOK (chave do próprio cliente salva no localStorage).
 *
 * O cliente final do Content Studio nunca vê nem precisa informar uma API key:
 * quem paga a chamada é a TrustFlix. Configure no ambiente (Vercel):
 *   CONTENT_STUDIO_AI_PROVIDER  (padrão: 'deepseek')
 *   CONTENT_STUDIO_AI_API_KEY   (obrigatório)
 *   CONTENT_STUDIO_AI_MODEL     (padrão: 'deepseek-chat')
 *   CONTENT_STUDIO_AI_BASE_URL  (opcional, só para provider 'custom')
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
  format: string;
  title: string;
  objetivo: string;
  nicho: string;
  estrutura: string[];
  platforms?: string[];
}

function isConfigured(): boolean {
  return Boolean(process.env.CONTENT_STUDIO_AI_API_KEY);
}

async function callOpenAICompatible(base: string, apiKey: string, model: string, systemPrompt: string, userMessage: string) {
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
      temperature: 0.7,
      max_tokens: 500,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`(${res.status}) ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(apiKey: string, model: string, systemPrompt: string, userMessage: string) {
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
      max_tokens: 500,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`(${res.status}) ${errText}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callGoogle(apiKey: string, model: string, systemPrompt: string, userMessage: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
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

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    if (!isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error: 'Gerador de IA do Content Studio não configurado. Defina CONTENT_STUDIO_AI_API_KEY (veja README).',
        },
        { status: 400 }
      );
    }

    const body: RequestBody = await request.json();
    const provider = (process.env.CONTENT_STUDIO_AI_PROVIDER || 'deepseek') as Provider;
    const apiKey = process.env.CONTENT_STUDIO_AI_API_KEY as string;
    const model = process.env.CONTENT_STUDIO_AI_MODEL || 'deepseek-chat';
    const baseUrl = process.env.CONTENT_STUDIO_AI_BASE_URL;

    const platforms = (body.platforms || ['instagram', 'tiktok']).map((p) => p.toLowerCase());
    const forTikTok = platforms.includes('tiktok');
    const forIg = platforms.includes('instagram');
    const platformHint =
      forTikTok && forIg
        ? 'A legenda deve funcionar bem em Instagram e TikTok (gancho forte, CTA, hashtags leves).'
        : forTikTok
          ? 'Otimize para TikTok: gancho nos primeiros segundos, linguagem oral, CTA e 3–5 hashtags.'
          : 'Otimize para Instagram: legenda escaneável, emoji com moderação e CTA claro.';

    const systemPrompt =
      'Você é um copywriter especialista em Instagram e TikTok. Escreva legendas curtas, ' +
      'diretas e com CTA claro. ' +
      platformHint +
      ' Responda APENAS com JSON válido no formato ' +
      '{"caption":"...","tiktokTitle":"..."} sem markdown. ' +
      'tiktokTitle deve ter no máximo 90 caracteres (título do vídeo TikTok).';
    const userMessage =
      `Crie copy para um ${body.format} do tipo "${body.title}" (objetivo: ${body.objetivo}), ` +
      `nicho: ${body.nicho || 'geral'}. Estrutura sugerida: ${(body.estrutura || []).join(' -> ')}. ` +
      `Plataformas: ${platforms.join(', ')}.`;

    let raw = '';
    if (provider === 'anthropic') {
      raw = await callAnthropic(apiKey, model, systemPrompt, userMessage);
    } else if (provider === 'google') {
      raw = await callGoogle(apiKey, model, systemPrompt, userMessage);
    } else {
      const base = provider === 'custom' ? baseUrl : OPENAI_COMPATIBLE_BASE[provider];
      if (!base) throw new Error(`Provider "${provider}" não suportado ou CONTENT_STUDIO_AI_BASE_URL não definido.`);
      raw = await callOpenAICompatible(base, apiKey, model, systemPrompt, userMessage);
    }

    let caption = raw.trim();
    let tiktokTitle = body.title.slice(0, 90);
    try {
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned) as { caption?: string; tiktokTitle?: string };
      if (parsed.caption) caption = parsed.caption;
      if (parsed.tiktokTitle) tiktokTitle = String(parsed.tiktokTitle).slice(0, 90);
    } catch {
      // resposta em texto puro — usa como caption
    }

    return NextResponse.json({ success: true, caption, tiktokTitle, provider, model });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao gerar legenda' },
      { status: 500 }
    );
  }
}
