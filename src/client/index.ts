import { EventEmitter } from 'events'
import { WhatsAppSocket } from '../socket/index.js'
import { SignalEngine } from '../signal/index.js'
import { BinaryProtocol } from '../binary/index.js'
import { MessageBuilder, type AnyMessageContent, type MessageOptions } from '../messages/index.js'
import { useSecureAuthState } from '../auth/index.js'
import { SafeMessageQueue, PresenceSimulator, type PresenceType } from '../safety/index.js'
import type { SocketConfig, AuthenticationState, ConnectionUpdate, BinaryNode } from '../types/index.js'

export interface ClientEvents {
  'connection.update': (update: ConnectionUpdate) => void
  'messages.upsert': (messages: unknown) => void
  'creds.update': () => void
}

/**
 * Cliente principal da biblioteca CDWA
 */
export class WhatsAppClient extends EventEmitter {
  public socket: WhatsAppSocket
  public auth: AuthenticationState | null = null
  public signal: SignalEngine | null = null
  public readonly config: SocketConfig
  public readonly safeQueue: SafeMessageQueue
  public readonly presence: PresenceSimulator

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

  public setAuthState(auth: AuthenticationState) {
    this.auth = auth
    this.signal = new SignalEngine(auth.keys)
  }

  private setupListeners() {
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
   * Disparado após a conexão criptografada (Noise) estar pronta
   */
  private async onHandshakeComplete() {
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
   * Envia stanza solicitando o QR Code de pareamento
   */
  private async requestPairingCode() {
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
   * Processa stanzas recebidas do WhatsApp
   */
  private handleIncomingNode(node: BinaryNode) {
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
   * Inicia o fluxo de conexão com o WhatsApp Web
   */
  async connect(): Promise<void> {
    if (!this.auth) {
      throw new Error('AuthenticationState must be provided before calling connect()')
    }
    await this.socket.connect(this.auth.creds.noiseKey)
  }

  /**
   * Envia uma atualização de presença (composing, recording, available, unavailable, paused)
   */
  async sendPresenceUpdate(jid: string, type: PresenceType): Promise<void> {
    const node = this.presence.createPresenceNode(jid, type)
    this.socket.sendNode(node)
  }

  /**
   * Marca mensagens como lidas (recibo de leitura / double blue ticks)
   */
  async readMessages(keys: Array<{ remoteJid: string; id: string; participant?: string }>): Promise<void> {
    for (const key of keys) {
      const node = this.presence.createReadReceiptNode(key.remoteJid, key.id, key.participant)
      this.socket.sendNode(node)
    }
  }

  /**
   * Envia qualquer tipo de mensagem com recursos de segurança e fila inteligente de rate limiting
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
   * Encerra a conexão
   */
  disconnect(): void {
    this.socket.disconnect()
  }
}

/**
 * Factory function para inicialização ergonômica estilo Baileys: `makeWASocket`
 */
export function makeWASocket(config: SocketConfig = {}): WhatsAppClient {
  return new WhatsAppClient(config)
}

export { useSecureAuthState }
