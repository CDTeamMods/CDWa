import { CryptoEngine } from './index.js'
import { sha256 } from '@noble/hashes/sha256'
import type { KeyPair } from '../types/index.js'

export const NOISE_PROTOCOL_NAME = 'Noise_XX_25519_AESGCM_SHA256'
export const WA_NOISE_HEADER = new Uint8Array([87, 65, 6, 2]) // "WA\x06\x02"

/**
 * Estado da cifra simétrica do Noise com contador sequencial (Nonce)
 */
export class NoiseCipherState {
  private key: Uint8Array | null = null
  private nonce = 0

  constructor(key?: Uint8Array) {
    if (key) {
      this.key = key
    }
  }

  hasKey(): boolean {
    return this.key !== null
  }

  setKey(key: Uint8Array) {
    this.key = key
    this.nonce = 0
  }

  encryptWithAd(ad: Uint8Array, plaintext: Uint8Array): Uint8Array {
    if (!this.key) {
      return plaintext
    }
    const iv = this.generateNonceBuffer(this.nonce)
    this.nonce += 1
    return CryptoEngine.aesGcmEncrypt(this.key, plaintext, iv, ad)
  }

  decryptWithAd(ad: Uint8Array, ciphertext: Uint8Array): Uint8Array {
    if (!this.key) {
      return ciphertext
    }
    const iv = this.generateNonceBuffer(this.nonce)
    this.nonce += 1
    return CryptoEngine.aesGcmDecrypt(this.key, ciphertext, iv, ad)
  }

  private generateNonceBuffer(nonce: number): Uint8Array {
    const buffer = new Uint8Array(12)
    const view = new DataView(buffer.buffer)
    // Nonce no formato 64-bit integer nos últimos 8 bytes
    view.setUint32(8, nonce, false)
    return buffer
  }
}

/**
 * Máquina de estado do Noise XX Handshake para o WhatsApp Web
 */
export class NoiseHandshake {
  private symmetricState: {
    h: Uint8Array
    ck: Uint8Array
    cipher: NoiseCipherState
  }
  private localEphemeral: KeyPair
  private localStatic: KeyPair
  private remoteEphemeral: Uint8Array | null = null
  private remoteStatic: Uint8Array | null = null

  constructor(localStaticKey: KeyPair) {
    this.localStatic = localStaticKey
    this.localEphemeral = CryptoEngine.generateKeyPair()

    // Inicialização do estado simétrico com o nome do protocolo
    const protocolHash = sha256(new TextEncoder().encode(NOISE_PROTOCOL_NAME))
    this.symmetricState = {
      h: new Uint8Array(protocolHash),
      ck: new Uint8Array(protocolHash),
      cipher: new NoiseCipherState(),
    }

    // Mistura o prólogo inicial do WhatsApp (WA_NOISE_HEADER) no hash
    this.mixHash(WA_NOISE_HEADER)
  }

  private mixHash(data: Uint8Array) {
    const merged = new Uint8Array(this.symmetricState.h.length + data.length)
    merged.set(this.symmetricState.h, 0)
    merged.set(data, this.symmetricState.h.length)
    this.symmetricState.h = sha256(merged)
  }

  private mixKey(data: Uint8Array) {
    // HKDF-Extract e Expand com Chaining Key
    const derived = CryptoEngine.deriveKey(data, '', this.symmetricState.ck, 64)
    this.symmetricState.ck = derived.slice(0, 32)
    const tempK = derived.slice(32, 64)
    this.symmetricState.cipher.setKey(tempK)
  }

  /**
   * Passo 1: Início do Handshake -> Envia chave efêmera local (e)
   */
  startHandshake(): Uint8Array {
    this.mixHash(this.localEphemeral.public)
    // O payload inicial consiste no prólogo do WhatsApp + a chave efêmera
    const message = new Uint8Array(WA_NOISE_HEADER.length + this.localEphemeral.public.length)
    message.set(WA_NOISE_HEADER, 0)
    message.set(this.localEphemeral.public, WA_NOISE_HEADER.length)
    return message
  }

  /**
   * Passo 2: Recebe resposta do servidor WhatsApp <- (e, ee, s, es)
   */
  processServerHello(serverBuffer: Uint8Array): Uint8Array {
    // Extrai a chave efêmera remota (primeiros 32 bytes)
    this.remoteEphemeral = serverBuffer.slice(0, 32)
    this.mixHash(this.remoteEphemeral)

    // ee: Diffie-Hellman entre as duas chaves efêmeras
    const ee = CryptoEngine.sharedKey(this.localEphemeral.private, this.remoteEphemeral)
    this.mixKey(ee)

    // s: Chave estática encriptada do servidor (48 bytes = 32 bytes de chave + 16 bytes auth tag do AES-GCM)
    const encryptedStatic = serverBuffer.slice(32, 80)
    this.remoteStatic = this.symmetricState.cipher.decryptWithAd(this.symmetricState.h, encryptedStatic)
    this.mixHash(encryptedStatic)

    // es: Diffie-Hellman entre a chave efêmera local e a chave estática do servidor
    const es = CryptoEngine.sharedKey(this.localEphemeral.private, this.remoteStatic)
    this.mixKey(es)

    // Payload final criptografado da resposta do servidor
    const encryptedPayload = serverBuffer.slice(80)
    const decryptedPayload = this.symmetricState.cipher.decryptWithAd(this.symmetricState.h, encryptedPayload)
    this.mixHash(encryptedPayload)

    return decryptedPayload
  }

  /**
   * Passo 3: Envia resposta final de autenticação do cliente -> (s, se) + payload
   * Retorna os CipherStates de leitura e escrita para uso no WebSocket
   */
  finishHandshake(payload: Uint8Array): {
    handshakeMessage: Uint8Array
    writeCipher: NoiseCipherState
    readCipher: NoiseCipherState
  } {
    // s: Encripta nossa chave estática de identidade
    const encryptedStatic = this.symmetricState.cipher.encryptWithAd(this.symmetricState.h, this.localStatic.public)
    this.mixHash(encryptedStatic)

    // se: Diffie-Hellman entre nossa chave estática e a efêmera do servidor
    if (!this.remoteEphemeral) {
      throw new Error('Remote ephemeral key is missing in Noise Handshake')
    }
    const se = CryptoEngine.sharedKey(this.localStatic.private, this.remoteEphemeral)
    this.mixKey(se)

    // Encripta o payload final (contendo informações de registro/login)
    const encryptedPayload = this.symmetricState.cipher.encryptWithAd(this.symmetricState.h, payload)
    this.mixHash(encryptedPayload)

    // Mensagem de envio: [encryptedStatic (48b)] + [encryptedPayload]
    const handshakeMessage = new Uint8Array(encryptedStatic.length + encryptedPayload.length)
    handshakeMessage.set(encryptedStatic, 0)
    handshakeMessage.set(encryptedPayload, encryptedStatic.length)

    // Divide a chaining key em 2 chaves finais de transporte (Split)
    const transportKeys = CryptoEngine.deriveKey(new Uint8Array(0), '', this.symmetricState.ck, 64)
    const writeKey = transportKeys.slice(0, 32)
    const readKey = transportKeys.slice(32, 64)

    return {
      handshakeMessage,
      writeCipher: new NoiseCipherState(writeKey),
      readCipher: new NoiseCipherState(readKey),
    }
  }
}
