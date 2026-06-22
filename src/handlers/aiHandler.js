const Groq = require('groq-sdk');
const { loadAiConfig } = require('../utils/aiConfigManager');
const { loadConfig } = require('../utils/configManager');
const { getProducts, getCategories } = require('../utils/productManager');

function buildKnowledge(selectedProductId = '') {
  const config = loadConfig();
  const categories = getCategories();
  const products = getProducts().filter((p) => p.ativo !== false).map((p) => ({
    id: p.id,
    nome: p.nome,
    preco: Number(p.preco || 0).toFixed(2),
    precoDe: Number(p.precoDe || 0).toFixed(2),
    descricaoCurta: p.descricaoCurta || '',
    descricao: p.descricao || '',
    beneficios: p.beneficios || [],
    inclui: p.inclui || [],
    publicoAlvo: p.publicoAlvo || '',
    garantia: p.garantia || '',
    faq: p.faq || [],
    estoque: p.estoque,
    disponivel: p.entregaAutomatica === false || p.deliveryType !== 'stock' || p.estoque > 0,
    validadeDias: p.validityDays || 0,
    categoria: categories.find((c) => c.id === p.categoriaId)?.nome || ''
  }));
  const selected = products.find((p) => p.id === selectedProductId) || null;
  return `\n\nDADOS OFICIAIS DA EMPRESA:\n${JSON.stringify({ marca: config.bot.nome, descricao: config.bot.descricaoNegocio, horario: config.bot.horarioAtendimento, termos: config.bot.termosDeCompra }, null, 2)}\n\nCATÁLOGO OFICIAL (não invente informações):\n${JSON.stringify(products, null, 2)}${selected ? `\n\nPRODUTO EM CONVERSA:\n${JSON.stringify(selected, null, 2)}` : ''}`;
}

async function getAiResponse(client, message) {
  const aiConfig = loadAiConfig();
  if (!aiConfig.groqToken) return message.reply('A IA ainda não foi configurada. Digite *MENU* ou *ATENDENTE*.');
  const senderId = message.from;
  const userMessage = String(message.body || '').trim();
  const userSession = client.userState.get(senderId) || { chatHistory: [], stage: 'talking_to_ai' };
  try {
    if (userMessage.toLowerCase() === '/reset') { userSession.chatHistory = []; client.userState.set(senderId, userSession); return message.reply('Conversa reiniciada. Como posso ajudar?'); }
    userSession.chatHistory.push({ role: 'user', content: userMessage });
    const max = Math.max(4, Math.min(Number(aiConfig.maxHistoryMessages) || 12, 30));
    userSession.chatHistory = userSession.chatHistory.slice(-max);
    const chat = await message.getChat(); await chat.sendStateTyping();
    const groq = new Groq({ apiKey: aiConfig.groqToken });
    const rules = `\nREGRAS OBRIGATÓRIAS:\n- Explique o produto antes de falar em pagamento.\n- Nunca invente preço, produto, estoque, garantia, prazo ou aprovação.\n- Não diga que o pagamento foi aprovado.\n- Quando o cliente decidir comprar, diga para responder 1 ou digitar MENU e escolher o produto.\n- Responda de forma natural, curta e útil.\n- Faça no máximo uma pergunta por mensagem.\n- Quando precisar de humano, oriente a escrever ATENDENTE.`;
    const result = await groq.chat.completions.create({
      messages: [{ role: 'system', content: aiConfig.promptSistema + rules + buildKnowledge(userSession.productId) }, ...userSession.chatHistory],
      model: aiConfig.model || 'llama-3.1-8b-instant', temperature: Number(aiConfig.temperature ?? 0.45), max_tokens: 1000
    });
    const answer = result.choices[0]?.message?.content || 'Não consegui responder agora. Digite *ATENDENTE*.';
    await message.reply(answer);
    userSession.chatHistory.push({ role: 'assistant', content: answer });
    userSession.chatHistory = userSession.chatHistory.slice(-max);
    client.userState.set(senderId, userSession); await chat.clearState();
  } catch (error) {
    console.error(`[IA] Erro para ${senderId}:`, error.message);
    await message.reply('❌ A IA está indisponível agora. Digite *ATENDENTE* para falar com a equipe.');
  }
}
module.exports = { getAiResponse, buildKnowledge };
