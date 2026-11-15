// Exemplo de Envio de Todos os Tipos de Mensagens em CommonJS Puro (.cjs)
// Execute com: node examples/example.cjs
const { default: makeWASocket, useSecureAuthState } = require('../dist/index.cjs')

async function startBot() {
  console.log('🤖 Iniciando bot em CommonJS puro (require)...')

  // 1. Armazenamento seguro de credenciais
  const auth = await useSecureAuthState('./auth_info', 'minha-chave-secreta-cjs')

  // 2. Inicializa o cliente WhatsApp
  const sock = makeWASocket({
    auth,
    printQRInTerminal: true,
  })

  // 3. Monitora conexão
  sock.on('connection.update', async (update) => {
    const { connection, qr } = update

    if (qr) {
      console.log('📌 QR Code gerado! Escaneie no WhatsApp:')
      console.log(qr)
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado via CommonJS puro!')
      await testarEnvios(sock)
    }
  })

  // 4. Conectar
  await sock.connect()
}

async function testarEnvios(sock) {
  const jid = '5511999999999@s.whatsapp.net'

  // Texto
  await sock.sendMessage(jid, { text: 'Mensagem enviada com CommonJS puro (require)! 🚀' })

  // Imagem
  await sock.sendMessage(jid, {
    image: { url: 'https://placehold.co/600x400/png' },
    caption: 'Foto enviada via CommonJS!',
  })

  // Áudio PTT (nota de voz azul)
  await sock.sendMessage(jid, {
    audio: { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    ptt: true,
  })

  // Localização GPS
  await sock.sendMessage(jid, {
    location: {
      degreesLatitude: -23.55052,
      degreesLongitude: -46.633308,
      name: 'Praça da Sé',
    },
  })
}

startBot().catch(console.error)
