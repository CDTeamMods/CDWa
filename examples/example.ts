import makeWASocket, { useSecureAuthState } from '../src/index.js'

async function startBot() {
  // 1. Inicializa o estado de autenticação com armazenamento encriptado at-rest
  const auth = await useSecureAuthState('./auth_info', 'chave-mestra-ultra-segura-123')

  // 2. Instancia o cliente moderno
  const sock = makeWASocket({
    auth,
    printQRInTerminal: true,
  })

  // 3. Monitora status da conexão e QR Code
  sock.on('connection.update', (update) => {
    const { connection, qr } = update

    if (qr) {
      console.log('📌 QR Code gerado! Escaneie no WhatsApp:')
      console.log(qr)
    }

    if (connection === 'open') {
      console.log('✅ Conexão estabelecida com sucesso!')
      enviarExemplos(sock)
    }
  })

  // 4. Conecta ao WebSocket do WhatsApp
  await sock.connect()
}

/**
 * Exemplos de envio de todos os tipos de mensagem
 */
async function enviarExemplos(sock: ReturnType<typeof makeWASocket>) {
  const targetJid = '5511999999999@s.whatsapp.net'

  // 💬 1. Mensagem de Texto
  await sock.sendMessage(targetJid, { text: 'Olá! Mensagem enviada pelo CDWA 🚀' })

  // 🖼️ 2. Mensagem de Imagem (Buffer ou URL)
  await sock.sendMessage(targetJid, {
    image: { url: 'https://placehold.co/600x400/png' },
    caption: 'Foto demonstrativa!',
  })

  // 🎥 3. Mensagem de Vídeo (com suporte a GIF / PTV)
  await sock.sendMessage(targetJid, {
    video: { url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    caption: 'Vídeo demonstrativo!',
    gifPlayback: false,
  })

  // 🎙️ 4. Mensagem de Áudio / Nota de Voz (PTT)
  await sock.sendMessage(targetJid, {
    audio: { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    ptt: true, // true envia como áudio gravado no microfone (nota de voz azul)
  })

  // 📍 5. Mensagem de Localização GPS
  await sock.sendMessage(targetJid, {
    location: {
      degreesLatitude: -23.55052,
      degreesLongitude: -46.633308,
      name: 'Praça da Sé',
      address: 'São Paulo, SP, Brasil',
    },
  })

  // 👤 6. Mensagem de Contato (vCard)
  const vcard =
    'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    'FN:Suporte Técnico\n' +
    'TEL;type=CELL;waid=5511999999999:+55 11 99999-9999\n' +
    'END:VCARD'

  await sock.sendMessage(targetJid, {
    contact: {
      displayName: 'Suporte Técnico',
      vcard,
    },
  })

  // ❤️ 7. Reação em mensagem
  await sock.sendMessage(targetJid, {
    react: {
      text: '🚀',
      key: {
        remoteJid: targetJid,
        id: 'MESSAGE_ID_ALVO',
      },
    },
  })
}

startBot().catch(console.error)
