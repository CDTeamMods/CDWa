import type { SignalKeyStore } from '../types/index.js'

export interface SignalSessionCipher {
  encrypt(plaintext: Uint8Array): Promise<{ type: number; body: Uint8Array }>
  decrypt(ciphertext: Uint8Array): Promise<Uint8Array>
}

/**
 * Motor de gerenciamento do protocolo Signal para criptografia ponta a ponta (E2EE)
 */
export class SignalEngine {
  private keyStore: SignalKeyStore

  constructor(keyStore: SignalKeyStore) {
    this.keyStore = keyStore
  }

  /**
   * Inicializa ou recupera uma sessão de Double Ratchet com um contato/dispositivo
   */
  async getSession(address: string): Promise<Record<string, unknown> | null> {
    const sessions = await this.keyStore.get<Record<string, unknown>>('session', [address])
    return sessions[address] || null
  }

  /**
   * Salva uma sessão atualizada após troca de chaves
   */
  async saveSession(address: string, sessionData: Record<string, unknown>): Promise<void> {
    await this.keyStore.set({
      session: {
        [address]: sessionData,
      },
    })
  }

  /**
   * Gerenciamento de chaves de remetente (Sender Keys) para envio otimizado em grupos
   */
  async getGroupSenderKey(groupId: string, senderId: string): Promise<Record<string, unknown> | null> {
    const keyKey = `${groupId}::${senderId}`
    const keys = await this.keyStore.get<Record<string, unknown>>('sender-key', [keyKey])
    return keys[keyKey] || null
  }
}
