import type { SignalKeyStore } from '../types/index.js'

export interface SignalSessionCipher {
  encrypt(plaintext: Uint8Array): Promise<{ type: number; body: Uint8Array }>
  decrypt(ciphertext: Uint8Array): Promise<Uint8Array>
}

/**
 * Motor de gerenciamento do protocolo Signal para criptografia ponta a ponta (E2EE).
 *
 * Responsável por recuperar e armazenar sessões de Double Ratchet e chaves de remetente (Sender Keys)
 * utilizadas na troca segura de mensagens individuais e em grupos no WhatsApp.
 */
export class SignalEngine {
  private keyStore: SignalKeyStore

  /**
   * Inicializa o motor Signal com o repositório de chaves informado.
   *
   * @param keyStore - Adaptador de persistência de chaves (`SignalKeyStore`).
   */
  constructor(keyStore: SignalKeyStore) {
    this.keyStore = keyStore
  }

  /**
   * Recupera o estado atual de uma sessão Double Ratchet para um determinado contato ou dispositivo.
   *
   * @param address - Endereço do destinatário no formato `numero.dispositivo:identificador` (ex: `5511999999999.0:0`).
   * @returns O objeto com dados da sessão ou `null` caso ainda não exista sessão estabelecida.
   * @example
   * ```ts
   * const session = await signal.getSession('5511999999999.0:0')
   * ```
   */
  async getSession(address: string): Promise<Record<string, unknown> | null> {
    const sessions = await this.keyStore.get<Record<string, unknown>>('session', [address])
    return sessions[address] || null
  }

  /**
   * Salva o estado atualizado de uma sessão Double Ratchet após a rotação ou recepção de chaves.
   *
   * @param address - Endereço do contato ou dispositivo.
   * @param sessionData - Dados da sessão atualizada a serem persistidos.
   * @example
   * ```ts
   * await signal.saveSession('5511999999999.0:0', sessionRecord)
   * ```
   */
  async saveSession(address: string, sessionData: Record<string, unknown>): Promise<void> {
    await this.keyStore.set({
      session: {
        [address]: sessionData,
      },
    })
  }

  /**
   * Recupera a Sender Key (chave de remetente) para criptografia otimizada em grupos do WhatsApp.
   *
   * @param groupId - Identificador do grupo (ex: `123456789-987654@g.us`).
   * @param senderId - Identificador JID do participante do grupo.
   * @returns Registro da chave de remetente ou `null` se inexistente.
   * @example
   * ```ts
   * const senderKey = await signal.getGroupSenderKey('12345@g.us', '5511999999999@s.whatsapp.net')
   * ```
   */
  async getGroupSenderKey(groupId: string, senderId: string): Promise<Record<string, unknown> | null> {
    const keyKey = `${groupId}::${senderId}`
    const keys = await this.keyStore.get<Record<string, unknown>>('sender-key', [keyKey])
    return keys[keyKey] || null
  }
}
