import { describe, it, expect } from 'vitest'
import { CryptoEngine } from '../src/crypto/index.js'

describe('CryptoEngine', () => {
  it('deve gerar par de chaves Curve25519 válido', () => {
    const keyPair = CryptoEngine.generateKeyPair()
    expect(keyPair.private).toHaveLength(32)
    expect(keyPair.public).toHaveLength(32)
  })

  it('deve computar segredo compartilhado (Diffie-Hellman) consistente', () => {
    const alice = CryptoEngine.generateKeyPair()
    const bob = CryptoEngine.generateKeyPair()

    const shared1 = CryptoEngine.sharedKey(alice.private, bob.public)
    const shared2 = CryptoEngine.sharedKey(bob.private, alice.public)

    expect(Buffer.from(shared1).toString('hex')).toBe(Buffer.from(shared2).toString('hex'))
  })

  it('deve encriptar e decriptar com AES-256-GCM', () => {
    const key = new Uint8Array(32).fill(7)
    const iv = new Uint8Array(12).fill(1)
    const message = new TextEncoder().encode('WhatsApp E2EE Message')

    const encrypted = CryptoEngine.aesGcmEncrypt(key, message, iv)
    const decrypted = CryptoEngine.aesGcmDecrypt(key, encrypted, iv)

    expect(new TextDecoder().decode(decrypted)).toBe('WhatsApp E2EE Message')
  })

  it('deve proteger credenciais com encriptação at-rest com senha mestra', () => {
    const originalSecret = new TextEncoder().encode(JSON.stringify({ creds: 'super-sensitive-token' }))
    const passphrase = 'my-master-secure-password'

    const bundle = CryptoEngine.encryptAtRest(originalSecret, passphrase)
    expect(bundle.data).toBeDefined()
    expect(bundle.salt).toBeDefined()
    expect(bundle.iv).toBeDefined()

    const decrypted = CryptoEngine.decryptAtRest(bundle, passphrase)
    expect(new TextDecoder().decode(decrypted)).toBe(new TextDecoder().decode(originalSecret))
  })
})
