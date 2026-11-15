// Exemplo de Envio de Todos os Tipos de Mensagens em JavaScript Puro (.js)
// Execute com: node examples/example.js
import makeWASocket, { useSecureAuthState } from '../dist/index.js'
import fs from 'fs'

async function startBot() {
  console.log('🤖 Iniciando bot em JavaScript puro (Node.js)...')

  // 1. Armazenamento seguro de credenciais com senha mestra
  const auth = await useSecureAuthState('./auth_info', 'minha-chave-secreta-js')

  // 2. Criação do cliente
  const sock = makeWASocket({
    auth,
    printQRInTerminal: true,
  })

  // 3. Monitoramento da conexão
  sock.on('connection.update', async (update) => {
    const { connection, qr } = update

    if (qr) {
      console.log('📌 QR Code gerado! Escaneie no WhatsApp:')
      console.log(qr)
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado com sucesso!')
      await testarEnvioDeMensagens(sock)
    }
  })

  // 4. Conectar
  await sock.connect()
}

/**
 * Demonstração de todos os tipos de envio funcionando em JavaScript puro
 */
async function testarEnvioDeMensagens(sock) {
  const jid = '5511999999999@s.whatsapp.net'

  console.log('📤 Enviando mensagens de teste...')

  // 💬 1. Texto simples
  await sock.sendMessage(jid, { text: 'Olá do Node.js com JavaScript puro! 🚀' })

  // 🖼️ 2. Imagem (via URL ou Buffer)
  await sock.sendMessage(jid, {
    image: { url: 'https://placehold.co/600x400/png' },
    caption: 'Foto enviada em JS puro!',
  })

  // 🎥 3. Vídeo ou GIF
  await sock.sendMessage(jid, {
    video: { url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    caption: 'Vídeo em JavaScript puro!',
    gifPlayback: false,
  })

  // 🎙️ 4. Áudio / Nota de voz (PTT azul)
  await sock.sendMessage(jid, {
    audio: { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    ptt: true,
  })

  // 📍 5. Localização GPS
  await sock.sendMessage(jid, {
    location: {
      degreesLatitude: -23.55052,
      degreesLongitude: -46.633308,
      name: 'Praça da Sé',
      address: 'São Paulo, SP',
    },
  })

  // 👤 6. Contato com vCard
  const vcard =
    'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    'FN:Suporte CDWA\n' +
    'TEL;type=CELL;waid=5511999999999:+55 11 99999-9999\n' +
    'END:VCARD'

  await sock.sendMessage(jid, {
    contact: {
      displayName: 'Suporte CDWA',
      vcard,
    },
  })

  // ❤️ 7. Reação com emoji
  await sock.sendMessage(jid, {
    react: {
      text: '🔥',
      key: {
        remoteJid: jid,
        id: 'MESSAGE_ID_ALVO',
      },
    },
  })

  console.log('🎉 Todas as mensagens foram despachadas com sucesso!')
}

startBot().catch(console.error)
