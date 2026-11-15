import { EventEmitter } from 'events'
import { WhatsAppSocket } from '../socket/index.js'
import { SignalEngine } from '../signal/index.js'
import { BinaryProtocol } from '../binary/index.js'
import { MessageBuilder, type AnyMessageContent, type MessageOptions } from '../messages/index.js'
import { useSecureAuthState } from '../auth/index.js'
import type { SocketConfig, AuthenticationState, ConnectionUpdate, BinaryNode } from '../types/index.js'

export interface ClientEvents {
  'connection.update': (update: ConnectionUpdate) => void
  'messages.upsert': (messages: unknown) => void
  'creds.update': () => void
}

/**
 * Cliente principal da biblioteca CDWA (Clean Decentralized WhatsApp Architecture)
 */
export class WhatsAppClient extends EventEmitter {
  public socket: WhatsAppSocket
  public auth: AuthenticationState | null = null
  public signal: SignalEngine | null = null
  private config: SocketConfig

  constructor(config: SocketConfig = {}) {
    super()
    this.config = config
    this.socket = new WhatsAppSocket(config)

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
   * Envia qualquer tipo de mensagem (Texto, Imagem, Vídeo, Áudio, Localização, Contato, Reação)
   */
  async sendMessage(
    jid: string,
    content: AnyMessageContent | string,
    options: MessageOptions = {}
  ): Promise<{ messageId: string }> {
    const normalizedContent: AnyMessageContent =
      typeof content === 'string' ? { text: content } : content

    const { node, messageId } = await MessageBuilder.buildMessageNode(
      jid,
      normalizedContent,
      options
    )

    this.socket.sendNode(node)
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
