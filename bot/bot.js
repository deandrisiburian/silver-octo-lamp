const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeInMemoryStore } = require('@whiskeysockets/baileys');
const Pino = require('pino');
const fs = require('fs');
const path = require('path');

let sock = null;
let isConnected = false;
let connectionInfo = {
  status: 'disconnected',
  qrCode: null,
  pairingCode: null,
  phoneNumber: null
};

// Store untuk menyimpan data
const store = makeInMemoryStore({ logger: Pino().child({ level: 'silent' }) });

// Statistik bot
let botStats = {
  startTime: Date.now(),
  messagesProcessed: 0,
  commandsUsed: {}
};

// Fungsi koneksi WhatsApp
async function connectToWhatsApp(phoneNumber = null, method = 'qr') {
  const authFolder = path.join(__dirname, '../auth_info');
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  
  sock = makeWASocket({
    logger: Pino({ level: 'silent' }),
    printQRInTerminal: method === 'qr',
    auth: state,
    browser: ['WhatsApp Bot', 'Chrome', '1.0.0']
  });
  
  store.bind(sock.ev);
  
  // Event connection update
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr && method === 'qr') {
      connectionInfo.qrCode = qr;
      connectionInfo.status = 'waiting_qr';
      console.log('QR Code received');
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
      connectionInfo.status = 'disconnected';
      isConnected = false;
      
      if (shouldReconnect) {
        setTimeout(() => connectToWhatsApp(phoneNumber, method), 3000);
      }
    } else if (connection === 'open') {
      console.log('Connected to WhatsApp!');
      connectionInfo.status = 'connected';
      connectionInfo.qrCode = null;
      connectionInfo.pairingCode = null;
      isConnected = true;
      
      if (phoneNumber && method === 'pairing') {
        try {
          const code = await sock.requestPairingCode(phoneNumber);
          connectionInfo.pairingCode = code;
          console.log(`Pairing code: ${code}`);
        } catch (error) {
          console.error('Pairing code error:', error);
        }
      }
    }
  });
  
  // Event pesan masuk
  sock.ev.on('messages.upsert', async (messageUpdate) => {
    const m = messageUpdate.messages[0];
    if (!m.message) return;
    
    const message = m.message.conversation || 
                   m.message.extendedTextMessage?.text || 
                   '';
    const sender = m.key.remoteJid;
    
    botStats.messagesProcessed++;
    
    if (sender && !sender.includes('g.us')) {
      await handleCommand(sender, message);
    }
  });
  
  sock.ev.on('creds.update', saveCreds);
  
  return sock;
}

// Handler command
async function handleCommand(sender, message) {
  const msg = message.trim().toLowerCase();
  const prefix = '#';
  
  if (!msg.startsWith(prefix)) return;
  
  const args = msg.slice(1).split(' ');
  const command = args[0];
  
  // Update statistik command
  botStats.commandsUsed[command] = (botStats.commandsUsed[command] || 0) + 1;
  
  switch(command) {
    case 'start':
      await sock.sendMessage(sender, { 
        text: `🤖 *WHATSAPP BOT ACTIVE*\n\nHalo! Saya adalah bot WhatsApp.\nKetik #menu untuk melihat daftar perintah.` 
      });
      break;
      
    case 'menu':
      await sock.sendMessage(sender, { 
        text: `📋 *MAIN MENU*\n\n` +
              `#confess <nomor> <pesan> - Kirim confess ke nomor\n` +
              `#help - Bantuan perintah\n` +
              `#info - Info bot\n` +
              `#stats - Statistik bot\n` +
              `#start - Memulai bot`
      });
      break;
      
    case 'confess':
      if (args.length < 3) {
        await sock.sendMessage(sender, { 
          text: `⚠️ *Cara penggunaan:*\n#confess <nomor> <pesan>\n\nContoh: #confess 6281234567890 Halo, aku suka kamu!` 
        });
        return;
      }
      
      const targetNumber = args[1] + '@s.whatsapp.net';
      const confessMessage = args.slice(2).join(' ');
      
      try {
        await sock.sendMessage(targetNumber, { 
          text: `📨 *PESAN CONFESS*\n\n${confessMessage}\n\n- Dari seseorang yang mengagumimu ✨` 
        });
        await sock.sendMessage(sender, { text: `✅ Confess berhasil dikirim ke nomor ${args[1]}` });
      } catch (error) {
        await sock.sendMessage(sender, { text: `❌ Gagal mengirim confess: ${error.message}` });
      }
      break;
      
    case 'help':
      await sock.sendMessage(sender, { 
        text: `🆘 *BANTUAN*\n\n` +
              `Daftar perintah:\n` +
              `• #start - Memulai bot\n` +
              `• #menu - Menampilkan menu\n` +
              `• #confess <nomor> <pesan> - Kirim pesan rahasia\n` +
              `• #info - Informasi bot\n` +
              `• #stats - Statistik bot\n\n` +
              `_Format nomor: 628xxxxxxxxx (tanpa + atau 0)_`
      });
      break;
      
    case 'info':
      await sock.sendMessage(sender, { 
        text: `ℹ️ *INFO BOT*\n\n` +
              `Nama Bot: WhatsApp Bot\n` +
              `Versi: 1.0.0\n` +
              `Status: Aktif\n` +
              `Uptime: ${formatUptime(Date.now() - botStats.startTime)}\n` +
              `Total Pesan Diproses: ${botStats.messagesProcessed}`
      });
      break;
      
    case 'stats':
      let statsMsg = `📊 *STATISTIK BOT*\n\n`;
      statsMsg += `🟢 Status: Terhubung\n`;
      statsMsg += `⏱️ Uptime: ${formatUptime(Date.now() - botStats.startTime)}\n`;
      statsMsg += `💬 Pesan diproses: ${botStats.messagesProcessed}\n`;
      statsMsg += `🔧 Command digunakan:\n`;
      
      for (const [cmd, count] of Object.entries(botStats.commandsUsed)) {
        statsMsg += `   • #${cmd}: ${count}x\n`;
      }
      
      await sock.sendMessage(sender, { text: statsMsg });
      break;
      
    default:
      await sock.sendMessage(sender, { 
        text: `❌ Perintah tidak dikenal. Ketik #menu untuk melihat daftar perintah.` 
      });
  }
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

// Export untuk API
module.exports = { connectToWhatsApp, getStatus: () => connectionInfo, getStats: () => botStats, sock: () => sock };