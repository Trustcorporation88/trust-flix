import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Provider =
  | 'openai'
  | 'deepseek'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'mistral'
  | 'openrouter'
  | 'custom';

interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ExecuteBody {
  provider: Provider;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}

const OPENAI_COMPATIBLE_BASE: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  mistral: 'https://api.mistral.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

async function callOpenAICompatible(
  base: string,
  body: ExecuteBody,
  messages: AgentMessage[]
): Promise<string> {
  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${body.apiKey}`,
    },
    body: JSON.stringify({
      model: body.model,
      messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.maxTokens ?? 2000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`(${res.status}) ${parseError(errText)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(body: ExecuteBody, messages: AgentMessage[]): Promise<string> {
  const systemMessage = messages.find((m) => m.role === 'system')?.content ?? '';
  const otherMessages = messages.filter((m) => m.role !== 'system');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': body.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: body.model,
      max_tokens: body.maxTokens ?? 2000,
      system: systemMessage,
      messages: otherMessages,
      temperature: body.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`(${res.status}) ${parseError(errText)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callGoogle(body: ExecuteBody, messages: AgentMessage[]): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${body.model}:generateContent?key=${body.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        systemInstruction: {
          parts: [{ text: messages.find((m) => m.role === 'system')?.content ?? '' }],
        },
        generationConfig: {
          temperature: body.temperature ?? 0.7,
          maxOutputTokens: body.maxTokens ?? 2000,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`(${res.status}) ${parseError(errText)}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function parseError(text: string): string {
  try {
    const obj = JSON.parse(text);
    return obj.error?.message || obj.message || text;
  } catch {
    return text;
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (isAuthError(auth)) return auth;

  let body: ExecuteBody;
  try {
    body = (await req.json()) as ExecuteBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido no corpo da requisição.' }, { status: 400 });
  }

  if (!body.apiKey) {
    return NextResponse.json({ error: 'API key não informada.' }, { status: 400 });
  }
  if (!body.model) {
    return NextResponse.json({ error: 'Modelo não informado.' }, { status: 400 });
  }

  const messages: AgentMessage[] = [
    { role: 'system', content: body.systemPrompt || '' },
    { role: 'user', content: body.userMessage || '' },
  ];

  const startedAt = Date.now();

  try {
    let response: string;

    switch (body.provider) {
      case 'anthropic':
        response = await callAnthropic(body, messages);
        break;
      case 'google':
        response = await callGoogle(body, messages);
        break;
      case 'custom':
        if (!body.baseUrl) {
          return NextResponse.json(
            { error: 'baseUrl é obrigatório para o provider custom.' },
            { status: 400 }
          );
        }
        response = await callOpenAICompatible(body.baseUrl, body, messages);
        break;
      case 'openai':
      case 'deepseek':
      case 'groq':
      case 'mistral':
      case 'openrouter':
        response = await callOpenAICompatible(OPENAI_COMPATIBLE_BASE[body.provider], body, messages);
        break;
      default:
        return NextResponse.json(
          { error: `Provider não suportado: ${body.provider}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      response,
      provider: body.provider,
      model: body.model,
      duration: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
