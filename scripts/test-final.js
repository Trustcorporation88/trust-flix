const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');
const axios = require('axios');

const root = path.resolve(__dirname, '..');
const mutableRel = [
  'config.js','aiConfig.json','automation.json','agenda.json','grupos.json','disparos.json','marketing.json',
  'database/database.json','data/stock.json','data/setup.json','data/integrations.json','data/funnel.json',
  'data/secrets.enc.json','data/marketing_leads.json','data/orders.json','data/pending_payments.json',
  'data/tickets.json','data/automation_queue.json','data/automation_alerts.json','data/audit_log.json',
  'data/sales_log.json','data/system_health.json','data/marketing_state.json','data/disparos_state.json'
];
const mutable = mutableRel.map((x) => path.join(root, x));
const backup = new Map(mutable.map((file) => [file, fs.existsSync(file) ? fs.readFileSync(file) : null]));
function restore(){ for(const [file,content] of backup){ if(content===null) fs.rmSync(file,{force:true}); else { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,content); } } }
function write(rel,data){ const file=path.join(root,rel); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n'); }
async function listen(server){ return new Promise((resolve,reject)=>{ server.once('error',reject); server.listen(0,'127.0.0.1',()=>resolve(server.address().port)); }); }
async function close(server){ if(!server) return; await new Promise((resolve)=>server.close(resolve)); }

let panelServer, fakeEvolution, deliveryServer, outboundServer;
(async()=>{
  try{
    process.env.PORT='32177'; process.env.NODE_ENV='development'; process.env.PANEL_USERNAME='testadmin'; process.env.PANEL_PASSWORD='SenhaTest@123';
    process.env.SESSION_SECRET='test-session-secret-super-long-jetbot'; process.env.APP_SECRET='test-app-secret-super-long-jetbot';
    process.env.IGNORE_GROUP_MESSAGES='true'; process.env.WEBHOOK_SECRET='test-webhook-secret-jetbot';

    write('database/database.json',{categorias:[],produtos:[]});
    write('data/stock.json',{}); write('data/setup.json',{version:3,completed:false,currentStep:1,businessType:'digital_products',completedAt:null,updatedAt:null,checklist:{}});
    write('data/integrations.json',{publicBaseUrl:'',whatsapp:{provider:'local',evolution:{enabled:false,baseUrl:'',instance:'',webhookConfigured:false,lastTestAt:null,lastStatus:'not_configured'}},leadCapture:{enabled:true,defaultSource:'JETBOT Teste',defaultConsent:false,allowCsv:true,allowApi:true},outboundWebhook:{enabled:false,url:'',events:['lead.created','sale.delivered','ticket.created'],timeoutMs:8000},api:{enabled:true}});
    write('data/funnel.json',{enabled:false,name:'Funil Presentes',entryKeywords:['presente'],sourceTag:'ads-presentes',campaignCode:'PRESENTE',adMessage:'Quero presente',groupLink:'',pageLink:'',storeLink:'',welcomeMessage:'Presente liberado',consentMessage:'Envie RECEBER',groupMessage:'Grupo: {{grupo}}',pageMessage:'Página: {{pagina}}',storeMessage:'Loja: {{loja}}',privateNurture:{enabled:true,sequence:[{id:'check',delayMinutes:30,kind:'transactional',text:'Conseguiu acessar?'},{id:'offer',delayMinutes:60,kind:'marketing',text:'Digite OFERTA'}]},groupWarmup:{enabled:false,timezone:'America/Sao_Paulo',giftsPerDay:1,offersPerDay:1,defaultGiftTimes:['09:00'],defaultOfferTimes:['20:00']}});
    write('data/secrets.enc.json',{}); write('agenda.json',{config:{ativo:false},dias:{}}); write('grupos.json',[]);
    for(const f of ['marketing_leads.json','orders.json','tickets.json','automation_queue.json','automation_alerts.json','audit_log.json','sales_log.json']) write(`data/${f}`,[]);
    write('data/pending_payments.json',[]); write('data/system_health.json',{}); write('data/marketing_state.json',{}); write('data/disparos_state.json',{});

    const runtimeState=require('../src/core/runtimeState');
    const { startWebServer }=require('../src/web/server');
    panelServer=startWebServer(); await new Promise(r=>setTimeout(r,180));
    const base=`http://127.0.0.1:${process.env.PORT}`;
    let response=await axios.post(`${base}/api/auth/login`,{username:'testadmin',password:'SenhaTest@123'},{validateStatus:()=>true});
    assert.equal(response.status,200,'Login do painel falhou.');
    const cookie=response.headers['set-cookie'][0].split(';')[0];
    const api=axios.create({baseURL:base,headers:{Cookie:cookie,'x-requested-with':'jetbot-panel'},validateStatus:()=>true});

    // Configuração 100% pelo painel.
    let settings=(await api.get('/api/settings')).data;
    settings.bot={...settings.bot,nome:'Empresa Teste',nomeAssistente:'Lia',tipoNegocio:'services',descricaoNegocio:'Consultoria para pequenas empresas',adminNumbers:['5551999999999'],whatsappPublicNumber:'5551999999999',logoUrl:'https://example.com/logo.png',primaryColor:'#00e676',catalogTitle:'Soluções da Empresa Teste',catalogSubtitle:'Veja todos os detalhes antes de comprar.'};
    settings.vendas.catalogoPublicoAtivo=true; settings.pagamentos.pixManual.ativo=true;
    response=await api.put('/api/settings',{config:settings,secrets:{pixKey:'teste@pix.com'}}); assert.equal(response.status,200,'Falha ao salvar configurações pelo painel.');

    response=await api.post('/api/categories',{nome:'Soluções'}); assert.equal(response.status,201); const categoryId=response.data.id;
    const productPayload={nome:'Consultoria Premium',preco:297,precoDe:497,categoriaId:categoryId,descricaoCurta:'Plano para organizar vendas e operação.',descricao:'Diagnóstico, plano de ação e acompanhamento.',beneficios:['Mais clareza','Plano prático'],inclui:['Diagnóstico','Reunião'],publicoAlvo:'Pequenas empresas',garantia:'Escopo descrito antes da compra.',provaSocial:'Processo validado em projetos reais.',faq:[{question:'Quanto tempo?',answer:'Até 7 dias úteis.'}],imagemUrl:'',videoUrl:'https://example.com/video',ctaTexto:'QUERO CONTRATAR',ativo:true,destaque:true,entregaAutomatica:false,deliveryType:'manual',validityDays:0,lowStockThreshold:1,tutorial:'A equipe entrará em contato.'};
    response=await api.post('/api/products',productPayload); assert.equal(response.status,201,'Falha ao criar produto completo.'); const product=response.data;
    assert.equal(product.beneficios.length,2); assert.equal(product.faq[0].answer,'Até 7 dias úteis.');

    // Catálogo público e design adaptável.
    response=await axios.get(`${base}/api/public/catalog`,{validateStatus:()=>true}); assert.equal(response.status,200); assert.equal(response.data.brand.nome,'Empresa Teste'); assert.equal(response.data.products[0].nome,'Consultoria Premium'); assert(response.data.products[0].descricao.includes('Diagnóstico'));
    response=await axios.get(`${base}/catalogo`,{validateStatus:()=>true}); assert.equal(response.status,200); assert(String(response.data).includes('categoryFilters'));

    // Setup valida conexão real e produto explicado/pronto.
    runtimeState.patchWhatsapp({provider:'local',status:'ready',connected:true,number:'5551888888888@c.us'});
    let setup=(await api.get('/api/setup')).data;
    assert.equal(setup.checklist.business,true); assert.equal(setup.checklist.admin,true); assert.equal(setup.checklist.whatsappConnected,true); assert.equal(setup.checklist.productExplanation,true); assert.equal(setup.checklist.payment,true);
    response=await api.post('/api/setup/complete',{}); assert.equal(response.status,200,'Setup não concluiu com todos os itens prontos.');

    // Lead API e extensão MV3.
    const integrations=(await api.get('/api/integrations')).data;
    assert(integrations.leadEndpoint.includes('/api/public/leads/import'));
    const extensionZip=path.join(root,'src/web/public/downloads/JetLeads_Connector.zip'); assert(fs.existsSync(extensionZip),'Extensão de leads ausente.');
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'extension/JetLeads_Connector/manifest.json'),'utf8')); assert(manifest.host_permissions?.includes('https://*/*'),'Extensão sem permissão para enviar ao painel HTTPS.');
    response=await axios.post(integrations.leadEndpoint,{items:[{phone:'51999999999',name:'Lead API'}],source:'Teste API'},{headers:{'x-api-key':integrations.config.secrets.leadImportToken},validateStatus:()=>true}); assert.equal(response.status,200); assert.equal(response.data.created,1);
    let leads=(await api.get('/api/leads')).data; const imported=leads.find(l=>String(l.nome).includes('Lead API')); assert(imported); assert.equal(imported.optIn,false,'Lead importado não pode receber marketing por padrão.');

    // Fluxo comercial: produto explicado antes do PIX.
    const { handleMessage }=require('../src/handlers/messageHandler'); const sent=[]; const states=new Map();
    global.setUserState=(id,state)=>states.set(id,state); global.getUserState=(id)=>states.get(id); global.clearUserState=(id)=>states.delete(id);
    const client={info:{wid:{_serialized:'5551888888888@c.us'}},sendMessage:async(to,content,opts)=>{sent.push({to,content,opts});return {id:{_serialized:'mock-message'}};}};
    runtimeState.setClient(client);
    const msg=(body,from='5551777777777@c.us')=>({from,body,fromMe:false,isStatus:false,reply:(t)=>client.sendMessage(from,t),getChat:async()=>({sendStateTyping:async()=>{},clearState:async()=>{}})});
    await handleMessage(client,msg('menu')); sent.length=0; await handleMessage(client,msg('1'));
    const presentation=sent.map(x=>typeof x.content==='string'?x.content:'').join('\n');
    assert(presentation.includes('Principais benefícios'),'Produto não foi explicado.'); assert(presentation.includes('O que você recebe')); assert(presentation.includes('Vídeo de apresentação')); assert(!presentation.includes('PIX Copia e Cola'),'PIX apareceu antes da confirmação.');
    sent.length=0; await handleMessage(client,msg('1')); assert(sent.some(x=>String(x.content).includes('FINALIZAR')),'Pagamento não apareceu após a confirmação.');

    // Funil presentes: entrada, links, consentimento e fila segura.
    const funnelConfig=(await api.get('/api/funnel')).data.config; funnelConfig.enabled=true; funnelConfig.pageLink='https://example.com/presentes'; funnelConfig.storeLink='https://example.com/loja';
    response=await api.put('/api/funnel',{config:funnelConfig,groups:[]}); assert.equal(response.status,200);
    const giftFrom='5551666666666@c.us'; sent.length=0; await handleMessage(client,msg('presente',giftFrom)); assert(sent.some(x=>String(x.content).includes('Presente liberado'))); assert(sent.some(x=>String(x.content).includes('example.com/presentes')));
    let jobs=(await api.get('/api/automation')).data.jobs.filter(j=>j.chatId===giftFrom); assert.equal(jobs.length,0,'Marketing foi agendado antes do opt-in.');
    await handleMessage(client,msg('RECEBER',giftFrom)); jobs=(await api.get('/api/automation')).data.jobs.filter(j=>j.chatId===giftFrom); assert(jobs.length>=2,'Nutrição não foi agendada após consentimento.');

    // Entregas: estoque, falha/retentativa, link, webhook e manual.
    const { addPendingPayment, getPayment }=require('../src/utils/paymentManager'); const { fulfillApprovedPayment }=require('../src/services/paymentProcessor'); const stockManager=require('../src/utils/stockManager');
    const deliverySent=[]; const deliveryClient={sendMessage:async(to,text)=>{deliverySent.push({to,text});return {id:{_serialized:'ok'}};}};
    const stockProduct={...product,id:'p_stock',nome:'Produto Estoque',deliveryType:'stock',entregaAutomatica:true,preco:10,deliveryMessage:''};
    stockManager.setStock(stockProduct.id,['LOGIN TESTE | SENHA TESTE'],'test'); addPendingPayment('manual_stock_test','5551555555555@c.us',stockProduct,{});
    let fulfilled=await fulfillApprovedPayment(deliveryClient,'manual_stock_test','Confirmação manual'); assert.equal(fulfilled.ok,true); assert.equal(stockManager.getStockCount(stockProduct.id),0); let duplicate=await fulfillApprovedPayment(deliveryClient,'manual_stock_test','Confirmação manual'); assert.equal(duplicate.duplicate,true);

    const retryProduct={...product,id:'p_retry',nome:'Produto Retentativa',deliveryType:'stock',entregaAutomatica:true,preco:11}; stockManager.setStock(retryProduct.id,['ACESSO-RESERVADO-1'],'test'); addPendingPayment('manual_retry_test','5551544444444@c.us',retryProduct,{});
    let fails=1; const flakyClient={sendMessage:async()=>{if(fails-- > 0)throw new Error('falha simulada');return {id:{_serialized:'ok2'}};}};
    fulfilled=await fulfillApprovedPayment(flakyClient,'manual_retry_test','Confirmação manual'); assert.equal(fulfilled.ok,false); assert.equal(getPayment('manual_retry_test').reservedItem,'ACESSO-RESERVADO-1'); assert.equal(stockManager.getStockCount(retryProduct.id),0);
    fulfilled=await fulfillApprovedPayment(flakyClient,'manual_retry_test','Confirmação manual'); assert.equal(fulfilled.ok,true); assert.equal(getPayment('manual_retry_test').deliveredItem,'ACESSO-RESERVADO-1');

    const linkProduct={...product,id:'p_link',nome:'Produto Link',deliveryType:'link',entregaAutomatica:true,deliveryLink:'https://example.test/acesso',preco:20}; addPendingPayment('manual_link_test','5551444444444@c.us',linkProduct,{}); fulfilled=await fulfillApprovedPayment(deliveryClient,'manual_link_test','Confirmação manual'); assert.equal(fulfilled.ok,true); assert(deliverySent.some(x=>String(x.text).includes('example.test/acesso')));

    deliveryServer=http.createServer((req,res)=>{let body='';req.on('data',d=>body+=d);req.on('end',()=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({delivery:'TOKEN-WEBHOOK-123'}));});}); const deliveryPort=await listen(deliveryServer);
    const webhookProduct={...product,id:'p_webhook',nome:'Produto Webhook',deliveryType:'webhook',entregaAutomatica:true,deliveryWebhookUrl:`http://127.0.0.1:${deliveryPort}/deliver`,preco:30}; addPendingPayment('manual_webhook_test','5551333333333@c.us',webhookProduct,{}); fulfilled=await fulfillApprovedPayment(deliveryClient,'manual_webhook_test','Confirmação manual'); assert.equal(fulfilled.ok,true); assert(deliverySent.some(x=>String(x.text).includes('TOKEN-WEBHOOK-123')));

    const manualProduct={...product,id:'p_manual',nome:'Serviço Manual',deliveryType:'manual',entregaAutomatica:false,deliveryLink:'Protocolo confirmado: equipe fará contato.',preco:40}; addPendingPayment('manual_service_test','5551222222222@c.us',manualProduct,{}); fulfilled=await fulfillApprovedPayment(deliveryClient,'manual_service_test','Confirmação manual'); assert.equal(fulfilled.ok,true);

    // Evolution API v2 simulada: estado, QR, envio e webhook em lote.
    const evoRequests=[]; fakeEvolution=http.createServer((req,res)=>{let body='';req.on('data',d=>body+=d);req.on('end',()=>{evoRequests.push({method:req.method,url:req.url,body});res.setHeader('content-type','application/json');if(req.url.includes('connectionState'))res.end(JSON.stringify({instance:{state:'open'}}));else if(req.url.includes('/instance/connect/'))res.end(JSON.stringify({code:'QR-CODE-TEST'}));else res.end(JSON.stringify({ok:true,key:{id:'msg1'}}));});}); const evoPort=await listen(fakeEvolution);
    const integrationManager=require('../src/utils/integrationManager'); const { setSecret }=require('../src/utils/secretManager'); let cfg=integrationManager.loadIntegrations(); cfg.whatsapp.provider='evolution'; cfg.whatsapp.evolution={...cfg.whatsapp.evolution,enabled:true,baseUrl:`http://127.0.0.1:${evoPort}`,instance:'instancia-teste'}; integrationManager.saveIntegrations(cfg,'test'); setSecret('evolutionApiKey','api-key-test');
    const { EvolutionClient }=require('../src/providers/evolutionClient'); const evo=new EvolutionClient(); assert.equal(await evo.connectionState(),'open'); await evo.sendMessage('5551111111111@c.us','Mensagem Evolution'); assert(evoRequests.some(r=>r.url.includes('/message/sendText/instancia-teste'))); let inbound=0; evo.on('message_create',()=>inbound++); evo.handleWebhook({event:'MESSAGES_UPSERT',data:[{key:{remoteJid:'5551111111111@s.whatsapp.net'},message:{conversation:'Oi'}},{key:{remoteJid:'5551111111112@s.whatsapp.net'},message:{conversation:'Olá'}}]}); assert.equal(inbound,2); await evo.destroy();

    // Webhook de saída para n8n/Make/CRM simulado.
    const outboundEvents=[]; outboundServer=http.createServer((req,res)=>{let body='';req.on('data',d=>body+=d);req.on('end',()=>{outboundEvents.push({headers:req.headers,body:JSON.parse(body||'{}')});res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true}));});}); const outPort=await listen(outboundServer);
    cfg=integrationManager.loadIntegrations(); cfg.outboundWebhook={...cfg.outboundWebhook,enabled:true,url:`http://127.0.0.1:${outPort}/hook`,events:['integration.test','lead.created','sale.delivered','ticket.created']}; response=await api.put('/api/integrations',{config:cfg,secrets:{outboundWebhookSecret:'outbound-test-secret'}}); assert.equal(response.status,200); response=await api.post('/api/integrations/outbound/test',{}); assert.equal(response.status,200); assert.equal(outboundEvents[0].body.event,'integration.test');

    // Interface, campanhas e diagnóstico.
    response=await api.put('/api/campaign-config/groups',[{nome:'Grupo Teste',groupId:'120000@g.us',ativo:false}]); assert.equal(response.status,200);
    const diag=(await api.get('/api/diagnostics')).data; assert(diag.checks.length>=8); assert(diag.checks.find(x=>x.id==='product-explanation').ok);
    const home=await axios.get(base); assert.equal(home.status,200); assert(String(home.data).includes('JETBOT')); assert(String(home.data).includes('Funil Presentes'));
    assert(fs.statSync(path.join(root,'src/web/public/styles.css')).size>10000,'CSS do painel parece incompleto.');
    assert(fs.readFileSync(path.join(root,'src/web/public/styles.css'),'utf8').includes('flow-grid'),'Design do funil ausente.');

    console.log('✅ JETBOT V7: painel, setup, catálogo, explicação antes do PIX, leads, funil, pagamentos, entregas, retentativas, Evolution API, webhooks e interface validados.');
  } finally {
    await close(panelServer); await close(fakeEvolution); await close(deliveryServer); await close(outboundServer); restore();
  }
})().catch((error)=>{ console.error('❌ Teste final JETBOT falhou:',error.stack||error); process.exitCode=1; });
