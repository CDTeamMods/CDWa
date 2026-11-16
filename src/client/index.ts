import { EventEmitter } from 'events'
import { WhatsAppSocket } from '../socket/index.js'
import { SignalEngine } from '../signal/index.js'
import { BinaryProtocol } from '../binary/index.js'
import { MessageBuilder, type AnyMessageContent, type MessageOptions } from '../messages/index.js'
import { SafeMessageQueue, PresenceSimulator, type PresenceType } from '../safety/index.js'
import type { SocketConfig, AuthenticationState, ConnectionUpdate, BinaryNode } from '../types/index.js'

export interface ClientEvents {
  'connection.update': (update: ConnectionUpdate) => void
  'messages.upsert': (messages: unknown) => void
  'creds.update': () => void
}

/**
 * Cliente principal da biblioteca CDWA (Next-generation WhatsApp Web Multi-Device Protocol Engine).
 *
 * Gerencia a conexão WebSocket com os servidores do WhatsApp, autenticação Noise Handshake,
 * criptografia ponta-a-ponta (Signal Protocol), simulação de comportamento humano e fila inteligente de mensagens.
 *
 * @example
 * ```ts
 * import makeWASocket, { useSecureAuthState } from 'cdwa'
 *
 * const auth = await useSecureAuthState('./auth_info')
 * const sock = makeWASocket({ auth })
 *
 * sock.on('connection.update', ({ connection, qr }) => {
 *   if (qr) console.log('QR Code:', qr)
 *   if (connection === 'open') console.log('Conectado com sucesso!')
 * })
 *
 * await sock.connect()
 * ```
 */
export class WhatsAppClient extends EventEmitter {
  public socket: WhatsAppSocket
  public auth: AuthenticationState | null = null
  public signal: SignalEngine | null = null
  public readonly config: SocketConfig
  public readonly safeQueue: SafeMessageQueue
  public readonly presence: PresenceSimulator

  /**
   * Inicializa uma nova instância do cliente WhatsApp.
   *
   * @param config - Configurações opcionais de conexão, autenticação e parâmetros de segurança/rate limiting.
   */
  constructor(config: SocketConfig = {}) {
    super()
    this.config = config
    this.socket = new WhatsAppSocket(config)

    // Configuração do motor de segurança e rate limiting
    this.safeQueue = new SafeMessageQueue({
      minDelayMs: config.safety?.minDelayMs,
      maxDelayMs: config.safety?.maxDelayMs,
      maxMessagesPerMinute: config.safety?.maxMessagesPerMinute,
    })

    this.presence = new PresenceSimulator({
      autoTyping: config.safety?.simulateHumanBehavior ?? true,
      autoRecording: config.safety?.simulateHumanBehavior ?? true,
    })

    if (config.auth) {
      this.setAuthState(config.auth)
    }

    this.setupListeners()
  }

  /**
   * Configura ou atualiza o estado de autenticação e inicializa o motor criptográfico Signal.
   *
   * @param auth - Estrutura de autenticação contendo credenciais e armazenamento de chaves (SignalKeyStore).
   */
  public setAuthState(auth: AuthenticationState): void {
    this.auth = auth
    this.signal = new SignalEngine(auth.keys)
  }

  /**
   * Configura os ouvintes de eventos internos do WebSocket e propaga para a instância do cliente.
   *
   * @internal
   */
  private setupListeners(): void {
    this.socket.on('connection.update', (update: ConnectionUpdate) => {
      this.emit('connection.update', update)
    })

    this.socket.on('handshake.complete', () => {
      this.onHandshakeComplete()
    })

    this.socket.on('node', (node: BinaryNode) => {
      this.handleIncomingNode(node)
    })

    this.socket.on('error', (err: Error) => {
      this.emit('error', err)
    })
  }

  /**
   * Disparado após a conclusão bem-sucedida do handshake criptografado Noise.
   * Determina se é necessário solicitar pareamento via QR Code ou abrir a conexão.
   *
   * @internal
   */
  private async onHandshakeComplete(): Promise<void> {
    if (!this.auth) {
      return
    }

    // Se o cliente ainda não tem conta vinculada, inicia o fluxo de pareamento com QR Code
    if (!this.auth.creds.me) {
      await this.requestPairingCode()
    } else {
      // Já autenticado: emite status de conexão aberta
      this.emit('connection.update', { connection: 'open', isNewLogin: false })
    }
  }

  /**
   * Envia uma stanza IQ solicitando referência para geração do QR Code de pareamento.
   *
   * @internal
   */
  private async requestPairingCode(): Promise<void> {
    if (!this.auth) return

    const pairNode = BinaryProtocol.createNode(
      'iq',
      {
        to: 's.whatsapp.net',
        type: 'set',
        xmlns: 'pair-device',
        id: `pair-${Date.now()}`,
      },
      [
        BinaryProtocol.createNode('pair-device', {}, [
          BinaryProtocol.createNode('ref', {}, undefined),
        ]),
      ]
    )

    this.socket.sendNode(pairNode)
  }

  /**
   * Processa stanzas binárias recebidas do servidor do WhatsApp Web (como QR code, mensagens, stanzas iq).
   *
   * @param node - Estrutura BinaryNode recebida decodificada do WABinary.
   * @internal
   */
  private handleIncomingNode(node: BinaryNode): void {
    this.emit('raw.node', node)

    // Trata resposta de pareamento (QR Code)
    if (node.tag === 'iq' && node.attrs.type === 'result') {
      const pairDevice = BinaryProtocol.getChildNode(node, 'pair-device')
      if (pairDevice) {
        const refNode = BinaryProtocol.getChildNode(pairDevice, 'ref')
        if (refNode && typeof refNode.content === 'string' && this.auth) {
          const ref = refNode.content
          const pubKey = Buffer.from(this.auth.creds.signedIdentityKey.public).toString('base64')
          const noisePub = Buffer.from(this.auth.creds.noiseKey.public).toString('base64')
          
          // Formato padrão do QR Code do WhatsApp Web: ref,noisePublicKey,identityPublicKey,advSecretKey
          const qrString = `${ref},${noisePub},${pubKey},${this.auth.creds.advSecretKey}`
          this.emit('connection.update', { qr: qrString })

          if (this.config.printQRInTerminal) {
            import('qrcode-terminal')
              .then((qrcode) => {
                const qrGen = (qrcode as unknown as { default?: { generate: (text: string, opts?: { small: boolean }) => void }; generate: (text: string, opts?: { small: boolean }) => void }).default || qrcode
                qrGen.generate(qrString, { small: true })
              })
              .catch(() => {
                console.log('📌 QR Code gerado:', qrString)
                console.log('💡 Dica: instale `qrcode-terminal` (npm install qrcode-terminal) para renderizar o QR Code graficamente no terminal.')
              })
          }
        }
      }
    }

    // Trata sucesso de pareamento
    if (node.tag === 'iq' && node.attrs.xmlns === 'pair-success') {
      this.emit('connection.update', { connection: 'open', isNewLogin: true })
    }

    // Trata mensagens recebidas
    if (node.tag === 'message') {
      this.emit('messages.upsert', { node })
    }
  }

  /**
   * Inicia o fluxo de conexão com o WhatsApp Web e realiza o handshake criptográfico Noise.
   *
   * @throws {Error} Se o estado de autenticação (`auth`) não tiver sido definido antes de conectar.
   * @example
   * ```ts
   * await client.connect()
   * ```
   */
  async connect(): Promise<void> {
    if (!this.auth) {
      throw new Error('AuthenticationState must be provided before calling connect()')
    }
    await this.socket.connect(this.auth.creds.noiseKey)
  }

  /**
   * Envia uma atualização de presença para um contato ou grupo.
   *
   * @param jid - O identificador JID de destino (ex: `5511999999999@s.whatsapp.net` ou `123456@g.us`).
   * @param type - O tipo de presença: `'composing'` (digitando), `'recording'` (gravando áudio), `'available'` (online), `'unavailable'` (offline) ou `'paused'`.
   * @example
   * ```ts
   * await client.sendPresenceUpdate('5511999999999@s.whatsapp.net', 'composing')
   * ```
   */
  async sendPresenceUpdate(jid: string, type: PresenceType): Promise<void> {
    const node = this.presence.createPresenceNode(jid, type)
    this.socket.sendNode(node)
  }

  /**
   * Marca mensagens como lidas enviando o recibo de leitura (double blue check / visualizado).
   *
   * @param keys - Lista de identificadores de mensagem a marcar como lidas (`remoteJid`, `id` e opcionalmente `participant` em grupos).
   * @example
   * ```ts
   * await client.readMessages([{ remoteJid: '5511999999999@s.whatsapp.net', id: '3EB012345' }])
   * ```
   */
  async readMessages(keys: Array<{ remoteJid: string; id: string; participant?: string }>): Promise<void> {
    for (const key of keys) {
      const node = this.presence.createReadReceiptNode(key.remoteJid, key.id, key.participant)
      this.socket.sendNode(node)
    }
  }

  /**
   * Envia qualquer tipo de mensagem com recursos de segurança anti-ban, simulação humana e fila inteligente de rate limiting.
   *
   * @param jid - O identificador JID de destino (ex: `5511999999999@s.whatsapp.net` ou `123456-789@g.us`).
   * @param content - Conteúdo da mensagem: texto simples em string ou objeto estruturado (`{ text }`, `{ image }`, `{ audio }`, `{ video }`, `{ document }`, etc).
   * @param options - Opções adicionais de envio, como mensagem citada (`quoted`), timestamp ou opções de encaminhamento.
   * @returns Objeto com o ID gerado da mensagem (`messageId`).
   * @example
   * ```ts
   * // Envio de texto simples
   * const { messageId } = await client.sendMessage('5511999999999@s.whatsapp.net', 'Olá mundo!')
   *
   * // Envio com mídia
   * await client.sendMessage('5511999999999@s.whatsapp.net', {
   *   image: { url: 'https://exemplo.com/foto.jpg' },
   *   caption: 'Foto de demonstração'
   * })
   * ```
   */
  async sendMessage(
    jid: string,
    content: AnyMessageContent | string,
    options: MessageOptions = {}
  ): Promise<{ messageId: string }> {
    const shouldRateLimit = this.config.safety?.rateLimit ?? true

    if (shouldRateLimit) {
      return this.safeQueue.enqueue(async () => {
        return this.internalSendMessage(jid, content, options)
      })
    }

    return this.internalSendMessage(jid, content, options)
  }

  /**
   * Executa internamente o envio da mensagem após passar pela fila de rate limiting,
   * aplicando simulações de presença prévias e montagem do nó WABinary.
   *
   * @param jid - O identificador JID de destino.
   * @param content - Conteúdo da mensagem a ser enviada.
   * @param options - Opções de envio de mensagem.
   * @returns Identificador da mensagem enviada.
   * @internal
   */
  private async internalSendMessage(
    jid: string,
    content: AnyMessageContent | string,
    options: MessageOptions = {}
  ): Promise<{ messageId: string }> {
    const normalizedContent: AnyMessageContent =
      typeof content === 'string' ? { text: content } : content

    const simulateBehavior = this.config.safety?.simulateHumanBehavior ?? true

    // Simulação de presença antes do envio para evitar detecção anti-spam
    if (simulateBehavior) {
      if ('text' in normalizedContent) {
        const text = normalizedContent.text
        await this.sendPresenceUpdate(jid, 'composing')
        const duration = this.presence.calculateTypingDuration(text.length)
        await this.presence.sleep(duration)
      } else if ('audio' in normalizedContent) {
        await this.sendPresenceUpdate(jid, 'recording')
        await this.presence.sleep(1500)
      }
    }

    const { node, messageId } = await MessageBuilder.buildMessageNode(
      jid,
      normalizedContent,
      options
    )

    this.socket.sendNode(node)

    // Finaliza estado de presença
    if (simulateBehavior && ('text' in normalizedContent || 'audio' in normalizedContent)) {
      await this.sendPresenceUpdate(jid, 'paused')
    }

    return { messageId }
  }

  /**
   * Encerra a conexão com o servidor WebSocket do WhatsApp e limpa todos os timers e ouvintes ativos.
   *
   * @example
   * ```ts
   * client.disconnect()
   * ```
   */
  disconnect(): void {
    this.socket.disconnect()
  }
}

/**
 * Factory function para inicialização ergonômica estilo Baileys: `makeWASocket`.
 *
 * @param config - Configurações opcionais do cliente WhatsApp (auth, timeouts, safety, etc).
 * @returns Instância configurada do cliente `WhatsAppClient`.
 * @example
 * ```ts
 * import makeWASocket, { useSecureAuthState } from 'cdwa'
 *
 * const auth = await useSecureAuthState('./auth_info')
 * const sock = makeWASocket({
 *   auth,
 *   safety: {
 *     rateLimit: true,
 *     simulateHumanBehavior: true
 *   }
 * })
 * ```
 */
export function makeWASocket(config: SocketConfig = {}): WhatsAppClient {
  return new WhatsAppClient(config)
}

export {
  useSecureAuthState,
  makeCacheableSignalKeyStore,
  type CacheStore,
  type CacheableKeyStoreOptions,
} from '../auth/index.js'
export {
  DisconnectReason,
  type DisconnectReasonType,
  DisconnectError,
  shouldReconnect,
  isLoggedOut,
  getDisconnectStatusCode,
} from '../socket/index.js'
