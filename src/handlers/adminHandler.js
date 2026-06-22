const configManager = require('../utils/configManager');
const aiConfigManager = require('../utils/aiConfigManager');
const databaseManager = require('../utils/databaseManager');
const productManager = require('../utils/productManager');
const stockManager = require('../utils/stockManager');

const adminMenuText = `*PAINEL DE ADMINISTRAÇÃO*

Digite o número da opção desejada:

*1* - ⚙️ Gerenciar Pagamentos
*2* - 📦 Gerenciar Produtos
*3* - 🤖 Gerenciar IA
*4* - 🔄 Resetar Configurações do Bot
*5* - 🚪 Sair do Painel`;

const paymentMenuText = `*PAINEL > GERENCIAR PAGAMENTOS*

*1* - Configurar Access Token (Mercado Pago)
*2* - Configurar API Token (PushinPay)
*3* - Configurar Chave PIX Manual
*4* - Limpar/Desativar Pagamentos
*5* - 🚪 Voltar`;

const productMenuText = `*PAINEL > GERENCIAR PRODUTOS*

*1* - Listar Todos os Produtos
*2* - Adicionar Novo Produto
*3* - Remover um Produto
*4* - Remover uma Categoria
*5* - 🚪 Voltar`;

const aiMenuText = () => {
    const aiConfig = aiConfigManager.loadAiConfig();
    const statusAtual = aiConfig.iaAtiva ? '🟢 Ativa' : '🔴 Desativada';
    return `*PAINEL > GERENCIAR IA*
Status Atual: *${statusAtual}*

*1* - Configurar Token do Groq
*2* - Limpar Token do Groq
*3* - Configurar Prompt da IA
*4* - Redefinir Prompt Padrão
*5* - Ativar/Desativar IA
*6* - 🚪 Voltar`;
};

async function handleAdminMessage(client, message) {
    const sender = message.from;
    const body = message.body.trim();
    const userState = global.getUserState(sender) || { stage: 'admin_main_menu' };

    try {
        switch (userState.stage) {
            case 'admin_main_menu':
                if (body === '1') {
                    await client.sendMessage(sender, paymentMenuText);
                    global.setUserState(sender, { stage: 'admin_payment_menu' });
                } else if (body === '2') {
                    await client.sendMessage(sender, productMenuText);
                    global.setUserState(sender, { stage: 'admin_product_menu' });
                } else if (body === '3') {
                    await client.sendMessage(sender, aiMenuText());
                    global.setUserState(sender, { stage: 'admin_ai_menu' });
                } else if (body === '4') {
                    await client.sendMessage(sender, "⚠️ *ATENÇÃO!* Esta ação irá apagar suas configurações de pagamento. Para confirmar, digite `resetar config`.");
                    global.setUserState(sender, { stage: 'admin_confirm_reset' });
                } else if (body === '5') {
                    global.clearUserState(sender);
                    await client.sendMessage(sender, "Você saiu do painel de administração.");
                } else {
                    await client.sendMessage(sender, adminMenuText);
                }
                break;

            case 'admin_payment_menu':
                if (body === '1') {
                    await client.sendMessage(sender, "Por favor, envie seu Access Token do Mercado Pago.");
                    global.setUserState(sender, { stage: 'admin_set_mp_token' });
                } else if (body === '2') {
                    await client.sendMessage(sender, "Por favor, envie seu API Token da PushinPay.");
                    global.setUserState(sender, { stage: 'admin_set_pushinpay_token' });
                } else if (body === '3') {
                    await client.sendMessage(sender, "Por favor, envie a sua chave PIX.");
                    global.setUserState(sender, { stage: 'admin_set_manual_pix' });
                } else if (body === '4') {
                    configManager.setAccessToken("");
                    configManager.setPushinpayToken("");
                    configManager.setManualPix("");
                    await client.sendMessage(sender, "✅ Todos os métodos de pagamento foram limpos/desativados.");
                    await client.sendMessage(sender, paymentMenuText);
                } else if (body === '5') {
                    await client.sendMessage(sender, adminMenuText);
                    global.setUserState(sender, { stage: 'admin_main_menu' });
                } else {
                    await client.sendMessage(sender, paymentMenuText);
                }
                break;
            case 'admin_set_mp_token':
                configManager.setAccessToken(body);
                await client.sendMessage(sender, "✅ Access Token do Mercado Pago salvo com sucesso!");
                await client.sendMessage(sender, paymentMenuText);
                global.setUserState(sender, { stage: 'admin_payment_menu' });
                break;
            case 'admin_set_pushinpay_token':
                configManager.setPushinpayToken(body);
                await client.sendMessage(sender, "✅ API Token da PushinPay salvo com sucesso!");
                await client.sendMessage(sender, paymentMenuText);
                global.setUserState(sender, { stage: 'admin_payment_menu' });
                break;
            case 'admin_set_manual_pix':
                configManager.setManualPix(body);
                await client.sendMessage(sender, "✅ Chave PIX Manual salva com sucesso!");
                await client.sendMessage(sender, paymentMenuText);
                global.setUserState(sender, { stage: 'admin_payment_menu' });
                break;

            case 'admin_product_menu':
                if (body === '1') {
                    const products = productManager.getProducts();
                    let productList = "*LISTA DE PRODUTOS CADASTRADOS*\n\n";
                    if (products.length === 0) {
                        productList = "Nenhum produto cadastrado.";
                    } else {
                        products.forEach(p => {
                            const stockCount = stockManager.getStockCount(p.id);
                            productList += `*Nome:* ${p.nome}\n*Preço:* R$ ${p.preco.toFixed(2)}\n*Estoque:* ${stockCount}\n*ID:* \`${p.id}\`\n\n`;
                        });
                    }
                    await client.sendMessage(sender, productList);
                
                } else if (body === '2') {
                    await client.sendMessage(sender, "Qual o nome do novo produto?");
                    global.setUserState(sender, { stage: 'admin_add_product_name', newProduct: {} });
                
                } else if (body === '3') {
                    const products = productManager.getProducts();
                    if (products.length === 0) {
                        await client.sendMessage(sender, "Nenhum produto para apagar.");
                        break;
                    }
                    let deleteList = "Digite o número do produto que deseja apagar:\n\n";
                    products.forEach((p, i) => deleteList += `*${i + 1}* - ${p.nome}\n`);
                    await client.sendMessage(sender, deleteList);
                    global.setUserState(sender, { stage: 'admin_deleting_product', productsInView: products });
                
                } else if (body === '4') {
                    const categories = productManager.getCategories();
                    if (categories.length === 0) {
                        await client.sendMessage(sender, "Nenhuma categoria para apagar.");
                        break;
                    }
                    let deleteList = "⚠️ *Atenção:* Apagar uma categoria irá remover TODOS os produtos dentro dela.\n\nDigite o número da categoria que deseja apagar:\n\n";
                    categories.forEach((c, i) => deleteList += `*${i + 1}* - ${c.nome}\n`);
                    await client.sendMessage(sender, deleteList);
                    global.setUserState(sender, { stage: 'admin_deleting_category', categoriesInView: categories });
                
                } else if (body === '5') {
                    await client.sendMessage(sender, adminMenuText);
                    global.setUserState(sender, { stage: 'admin_main_menu' });
                } else {
                    await client.sendMessage(sender, productMenuText);
                }
                break;

            case 'admin_add_product_name':
                userState.newProduct.nome = body;
                global.setUserState(sender, { ...userState, stage: 'admin_add_product_price' });
                await client.sendMessage(sender, "Ótimo. Agora, qual o preço? (Use apenas números, ex: 19.99)");
                break;
            
            case 'admin_add_product_price':
                const price = parseFloat(body.replace(',', '.'));
                if (isNaN(price) || price < 0) {
                    await client.sendMessage(sender, "Preço inválido. Por favor, envie novamente.");
                    break;
                }
                userState.newProduct.preco = price;
                const categories = productManager.getCategories();
                let categoryList = "A qual categoria este produto pertence?\n\n";
                if (categories.length > 0) {
                    categories.forEach((c, i) => categoryList += `*${i + 1}* - ${c.nome}\n`);
                    categoryList += "\n*OU digite um novo nome para criar uma nova categoria.*";
                } else {
                    categoryList = "Nenhuma categoria encontrada. Digite um nome para criar a primeira.";
                }
                global.setUserState(sender, { ...userState, stage: 'admin_add_product_category' });
                await client.sendMessage(sender, categoryList);
                break;
            
            case 'admin_add_product_category':
                const availableCategories = productManager.getCategories();
                const catChoice = parseInt(body) - 1;
                let categoryId;
                if (!isNaN(catChoice) && availableCategories[catChoice]) {
                    categoryId = availableCategories[catChoice].id;
                } else {
                    categoryId = databaseManager.addCategory(body);
                    await client.sendMessage(sender, `✅ Nova categoria "${body}" criada!`);
                }
                userState.newProduct.categoriaId = categoryId;
                const newProductId = databaseManager.addProduct(userState.newProduct);
                userState.newProduct.id = newProductId;

                global.setUserState(sender, { ...userState, stage: 'admin_add_product_stock' });
                await client.sendMessage(sender, `Produto "${userState.newProduct.nome}" criado. Agora, envie o estoque. *Cada linha da sua mensagem será um item em estoque.*`);
                break;

            case 'admin_add_product_stock':
                const stockItems = body.split('\n').map(item => item.trim()).filter(item => item);
                if (stockItems.length === 0) {
                    await client.sendMessage(sender, "Nenhum item de estoque válido foi enviado. Tente novamente.");
                    break;
                }
                stockManager.addStock(userState.newProduct.id, stockItems);
                await client.sendMessage(sender, `✅ ${stockItems.length} item(ns) de estoque adicionado(s) com sucesso!`);
                await client.sendMessage(sender, productMenuText);
                global.setUserState(sender, { stage: 'admin_product_menu' });
                break;

            case 'admin_deleting_product':
                const prodChoice = parseInt(body) - 1;
                if (isNaN(prodChoice) || !userState.productsInView[prodChoice]) {
                    await client.sendMessage(sender, "Opção inválida. Tente novamente.");
                    break;
                }
                const productToDelete = userState.productsInView[prodChoice];
                databaseManager.deleteProduct(productToDelete.id);
                stockManager.deleteStockForProduct(productToDelete.id);
                await client.sendMessage(sender, `✅ Produto "${productToDelete.nome}" apagado com sucesso!`);
                await client.sendMessage(sender, productMenuText);
                global.setUserState(sender, { stage: 'admin_product_menu' });
                break;
            
            case 'admin_deleting_category':
                const catDelChoice = parseInt(body) - 1;
                if (isNaN(catDelChoice) || !userState.categoriesInView[catDelChoice]) {
                    await client.sendMessage(sender, "Opção inválida. Tente novamente.");
                    break;
                }
                const categoryToDelete = userState.categoriesInView[catDelChoice];
                const deletedProductIds = databaseManager.deleteCategory(categoryToDelete.id);

                if (deletedProductIds && deletedProductIds.length > 0) {
                    deletedProductIds.forEach(id => stockManager.deleteStockForProduct(id));
                }

                await client.sendMessage(sender, `✅ Categoria "${categoryToDelete.nome}" e todos os seus produtos foram apagados com sucesso!`);
                await client.sendMessage(sender, productMenuText);
                global.setUserState(sender, { stage: 'admin_product_menu' });
                break;


            case 'admin_ai_menu':
                if (body === '1') {
                    await client.sendMessage(sender, "Por favor, envie seu Token da API do Groq.");
                    global.setUserState(sender, { stage: 'admin_set_groq_token' });
                } else if (body === '2') {
                    aiConfigManager.setGroqToken("");
                    await client.sendMessage(sender, "✅ Token do Groq limpo com sucesso!");
                    await client.sendMessage(sender, aiMenuText());
                } else if (body === '3') {
                    await client.sendMessage(sender, "Por favor, envie o novo Prompt de Sistema para a IA.");
                    global.setUserState(sender, { stage: 'admin_set_ai_prompt' });
                } else if (body === '4') {
                    aiConfigManager.resetAiPrompt();
                    await client.sendMessage(sender, "✅ Prompt da IA redefinido para o padrão.");
                    await client.sendMessage(sender, aiMenuText());
                } else if (body === '5') {
                    const currentStatus = aiConfigManager.loadAiConfig().iaAtiva;
                    const newStatus = !currentStatus;
                    aiConfigManager.setAiStatus(newStatus);
                    await client.sendMessage(sender, `✅ IA foi *${newStatus ? 'Ativada' : 'Desativada'}* com sucesso!`);
                    await client.sendMessage(sender, aiMenuText());
                } else if (body === '6') {
                    await client.sendMessage(sender, adminMenuText);
                    global.setUserState(sender, { stage: 'admin_main_menu' });
                } else {
                    await client.sendMessage(sender, aiMenuText());
                }
                break;
            case 'admin_set_groq_token':
                aiConfigManager.setGroqToken(body);
                await client.sendMessage(sender, "✅ Token do Groq salvo com sucesso!");
                await client.sendMessage(sender, aiMenuText());
                global.setUserState(sender, { stage: 'admin_ai_menu' });
                break;
            case 'admin_set_ai_prompt':
                aiConfigManager.setAiPrompt(body);
                await client.sendMessage(sender, "✅ Prompt da IA atualizado com sucesso!");
                await client.sendMessage(sender, aiMenuText());
                global.setUserState(sender, { stage: 'admin_ai_menu' });
                break;
            case 'admin_confirm_reset':
                if (body.toLowerCase() === 'resetar config') {
                    configManager.resetAllConfig();
                    await client.sendMessage(sender, "✅ Configurações de pagamento resetadas!");
                } else {
                    await client.sendMessage(sender, "Ação cancelada.");
                }
                await client.sendMessage(sender, adminMenuText);
                global.setUserState(sender, { stage: 'admin_main_menu' });
                break;
                
            default:
                await client.sendMessage(sender, "Ação não reconhecida, voltando ao menu principal.");
                await client.sendMessage(sender, adminMenuText);
                global.setUserState(sender, { stage: 'admin_main_menu' });
                break;
        }
    } catch (error) {
        console.error("Erro no painel de admin:", error);
        await client.sendMessage(sender, "❌ Ocorreu um erro no painel de administração.");
        global.clearUserState(sender);
    }
}

module.exports = { handleAdminMessage, adminMenuText };