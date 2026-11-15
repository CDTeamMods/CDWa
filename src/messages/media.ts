import { randomBytes, createCipheriv, createHmac } from 'crypto'
import { sha256 } from '@noble/hashes/sha256'
import { CryptoEngine } from '../crypto/index.js'

export type MediaType = 'image' | 'video' | 'audio' | 'document'

export interface EncryptedMediaResult {
  mediaKey: Uint8Array
  ciphertext: Uint8Array
  fileSha256: Uint8Array
  fileEncSha256: Uint8Array
  mac: Uint8Array
}

const MEDIA_HKDF_INFO: Record<MediaType, string> = {
  image: 'WhatsApp Image Keys',
  video: 'WhatsApp Video Keys',
  audio: 'WhatsApp Audio Keys',
  document: 'WhatsApp Document Keys',
}

/**
 * Pipeline de criptografia E2EE para mídias do WhatsApp
 */
export class MediaCrypto {
  /**
   * Criptografa o arquivo de mídia de acordo com o padrão RFC do WhatsApp
   */
  static encryptMedia(mediaBuffer: Uint8Array, type: MediaType): EncryptedMediaResult {
    // 1. Gera uma chave aleatória de 32 bytes para a mídia
    const mediaKey = randomBytes(32)
    const info = MEDIA_HKDF_INFO[type]

    // 2. Expande para 112 bytes: [iv (16b), cipherKey (32b), macKey (32b), refKey (32b)]
    const expandedKeys = CryptoEngine.deriveKey(new Uint8Array(mediaKey), info, undefined, 112)
    const iv = expandedKeys.slice(0, 16)
    const cipherKey = expandedKeys.slice(16, 48)
    const macKey = expandedKeys.slice(48, 80)

    // 3. SHA-256 do arquivo original limpo
    const fileSha256 = sha256(mediaBuffer)

    // 4. Encripta o buffer com AES-256-CBC
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(cipherKey), Buffer.from(iv))
    const encryptedBody = Buffer.concat([cipher.update(Buffer.from(mediaBuffer)), cipher.final()])

    // 5. Gera HMAC-SHA256 dos dados criptografados (truncado em 10 bytes)
    const hmac = createHmac('sha256', Buffer.from(macKey))
    hmac.update(Buffer.from(iv))
    hmac.update(encryptedBody)
    const fullMac = hmac.digest()
    const mac = fullMac.subarray(0, 10)

    // 6. Payload final encriptado: [encryptedBody] + [mac (10b)]
    const finalCiphertext = new Uint8Array(encryptedBody.length + mac.length)
    finalCiphertext.set(encryptedBody, 0)
    finalCiphertext.set(mac, encryptedBody.length)

    // 7. SHA-256 do arquivo encriptado
    const fileEncSha256 = sha256(finalCiphertext)

    return {
      mediaKey: new Uint8Array(mediaKey),
      ciphertext: finalCiphertext,
      fileSha256: new Uint8Array(fileSha256),
      fileEncSha256: new Uint8Array(fileEncSha256),
      mac: new Uint8Array(mac),
    }
  }
}
