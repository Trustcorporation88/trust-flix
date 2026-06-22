const adminConfig = require('../../adminConfig');
const { loadRawConfig } = require('./configManager');
function onlyDigits(value=''){ return String(value).replace(/\D/g,''); }
function getAdminChatIds(client){
  const ids = new Set();
  const owner = client?.info?.wid?._serialized;
  if(owner) ids.add(owner);
  const configured = [...(adminConfig.additionalAdmins || []), ...(loadRawConfig().bot.adminNumbers || [])];
  for(const admin of configured){ const digits = onlyDigits(admin); if(digits) ids.add(`${digits}@c.us`); }
  return [...ids];
}
async function notifyAdmins(client, text){ for(const chatId of getAdminChatIds(client)){ try{ await client.sendMessage(chatId, text); }catch(error){ console.error(`Falha ao avisar admin ${chatId}:`, error.message); } } }
module.exports={getAdminChatIds,notifyAdmins};
