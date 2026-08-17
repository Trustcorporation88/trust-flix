/**
 * ⚙️ Copilot Actions — dá "mãos" ao Copilot.
 *
 * Enquanto as skills (copilotRouter) só GERAM texto, este módulo permite ao
 * Copilot EXECUTAR entregas usando as ferramentas que o site já tem por baixo
 * (Postiz): agendar post/story, publicar agora, listar o que está agendado e
 * listar as contas conectadas.
 *
 * Fluxo (multi-turno, stateless):
 *  1. O usuário pede ("agenda esse post pra amanhã 18h").
 *  2. Um extrator (LLM, saída em JSON) transforma o pedido em uma AÇÃO estruturada.
 *  3. Publicar/agendar é IRREVERSÍVEL e voltado ao público → NUNCA executa direto.
 *     Devolvemos um resumo + um `pendingAction` que o cliente reenvia no próximo
 *     turno. Só quando o usuário CONFIRMA é que a ação roda de verdade.
 *
 * A mídia (foto/vídeo) já vem do Postiz: o composer do Copilot sobe a foto ao
 * anexá-la e guarda a referência {id, path}. Ela viaja dentro do pendingAction
 * para sobreviver ao turno de confirmação (o "confirmar" não reanexa a foto).
 */
import {
  postizService,
  type PostizIntegration,
  type PostizMedia,
  type PostizPost,
} from '@/services/postizService';

/** Identificador da skill de ação no router. Mantém tudo em um só lugar. */
export const ACTION_SKILL_ID = 'agendar';

export type ActionIntent =
  | 'schedule'
  | 'publish_now'
  | 'list_scheduled'
  | 'list_accounts'
  | 'none';

/** Referência de mídia no Postiz (mesma forma de PostizMedia). */
export type ActionMedia = PostizMedia;

/**
 * Ação pendente aguardando confirmação. Viaja de ida e volta entre servidor e
 * cliente (o cliente reenvia no próximo turno). Contém TUDO que é preciso para
 * executar sem depender de estado do servidor.
 */
export interface PendingAction {
  intent: 'schedule' | 'publish_now';
  integrationId: string;
  integrationName: string;
  integrationType: string;
  content: string;
  postType: 'post' | 'story';
  /** ISO; ausente = publicar agora. */
  scheduledFor?: string;
  media: ActionMedia[];
}

/** Saída bruta do extrator de intenção. */
interface ActionExtraction {
  intent: ActionIntent;
  /** A mensagem confirma uma ação pendente? */
  confirm?: boolean;
  /** A mensagem cancela uma ação pendente? */
  cancel?: boolean;
  /** Texto para casar com uma conta conectada (nome/@/plataforma). */
  accountQuery?: string;
  /** Legenda/texto do post. */
  content?: string;
  postType?: 'post' | 'story';
  /** ISO -03:00 quando intent = schedule. */
  scheduledFor?: string;
}

export interface RunActionInput {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  /** Mídia anexada nesta mensagem (referência do Postiz), se houver. */
  media?: ActionMedia[];
  /** Ação pendente reenviada pelo cliente (turno de confirmação). */
  pendingAction?: PendingAction | null;
  /** Handle do Instagram autorizado — usado como conta padrão. */
  defaultHandle: string;
  /** "Agora" do servidor em ISO — base para datas relativas e listagens. */
  nowISO: string;
  /**
   * Chama o LLM com um par (system, user) e devolve o texto. Injetado pelo
   * route.ts para reaproveitar a resolução de provedor/fallback já existente.
   */
  llm: (system: string, user: string) => Promise<string>;
}

export interface RunActionResult {
  reply: string;
  /** Ação aguardando confirmação (ou null quando não há nada pendente). */
  pendingAction: PendingAction | null;
  /** Intenção resolvida (para telemetria/UI). */
  intent: ActionIntent;
  /** true quando algo foi realmente publicado/agendado neste turno. */
  executed: boolean;
}

const TZ = 'America/Sao_Paulo';

function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Formata um ISO em data/hora legível pt-BR (fuso de São Paulo). */
export function formatDatePt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ,
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

/** Só contas de Instagram (o site é focado em IG; evita agendar no lugar errado). */
function isInstagram(i: PostizIntegration): boolean {
  return /instagram/.test(normalize(i.identifier));
}

/**
 * Casa o pedido do usuário com uma conta conectada.
 * - Com `query`: procura por nome/perfil/plataforma.
 * - Sem `query`: usa a conta autorizada (defaultHandle) ou, se só houver uma
 *   conta, essa. Caso contrário devolve null (ambíguo → pede para escolher).
 */
export function resolveIntegration(
  accounts: PostizIntegration[],
  query: string | undefined,
  defaultHandle: string
): PostizIntegration | null {
  if (!accounts.length) return null;
  const q = normalize(query || '');

  if (q) {
    const hit = accounts.find((a) => {
      const hay = normalize(`${a.name} ${a.profile || ''} ${a.identifier}`);
      return hay.includes(q);
    });
    if (hit) return hit;
  }

  const handle = normalize(defaultHandle);
  if (handle) {
    const byHandle = accounts.find((a) =>
      normalize(`${a.name} ${a.profile || ''}`).includes(handle)
    );
    if (byHandle) return byHandle;
  }

  const igAccounts = accounts.filter(isInstagram);
  if (igAccounts.length === 1) return igAccounts[0];
  if (accounts.length === 1) return accounts[0];
  return null;
}

/** Lista as contas conectadas em texto pronto para o chat. */
export function formatAccountsReply(accounts: PostizIntegration[]): string {
  if (!accounts.length) {
    return 'Nenhuma conta conectada no Postiz ainda. Conecte o Instagram no painel do Postiz para eu poder agendar.';
  }
  const lines = accounts.map((a) => {
    const plat = a.identifier?.replace('-standalone', '') || 'conta';
    return `• ${a.name}${a.profile ? ` (@${a.profile})` : ''} — ${plat}`;
  });
  return `Contas conectadas que eu posso usar:\n${lines.join('\n')}\n\nÉ só dizer, por exemplo: "agenda pra ${accounts[0].name} amanhã às 18h".`;
}

/** Lista os posts agendados/publicados em texto pronto para o chat. */
export function formatScheduledReply(posts: PostizPost[]): string {
  const items = posts
    .map((p) => {
      const when = formatDatePt(p.publishDate || p.date);
      const acc = p.integration?.name || p.integration?.identifier || 'conta';
      const state = String(p.state || p.status || '').toLowerCase();
      const label =
        state.includes('publish') || state.includes('done')
          ? 'publicado'
          : state.includes('error') || state.includes('fail')
            ? 'ERRO'
            : 'agendado';
      const snippet = String(p.content || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 70);
      return { when, text: `• ${when || 's/ data'} · ${acc} · ${label}${snippet ? ` — "${snippet}${snippet.length >= 70 ? '…' : ''}"` : ''}` };
    })
    .filter((x) => x.text);

  if (!items.length) {
    return 'Não encontrei nada agendado nos próximos 30 dias. Quer que eu agende algo? Anexe a foto e me diga a legenda e o horário.';
  }
  return `Agenda dos próximos 30 dias (${items.length}):\n${items.map((i) => i.text).join('\n')}`;
}

/** Resumo que o usuário precisa aprovar antes de a ação rodar. */
export function buildConfirmationSummary(pending: PendingAction): string {
  const acc = pending.integrationName;
  const formato = pending.postType === 'story' ? 'Story (24h)' : 'Feed/Reel';
  const quando =
    pending.intent === 'publish_now'
      ? 'AGORA'
      : `${formatDatePt(pending.scheduledFor)} (horário de Brasília)`;
  const midia = pending.media.length
    ? `${pending.media.length} arquivo(s) anexado(s)`
    : 'sem mídia';
  const legenda = pending.content.trim() || '(sem legenda)';

  return [
    pending.intent === 'publish_now'
      ? '📤 Confirmar PUBLICAÇÃO IMEDIATA:'
      : '🗓️ Confirmar AGENDAMENTO:',
    `• Conta: ${acc}`,
    `• Quando: ${quando}`,
    `• Formato: ${formato}`,
    `• Mídia: ${midia}`,
    '• Legenda:',
    legenda,
    '',
    'Responda CONFIRMAR para eu executar, ou me diga o que mudar (horário, conta, legenda). Para desistir, diga CANCELAR.',
  ].join('\n');
}

function buildExtractionPrompt(input: {
  nowISO: string;
  accounts: PostizIntegration[];
  hasMedia: boolean;
  pending?: PendingAction | null;
  lastGeneratedContent?: string;
}): string {
  const nowLocal = formatDatePt(input.nowISO);
  const accountList = input.accounts.length
    ? input.accounts
        .map((a) => `- ${a.name}${a.profile ? ` (@${a.profile})` : ''} [${a.identifier}]`)
        .join('\n')
    : '(nenhuma conta conectada)';

  const pendingBlock = input.pending
    ? `\nHÁ UMA AÇÃO PENDENTE aguardando confirmação:\n${JSON.stringify(
        {
          intent: input.pending.intent,
          conta: input.pending.integrationName,
          quando: input.pending.scheduledFor || 'agora',
          postType: input.pending.postType,
          content: input.pending.content,
        },
        null,
        0
      )}\nSe a mensagem do usuário confirma (ex: "confirmar", "pode publicar", "sim", "manda", "isso"), retorne {"confirm": true, "intent": "<mesma da pendente>"}.\nSe cancela (ex: "cancelar", "deixa", "não", "espera"), retorne {"cancel": true, "intent": "none"}.\nSe pede uma MUDANÇA (outro horário, outra conta, mexer na legenda), retorne intent igual ao da pendente + só os campos que mudam.\n`
    : '';

  const lastContent = input.lastGeneratedContent
    ? `\nÚLTIMO CONTEÚDO GERADO NA CONVERSA (use como legenda quando o usuário disser "esse post", "essa legenda", "isso"):\n"""\n${input.lastGeneratedContent.slice(0, 1500)}\n"""\n`
    : '';

  return `Você é um interpretador de comandos de agendamento/publicação para redes sociais. Sua ÚNICA saída é um objeto JSON válido, sem markdown, sem comentários.

DATA/HORA ATUAL: ${nowLocal} (fuso America/Sao_Paulo, UTC-03:00).
FOTO/VÍDEO ANEXADO NESTA MENSAGEM: ${input.hasMedia ? 'SIM' : 'NÃO'}.

CONTAS CONECTADAS:
${accountList}
${pendingBlock}${lastContent}
Campos possíveis do JSON:
{
  "intent": "schedule" | "publish_now" | "list_scheduled" | "list_accounts" | "none",
  "confirm": boolean,        // true só quando confirma uma ação pendente
  "cancel": boolean,         // true só quando cancela uma ação pendente
  "accountQuery": string,    // nome/@ da conta citada; vazio se não citou
  "content": string,         // a legenda/texto do post
  "postType": "post" | "story",
  "scheduledFor": string     // ISO 8601 com offset -03:00, só quando intent = schedule
}

Regras:
- "agende", "agenda pra...", "deixa marcado" → intent "schedule" (precisa de scheduledFor).
- "publica agora", "posta agora", "sobe agora", "joga no ar" → intent "publish_now" (sem scheduledFor).
- "o que está agendado", "meus agendamentos", "agenda da semana" → intent "list_scheduled".
- "quais contas", "contas conectadas" → intent "list_accounts".
- Converta datas relativas ("amanhã 18h", "sexta de manhã", "daqui 2 horas") para ISO absoluto com base na DATA/HORA ATUAL. Se o usuário não disser horário para um agendamento, use 09:00.
- Se for Story, postType "story"; senão "post".
- Não invente legenda: se o usuário não deu texto e não há conteúdo gerado para reaproveitar, deixe "content" vazio.
- Responda SOMENTE o JSON.`;
}

function parseExtraction(raw: string): ActionExtraction | null {
  const cleaned = (raw || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  // Isola o primeiro objeto JSON, caso o modelo tenha falado antes/depois.
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as ActionExtraction;
    if (!obj || typeof obj !== 'object') return null;
    return obj;
  } catch {
    return null;
  }
}

/** Pega a última legenda gerada pelo assistente (para "agenda esse post"). */
function lastAssistantContent(history: RunActionInput['history']): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant' && history[i].content?.trim()) {
      return history[i].content;
    }
  }
  return undefined;
}

/** Settings extras por plataforma (TikTok exige um título). */
function platformExtras(integrationType: string, content: string) {
  if (/tiktok/.test(normalize(integrationType))) {
    const title = content.split('\n')[0]?.slice(0, 90) || 'Novo vídeo';
    return { tiktok: { title } as const };
  }
  return {};
}

/** Executa de fato a ação já confirmada. */
async function executePending(pending: PendingAction): Promise<RunActionResult> {
  await postizService.createPost({
    integrationId: pending.integrationId,
    integrationType: pending.integrationType,
    content: pending.content,
    media: pending.media,
    postType: pending.postType,
    scheduledFor: pending.intent === 'schedule' ? pending.scheduledFor : undefined,
    ...platformExtras(pending.integrationType, pending.content),
  });

  const acc = pending.integrationName;
  const reply =
    pending.intent === 'publish_now'
      ? `✅ Enviado para publicação agora em ${acc}. Pode levar alguns minutos para aparecer no perfil. Veja o status em "o que está agendado".`
      : `✅ Agendado! ${acc} · ${formatDatePt(pending.scheduledFor)} (horário de Brasília) · ${
          pending.postType === 'story' ? 'Story' : 'Feed/Reel'
        }. Acompanhe em "o que está agendado" ou no Content Studio.`;

  return { reply, pendingAction: null, intent: pending.intent, executed: true };
}

/**
 * Monta uma ação pendente a partir da extração + contexto. Retorna { pending }
 * quando está tudo certo (aguardando confirmação) ou { clarification } quando
 * falta algo (conta ambígua, sem legenda, sem mídia, sem data válida).
 */
function buildPending(params: {
  intent: 'schedule' | 'publish_now';
  extraction: ActionExtraction;
  accounts: PostizIntegration[];
  media: ActionMedia[];
  defaultHandle: string;
  nowISO: string;
  fallbackContent?: string;
  previous?: PendingAction | null;
}): { pending?: PendingAction; clarification?: string } {
  const { extraction, accounts, defaultHandle } = params;

  const integration =
    resolveIntegration(accounts, extraction.accountQuery, defaultHandle) ||
    (params.previous
      ? accounts.find((a) => a.id === params.previous!.integrationId) || null
      : null);

  if (!integration) {
    if (!accounts.length) {
      return {
        clarification:
          'Não há nenhuma conta conectada no Postiz. Conecte o Instagram no painel do Postiz e tente de novo.',
      };
    }
    return {
      clarification: `Para qual conta? ${accounts
        .map((a) => a.name)
        .join(', ')}. Ex.: "agenda pra ${accounts[0].name} amanhã 18h".`,
    };
  }

  const content =
    (extraction.content && extraction.content.trim()) ||
    params.previous?.content ||
    params.fallbackContent ||
    '';

  if (!content.trim()) {
    return {
      clarification:
        'Qual vai ser a legenda? Me manda o texto (ou peça uma legenda antes, aí eu reaproveito).',
    };
  }

  const media = params.media.length ? params.media : params.previous?.media || [];
  if (!media.length) {
    return {
      clarification:
        'O Instagram exige foto ou vídeo no post. Anexe as fotos aqui no Copilot (botão de imagem) junto com o pedido e eu preparo o agendamento.',
    };
  }

  const postType: 'post' | 'story' =
    extraction.postType || params.previous?.postType || 'post';

  let scheduledFor: string | undefined;
  if (params.intent === 'schedule') {
    const iso = extraction.scheduledFor || params.previous?.scheduledFor;
    const when = iso ? new Date(iso) : null;
    if (!when || Number.isNaN(when.getTime())) {
      return {
        clarification:
          'Para quando eu agendo? Ex.: "amanhã às 18h", "sexta de manhã", "dia 12 às 20h".',
      };
    }
    if (when.getTime() < Date.now() - 60_000) {
      return {
        clarification: `Essa data (${formatDatePt(
          when.toISOString()
        )}) já passou. Me diga um horário no futuro.`,
      };
    }
    scheduledFor = when.toISOString();
  }

  return {
    pending: {
      intent: params.intent,
      integrationId: integration.id,
      integrationName: `${integration.name}${integration.profile ? ` (@${integration.profile})` : ''}`,
      integrationType: integration.identifier,
      content: content.trim(),
      postType,
      scheduledFor,
      media,
    },
  };
}

/**
 * Orquestra um turno do "modo ação" do Copilot.
 * Nunca publica/agenda sem confirmação explícita do usuário.
 */
export async function runCopilotAction(input: RunActionInput): Promise<RunActionResult> {
  if (!postizService.isConfigured()) {
    return {
      reply:
        'O agendamento (Postiz) ainda não está configurado neste ambiente. Defina POSTIZ_API_URL e POSTIZ_API_KEY na Vercel para eu poder publicar e agendar.',
      pendingAction: null,
      intent: 'none',
      executed: false,
    };
  }

  let accounts: PostizIntegration[] = [];
  try {
    accounts = await postizService.listIntegrations();
  } catch (err) {
    return {
      reply: `Não consegui falar com o Postiz agora: ${
        err instanceof Error ? err.message : 'erro desconhecido'
      }`,
      pendingAction: null,
      intent: 'none',
      executed: false,
    };
  }

  const pending = input.pendingAction || null;
  const media = input.media || [];
  const fallbackContent = lastAssistantContent(input.history);

  const prompt = buildExtractionPrompt({
    nowISO: input.nowISO,
    accounts,
    hasMedia: media.length > 0,
    pending,
    lastGeneratedContent: fallbackContent,
  });

  let extraction: ActionExtraction | null = null;
  try {
    const raw = await input.llm(prompt, input.message || '(sem texto)');
    extraction = parseExtraction(raw);
  } catch {
    extraction = null;
  }

  if (!extraction) {
    return {
      reply:
        'Não entendi bem o comando de agendamento. Tente algo como "agenda esse post pra amanhã às 18h" ou "publica agora".',
      pendingAction: pending,
      intent: 'none',
      executed: false,
    };
  }

  // ── Há ação pendente: confirmar / cancelar / modificar ────────────────
  if (pending) {
    if (extraction.cancel) {
      return {
        reply: 'Beleza, cancelei — não agendei nada.',
        pendingAction: null,
        intent: 'none',
        executed: false,
      };
    }
    if (extraction.confirm) {
      try {
        return await executePending(pending);
      } catch (err) {
        return {
          reply: `Falhei ao executar: ${
            err instanceof Error ? err.message : 'erro desconhecido'
          }. A ação continua pendente — pode tentar CONFIRMAR de novo.`,
          pendingAction: pending,
          intent: pending.intent,
          executed: false,
        };
      }
    }

    // Modificação de uma ação pendente.
    const intent: 'schedule' | 'publish_now' =
      extraction.intent === 'publish_now' ? 'publish_now' : pending.intent;
    const built = buildPending({
      intent,
      extraction,
      accounts,
      media,
      defaultHandle: input.defaultHandle,
      nowISO: input.nowISO,
      fallbackContent,
      previous: pending,
    });
    if (built.clarification) {
      return { reply: built.clarification, pendingAction: pending, intent, executed: false };
    }
    return {
      reply: buildConfirmationSummary(built.pending!),
      pendingAction: built.pending!,
      intent,
      executed: false,
    };
  }

  // ── Sem ação pendente: novo comando ───────────────────────────────────
  switch (extraction.intent) {
    case 'list_accounts':
      return {
        reply: formatAccountsReply(accounts),
        pendingAction: null,
        intent: 'list_accounts',
        executed: false,
      };

    case 'list_scheduled': {
      const start = input.nowISO;
      const end = new Date(new Date(input.nowISO).getTime() + 30 * 864e5).toISOString();
      try {
        const posts = await postizService.listPosts(start, end);
        return {
          reply: formatScheduledReply(posts),
          pendingAction: null,
          intent: 'list_scheduled',
          executed: false,
        };
      } catch (err) {
        return {
          reply: `Não consegui listar os agendamentos: ${
            err instanceof Error ? err.message : 'erro desconhecido'
          }`,
          pendingAction: null,
          intent: 'list_scheduled',
          executed: false,
        };
      }
    }

    case 'schedule':
    case 'publish_now': {
      const built = buildPending({
        intent: extraction.intent,
        extraction,
        accounts,
        media,
        defaultHandle: input.defaultHandle,
        nowISO: input.nowISO,
        fallbackContent,
      });
      if (built.clarification) {
        return {
          reply: built.clarification,
          pendingAction: null,
          intent: extraction.intent,
          executed: false,
        };
      }
      return {
        reply: buildConfirmationSummary(built.pending!),
        pendingAction: built.pending!,
        intent: extraction.intent,
        executed: false,
      };
    }

    default:
      return {
        reply:
          'Eu posso agendar posts, publicar agora, listar o que está agendado e mostrar as contas conectadas. ' +
          'Ex.: "agenda esse post pra amanhã 18h", "publica agora", "o que está agendado?".',
        pendingAction: null,
        intent: 'none',
        executed: false,
      };
  }
}
