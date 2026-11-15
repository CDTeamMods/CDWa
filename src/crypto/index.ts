import { x25519 } from '@noble/curves/ed25519'
import { hkdf } from '@noble/hashes/hkdf'
import { sha256 } from '@noble/hashes/sha256'
import { gcm } from '@noble/ciphers/aes'
import { randomBytes } from 'crypto'
import type { KeyPair } from '../types/index.js'

/**
 * Utilitários criptográficos de alta performance e segurança para o protocolo WhatsApp
 */

export class CryptoEngine {
  /**
   * Gera um novo par de chaves Curve25519 (Diffie-Hellman)
   */
  static generateKeyPair(): KeyPair {
    const priv = randomBytes(32)
    const pub = x25519.getPublicKey(priv)
    return {
      private: new Uint8Array(priv),
      public: new Uint8Array(pub),
    }
  }

  /**
   * Executa Diffie-Hellman compartilhado (Shared Secret) usando Curve25519
   */
  static sharedKey(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
    return x25519.getSharedSecret(privateKey, publicKey)
  }

  /**
   * HKDF baseado em SHA-256 para derivação segura de chaves (RFC 5869)
   */
  static deriveKey(
    secret: Uint8Array,
    info: string | Uint8Array,
    salt?: Uint8Array,
    length = 32
  ): Uint8Array {
    const infoBytes = typeof info === 'string' ? new TextEncoder().encode(info) : info
    return hkdf(sha256, secret, salt, infoBytes, length)
  }

  /**
   * Encriptação autenticada com AES-256-GCM
   */
  static aesGcmEncrypt(
    key: Uint8Array,
    plaintext: Uint8Array,
    iv: Uint8Array,
    additionalData?: Uint8Array
  ): Uint8Array {
    const cipher = gcm(key, iv, additionalData)
    return cipher.encrypt(plaintext)
  }

  /**
   * Decriptação autenticada com AES-256-GCM
   */
  static aesGcmDecrypt(
    key: Uint8Array,
    ciphertext: Uint8Array,
    iv: Uint8Array,
    additionalData?: Uint8Array
  ): Uint8Array {
    const cipher = gcm(key, iv, additionalData)
    return cipher.decrypt(ciphertext)
  }

  /**
   * Encripta um payload com uma senha mestra (para proteger credenciais at-rest)
   */
  static encryptAtRest(payload: Uint8Array, masterPassphrase: string): { iv: string; salt: string; data: string } {
    const salt = randomBytes(16)
    const iv = randomBytes(12)
    const key = hkdf(sha256, new TextEncoder().encode(masterPassphrase), salt, new TextEncoder().encode('cdwa-at-rest'), 32)
    const encrypted = this.aesGcmEncrypt(key, payload, iv)

    return {
      salt: Buffer.from(salt).toString('hex'),
      iv: Buffer.from(iv).toString('hex'),
      data: Buffer.from(encrypted).toString('base64'),
    }
  }

  /**
   * Decripta um payload protegido com a senha mestra
   */
  static decryptAtRest(
    encryptedBundle: { iv: string; salt: string; data: string },
    masterPassphrase: string
  ): Uint8Array {
    const salt = Buffer.from(encryptedBundle.salt, 'hex')
    const iv = Buffer.from(encryptedBundle.iv, 'hex')
    const data = Buffer.from(encryptedBundle.data, 'base64')
    const key = hkdf(sha256, new TextEncoder().encode(masterPassphrase), salt, new TextEncoder().encode('cdwa-at-rest'), 32)

    return this.aesGcmDecrypt(key, data, iv)
  }
}

export * from './noise.js'

