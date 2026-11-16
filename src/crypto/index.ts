import { x25519 } from '@noble/curves/ed25519'
import { hkdf } from '@noble/hashes/hkdf'
import { sha256 } from '@noble/hashes/sha256'
import { gcm } from '@noble/ciphers/aes'
import { randomBytes } from 'crypto'
import type { KeyPair } from '../types/index.js'

/**
 * Utilitários criptográficos de alta performance e segurança para o protocolo WhatsApp.
 *
 * Provê operações com curvas elípticas Curve25519 (X25519), derivação de chaves HKDF (RFC 5869),
 * cifras autenticadas AES-256-GCM e encriptação segura at-rest para credenciais.
 */
export class CryptoEngine {
  /**
   * Gera um novo par de chaves Curve25519 (Diffie-Hellman).
   *
   * @returns Par de chaves contendo `private` (32 bytes) e `public` (32 bytes).
   * @example
   * ```ts
   * const pair = CryptoEngine.generateKeyPair()
   * ```
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
   * Executa Diffie-Hellman compartilhado (Shared Secret) usando Curve25519 (X25519).
   *
   * @param privateKey - Chave privada Curve25519 (32 bytes).
   * @param publicKey - Chave pública Curve25519 remota (32 bytes).
   * @returns Segredo compartilhado calculado (32 bytes).
   * @example
   * ```ts
   * const sharedSecret = CryptoEngine.sharedKey(myPriv, peerPub)
   * ```
   */
  static sharedKey(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
    return x25519.getSharedSecret(privateKey, publicKey)
  }

  /**
   * Deriva chaves criptográficas utilizando HKDF baseado em SHA-256 (RFC 5869).
   *
   * @param secret - Material de chave de entrada (IKM).
   * @param info - Informação de contexto / etiqueta de domínio.
   * @param salt - Sal opcional para a etapa de extração.
   * @param length - Tamanho em bytes da chave derivada (padrão: 32).
   * @returns Chave derivada de tamanho especificado.
   * @example
   * ```ts
   * const derived = CryptoEngine.deriveKey(sharedKey, 'WhatsApp Info', salt, 64)
   * ```
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
   * Criptografa dados em texto plano utilizando AES-256-GCM (cifra autenticada com tag).
   *
   * @param key - Chave de criptografia de 256 bits (32 bytes).
   * @param plaintext - Dados a serem criptografados.
   * @param iv - Vetor de inicialização (IV / Nonce de 12 bytes).
   * @param additionalData - Dados autenticados adicionais (AD) opcionais.
   * @returns Texto cifrado concatenado com a authentication tag (16 bytes).
   * @example
   * ```ts
   * const ciphertext = CryptoEngine.aesGcmEncrypt(key, plaintext, iv)
   * ```
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
   * Descriptografa e verifica a autenticidade de dados utilizando AES-256-GCM.
   *
   * @param key - Chave de 256 bits (32 bytes).
   * @param ciphertext - Texto cifrado com a authentication tag anexada.
   * @param iv - Vetor de inicialização (12 bytes).
   * @param additionalData - Dados autenticados adicionais (AD) que devem bater com a encriptação.
   * @returns Dados originais decodificados em texto plano.
   * @throws {Error} Se a tag de autenticação for inválida ou os dados tiverem sido corrompidos.
   * @example
   * ```ts
   * const plaintext = CryptoEngine.aesGcmDecrypt(key, ciphertext, iv)
   * ```
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
   * Encripta um payload com uma senha mestra para proteger credenciais em repouso no disco (at-rest).
   *
   * @param payload - Dados a serem protegidos.
   * @param masterPassphrase - Senha definida pelo usuário para derivar a chave mestre.
   * @returns Pacote contendo `iv` (hex), `salt` (hex) e `data` (base64).
   * @example
   * ```ts
   * const bundle = CryptoEngine.encryptAtRest(buffer, 'senha-mestre')
   * ```
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
   * Descriptografa um pacote protegido em repouso utilizando a senha mestra.
   *
   * @param encryptedBundle - Objeto com `iv`, `salt` e `data`.
   * @param masterPassphrase - Mesma senha informada no momento da encriptação.
   * @returns Dados originais em `Uint8Array`.
   * @throws {Error} Caso a senha esteja incorreta ou o conteúdo tenha sido violado.
   * @example
   * ```ts
   * const originalBytes = CryptoEngine.decryptAtRest(bundle, 'senha-mestre')
   * ```
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
