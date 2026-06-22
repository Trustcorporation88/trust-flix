const state = {
  startedAt: new Date().toISOString(),
  whatsapp: {
    provider: 'local',
    status: 'starting',
    connected: false,
    number: '',
    qrDataUrl: '',
    lastQrAt: null,
    lastReadyAt: null,
    lastDisconnectAt: null,
    disconnectReason: '',
  },
  client: null,
};

function setClient(client) { state.client = client; }
function getClient() { return state.client; }
function patchWhatsapp(patch) { Object.assign(state.whatsapp, patch); }
function getPublicState() {
  return {
    startedAt: state.startedAt,
    uptimeSeconds: Math.floor(process.uptime()),
    whatsapp: { ...state.whatsapp },
  };
}

module.exports = { setClient, getClient, patchWhatsapp, getPublicState };
