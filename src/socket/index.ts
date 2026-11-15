import WebSocket from 'ws'
import { EventEmitter } from 'events'
import { NoiseHandshake, NoiseCipherState } from '../crypto/noise.js'
import { BinaryProtocol } from '../binary/index.js'
import type { SocketConfig, ConnectionState, ConnectionUpdate, BinaryNode, KeyPair } from '../types/index.js'

export const DEFAULT_WA_WS_URL = 'wss://web.whatsapp.com/ws/chat'

export class WhatsAppSocket extends EventEmitter {
  private ws: WebSocket | null = null
  private config: SocketConfig
  private pingInterval: NodeJS.Timeout | null = null
  private state: ConnectionState = 'close'

  // Noise Handshake & Ciphers
  private noise: NoiseHandshake | null = null
  private writeCipher: NoiseCipherState | null = null
  private readCipher: NoiseCipherState | null = null
  private isHandshakeComplete = false

  constructor(config: SocketConfig = {}) {
    super()
    this.config = {
      waWebSocketUrl: DEFAULT_WA_WS_URL,
      connectTimeoutMs: 20000,
      keepAliveIntervalMs: 30000,
      ...config,
    }
  }

  get connectionState(): ConnectionState {
    return this.state
  }

  private updateConnection(update: ConnectionUpdate) {
    if (update.connection) {
      this.state = update.connection
    }
    this.emit('connection.update', update)
  }

  async connect(staticKey: KeyPair): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.isHandshakeComplete = false
    this.writeCipher = null
    this.readCipher = null
    this.noise = new NoiseHandshake(staticKey)

    this.updateConnection({ connection: 'connecting' })

    const wsUrl = this.config.waWebSocketUrl || DEFAULT_WA_WS_URL
    this.ws = new WebSocket(wsUrl, {
      origin: 'https://web.whatsapp.com',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    this.ws.on('open', () => {
      this.startKeepAlive()
      this.emit('open')
      this.initiateNoiseHandshake()
    })

    this.ws.on('message', (data: WebSocket.RawData) => {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
      this.handleIncomingFrame(new Uint8Array(buffer))
    })

    this.ws.on('close', (code: number, reason: Buffer) => {
      this.cleanup()
      this.updateConnection({
        connection: 'close',
        lastDisconnect: {
          error: new Error(`WebSocket closed with code ${code}: ${reason.toString()}`),
          date: new Date(),
        },
      })
    })

    this.ws.on('error', (err: Error) => {
      this.emit('error', err)
    })
  }

  /**
   * Envia a mensagem inicial do Noise Handshake
   */
  private initiateNoiseHandshake() {
    if (!this.noise) return
    const initialPayload = this.noise.startHandshake()
    this.sendRaw(initialPayload)
  }

  /**
   * Trata frames recebidos pelo WebSocket
   */
  private handleIncomingFrame(frame: Uint8Array) {
    if (!this.isHandshakeComplete) {
      this.handleHandshakeFrame(frame)
      return
    }

    // Após o handshake, os frames de dados possuem 3 bytes de tamanho + payload encriptado
    if (this.readCipher && frame.length > 3) {
      const ciphertext = frame.slice(3)
      const decrypted = this.readCipher.decryptWithAd(new Uint8Array(0), ciphertext)

      try {
        const node = BinaryProtocol.decode(decrypted)
        this.emit('node', node)
      } catch (err) {
        this.emit('error', new Error(`Failed to decode WABinary stanza: ${(err as Error).message}`))
      }
    }
  }

  /**
   * Conclui as etapas do Noise Handshake
   */
  private handleHandshakeFrame(frame: Uint8Array) {
    if (!this.noise) return

    try {
      // 1. Processa resposta do servidor (Server Hello)
      this.noise.processServerHello(frame)

      // 2. Monta o payload do cliente (Client Payload com versão e credenciais)
      const clientPayload = new Uint8Array([0]) // Payload inicial mínimo
      const finish = this.noise.finishHandshake(clientPayload)

      this.writeCipher = finish.writeCipher
      this.readCipher = finish.readCipher
      this.isHandshakeComplete = true

      // Envia a resposta final do handshake
      this.sendRaw(finish.handshakeMessage)

      // Conexão segura estabelecida
      this.updateConnection({ connection: 'open' })
      this.emit('handshake.complete')
    } catch (err) {
      this.emit('error', new Error(`Noise Handshake failed: ${(err as Error).message}`))
      this.disconnect()
    }
  }

  /**
   * Envia uma stanza estruturada, codificando em WABinary e criptografando com o Noise Write Cipher
   */
  sendNode(node: BinaryNode): void {
    if (!this.isHandshakeComplete || !this.writeCipher) {
      throw new Error('Cannot send stanza: Noise Handshake is not complete')
    }

    const encodedNode = BinaryProtocol.encode(node)
    const encrypted = this.writeCipher.encryptWithAd(new Uint8Array(0), encodedNode)

    // Formata o frame com 3 bytes de tamanho (Big Endian)
    const length = encrypted.length
    const frame = new Uint8Array(3 + length)
    frame[0] = (length >> 16) & 0xff
    frame[1] = (length >> 8) & 0xff
    frame[2] = length & 0xff
    frame.set(encrypted, 3)

    this.sendRaw(frame)
  }

  private sendRaw(data: Uint8Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Cannot send raw data: WebSocket is not open')
    }
    this.ws.send(data)
  }

  private startKeepAlive(): void {
    this.stopKeepAlive()
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping()
      }
    }, this.config.keepAliveIntervalMs)
  }

  private stopKeepAlive(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private cleanup(): void {
    this.stopKeepAlive()
    this.isHandshakeComplete = false
    this.writeCipher = null
    this.readCipher = null
    this.noise = null
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws = null
    }
  }

  disconnect(): void {
    this.cleanup()
    this.updateConnection({ connection: 'close' })
  }
}
