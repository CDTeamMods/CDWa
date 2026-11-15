import { randomBytes } from 'crypto'
import { CryptoEngine } from '../crypto/index.js'
import type { AuthenticationCreds, AuthenticationState, SignalKeyStore } from '../types/index.js'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Cria credenciais limpas para uma nova sessão Multi-Device
 */
export function initAuthCreds(): AuthenticationCreds {
  const identityKeyPair = CryptoEngine.generateKeyPair()
  const noiseKey = CryptoEngine.generateKeyPair()
  const pairingEphemeral = CryptoEngine.generateKeyPair()
  const signedPreKey = CryptoEngine.generateKeyPair()

  // Assinatura da pré-chave com a chave de identidade
  // No WhatsApp, isso garante autenticidade contra MITM no protocolo Signal
  const signedSignature = CryptoEngine.sharedKey(identityKeyPair.private, signedPreKey.public)

  return {
    noiseKey,
    pairingEphemeralKeyPair: pairingEphemeral,
    signedIdentityKey: identityKeyPair,
    signedPreKey: {
      ...signedPreKey,
      keyId: 1,
      signature: signedSignature,
    },
    registrationId: Math.floor(Math.random() * 16384),
    advSecretKey: Buffer.from(randomBytes(32)).toString('base64'),
    firstUnuploadedPreKeyId: 1,
    nextPreKeyId: 1,
  }
}

/**
 * Gerenciador de estado de autenticação com suporte opcional a encriptação at-rest
 */
export class EncryptedFileAuthState {
  private folderPath: string
  private passphrase?: string

  constructor(folderPath: string, passphrase?: string) {
    this.folderPath = folderPath
    this.passphrase = passphrase
  }

  private async ensureDir() {
    await fs.mkdir(this.folderPath, { recursive: true })
  }

  private getFilePath(filename: string): string {
    return path.join(this.folderPath, `${filename}.json`)
  }

  async save(key: string, data: unknown): Promise<void> {
    await this.ensureDir()
    const filePath = this.getFilePath(key)
    const jsonString = JSON.stringify(data, (_, value) => {
      if (value instanceof Uint8Array) {
        return { __type: 'Buffer', data: Buffer.from(value).toString('base64') }
      }
      return value
    })

    if (this.passphrase) {
      const encrypted = CryptoEngine.encryptAtRest(new TextEncoder().encode(jsonString), this.passphrase)
      await fs.writeFile(filePath, JSON.stringify(encrypted), 'utf-8')
    } else {
      await fs.writeFile(filePath, jsonString, 'utf-8')
    }
  }

  async load<T>(key: string): Promise<T | null> {
    const filePath = this.getFilePath(key)
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      let jsonString = content

      if (this.passphrase) {
        const bundle = JSON.parse(content)
        const decryptedBytes = CryptoEngine.decryptAtRest(bundle, this.passphrase)
        jsonString = new TextDecoder().decode(decryptedBytes)
      }

      return JSON.parse(jsonString, (_, value) => {
        if (value && value.__type === 'Buffer') {
          return new Uint8Array(Buffer.from(value.data, 'base64'))
        }
        return value
      }) as T
    } catch {
      return null
    }
  }

  createKeyStore(): SignalKeyStore {
    return {
      get: async <T>(type: string, ids: string[]): Promise<Record<string, T>> => {
        const result: Record<string, T> = {}
        for (const id of ids) {
          const item = await this.load<T>(`${type}-${id}`)
          if (item) {
            result[id] = item
          }
        }
        return result
      },
      set: async (data: Record<string, Record<string, unknown>>): Promise<void> => {
        for (const [type, entries] of Object.entries(data)) {
          for (const [id, value] of Object.entries(entries)) {
            await this.save(`${type}-${id}`, value)
          }
        }
      },
    }
  }
}

/**
 * Cria um estado de autenticação persistente com segurança reforçada
 */
export async function useSecureAuthState(
  folderPath: string,
  passphrase?: string
): Promise<AuthenticationState> {
  const storage = new EncryptedFileAuthState(folderPath, passphrase)
  let creds = await storage.load<AuthenticationCreds>('creds')

  if (!creds) {
    creds = initAuthCreds()
    await storage.save('creds', creds)
  }

  return {
    creds,
    keys: storage.createKeyStore(),
  }
}
