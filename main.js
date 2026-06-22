require('dotenv').config();
require('colors');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const { createMessagingClient } = require('./src/providers/clientFactory');
const { handleMessage } = require('./src/handlers/messageHandler');
const { getPendingPayments, expireOldPayments, recoverStalePayments, recordPaymentCheck, closePayment } = require('./src/utils/paymentManager');
const { getMercadoPagoPaymentStatus } = require('./src/services/mercadoPago');
const { getPushinPayPaymentStatus } = require('./src/services/pushinpay');
const { fulfillApprovedPayment } = require('./src/services/paymentProcessor');
const { displayLogo } = require('./src/utils/logo');
const { startPresentesScheduler } = require('./src/services/presentesScheduler');
const { startWebServer } = require('./src/web/server');
const runtimeState = require('./src/core/runtimeState');
const { createBackup } = require('./src/utils/backupManager');
const { startAutomationEngine, setAutomationClient } = require('./src/services/automationEngine');
const { startSystemMonitor, setMonitorClient } = require('./src/services/systemMonitor');
const automationManager = require('./src/utils/automationManager');

process.on('unhandledRejection',(reason)=>{const msg=String(reason?.message||reason);if(msg.includes('socket hang up')||msg.includes('ECONNRESET')||msg.includes('WebSocket'))return console.warn('⚠️ Chromium reconectando:',msg.slice(0,300));console.error('⚠️ Promessa rejeitada:',reason)});
process.on('uncaughtException',(error)=>{const msg=String(error?.message||error);if(msg.includes('socket hang up')||msg.includes('ECONNRESET')||msg.includes('WebSocket'))return console.warn('⚠️ Erro temporário do Chromium:',msg);console.error('⚠️ Erro inesperado:',error)});

displayLogo();
console.log('🚀 Iniciando JETBOT V7 — ROBÔ VENDEDOR AUTOMÁTICO...'.yellow);
startWebServer();
recoverStalePayments();
expireOldPayments(72);
automationManager.recoverStaleJobs();
automationManager.cleanupJobs(30);

let checking=false;let schedulerStarted=false;let automationStarted=false;let monitorStarted=false;

const client = createMessagingClient();
runtimeState.setClient(client);
startSystemMonitor(client); monitorStarted=true;
const originalSendMessage=client.sendMessage.bind(client);client.sendMessage=(chatId,content,options={})=>originalSendMessage(chatId,content,{...options,sendSeen:false});
client.userState=new Map();global.setUserState=(id,state)=>client.userState.set(id,state);global.getUserState=(id)=>client.userState.get(id);global.clearUserState=(id)=>client.userState.delete(id);

client.on('qr',async(qr)=>{
  console.log('🔑 QR Code gerado. Escaneie no terminal ou abra o painel web.'.blue);qrcodeTerminal.generate(qr,{small:true});
  try{runtimeState.patchWhatsapp({status:'qr',connected:false,qrDataUrl:await QRCode.toDataURL(qr),lastQrAt:new Date().toISOString()})}catch(error){console.error('Erro ao gerar QR para painel:',error.message)}
});

async function checkPayments(){
  if(checking||!runtimeState.getPublicState().whatsapp.connected)return;checking=true;
  try{
    const pending=getPendingPayments();
    for(const [paymentId] of pending){
      if(paymentId.startsWith('manual_'))continue;
      let status='pending',service='Mercado Pago';
      if(paymentId.startsWith('pushinpay_')){service='PushinPay';status=await getPushinPayPaymentStatus(paymentId.replace('pushinpay_',''))}else status=await getMercadoPagoPaymentStatus(paymentId);
      const normalized=String(status||'').toUpperCase();
      recordPaymentCheck(paymentId, normalized, normalized==='ERROR' ? 'Falha ao consultar gateway.' : '');
      if(['APPROVED','PAID','COMPLETED'].includes(normalized)) await fulfillApprovedPayment(client,paymentId,service);
      else if(['CANCELLED','CANCELED','REJECTED','EXPIRED','REFUNDED'].includes(normalized)) {
        const finalStatus = normalized==='REFUNDED' ? 'refunded' : normalized==='REJECTED' ? 'rejected' : normalized.startsWith('CANCEL') ? 'cancelled' : 'expired';
        closePayment(paymentId, finalStatus, `Gateway informou ${normalized}`);
        automationManager.cancelByPayment(paymentId, `Pagamento encerrado: ${normalized}`);
      }
    }
  }catch(error){console.error('Erro na verificação de pagamentos:',error.message)}finally{checking=false}
}

client.on('ready',()=>{
  displayLogo();const number=client.info?.wid?._serialized||'';console.log(`✅ WhatsApp conectado: ${number}`.green);
  runtimeState.patchWhatsapp({status:'ready',connected:true,number,qrDataUrl:'',lastReadyAt:new Date().toISOString(),disconnectReason:''});
  if(!schedulerStarted){try{startPresentesScheduler(client);schedulerStarted=true}catch(error){console.error('Erro ao iniciar agenda:',error.message)}}
  setAutomationClient(client); setMonitorClient(client);
  if(!automationStarted){startAutomationEngine(client);automationStarted=true;}
  if(!monitorStarted){startSystemMonitor(client);monitorStarted=true;}
  checkPayments();
});
client.on('message_create',async(message)=>{try{await handleMessage(client,message)}catch(error){console.error('Erro global de mensagem:',error)}});
client.on('auth_failure',(message)=>{runtimeState.patchWhatsapp({status:'auth_failure',connected:false,disconnectReason:String(message)});console.error('❌ Falha na autenticação:',message)});
client.on('disconnected',(reason)=>{runtimeState.patchWhatsapp({status:'disconnected',connected:false,lastDisconnectAt:new Date().toISOString(),disconnectReason:String(reason)});console.log('⚠️ WhatsApp desconectado:',reason);setTimeout(()=>process.exit(1),3000)});

setInterval(checkPayments,30000);
setInterval(()=>{const expired=expireOldPayments(72);if(expired)console.log(`⏰ ${expired} pagamento(s) expirado(s).`)},60*60*1000);
setInterval(()=>automationManager.cleanupJobs(30),24*60*60*1000);
setInterval(()=>{try{createBackup('automatic')}catch(error){console.error('Backup automático:',error.message)}},24*60*60*1000);
client.initialize().catch((error)=>{runtimeState.patchWhatsapp({status:'startup_error',connected:false,disconnectReason:error.message});console.error('❌ Falha ao iniciar WhatsApp:',error);setTimeout(()=>process.exit(1),5000)});
