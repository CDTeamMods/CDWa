import { BinaryProtocol } from '../binary/index.js'
import type { BinaryNode } from '../types/index.js'

export type PresenceType = 'available' | 'unavailable' | 'composing' | 'recording' | 'paused'

export interface PresenceSimulatorOptions {
  /** Simular automaticamente "digitando..." antes de enviar textos (Padrão: true) */
  autoTyping?: boolean
  /** Simular automaticamente "gravando áudio..." antes de notas de voz (Padrão: true) */
  autoRecording?: boolean
  /** Duração mínima de simulação em ms (Padrão: 800ms) */
  minTypingDurationMs?: number
  /** Duração máxima de simulação em ms (Padrão: 2500ms) */
  maxTypingDurationMs?: number
}

/**
 * Gerenciador de presença e comportamento humano para evitar banimentos por automação óbvia.
 *
 * Cuida da emissão de stanzas de digitação ("composing"), gravação de áudio ("recording"),
 * recibos de leitura e tempos de espera orgânicos.
 */
export class PresenceSimulator {
  private options: Required<PresenceSimulatorOptions>

  /**
   * Cria uma nova instância do simulador de presença humana.
   *
   * @param options - Opções de configuração para digitação e gravação simuladas.
   */
  constructor(options: PresenceSimulatorOptions = {}) {
    this.options = {
      autoTyping: options.autoTyping ?? true,
      autoRecording: options.autoRecording ?? true,
      minTypingDurationMs: options.minTypingDurationMs ?? 800,
      maxTypingDurationMs: options.maxTypingDurationMs ?? 2500,
    }
  }

  /**
   * Constrói o nó WABinary de presença do WhatsApp.
   *
   * @param jid - Destinatário da presença (JID de usuário ou grupo).
   * @param type - Tipo de presença: `'available'`, `'unavailable'`, `'composing'`, `'recording'` ou `'paused'`.
   * @returns Nó binário formatado pronto para envio.
   * @example
   * ```ts
   * const node = presence.createPresenceNode('5511999999999@s.whatsapp.net', 'composing')
   * ```
   */
  createPresenceNode(jid: string, type: PresenceType): BinaryNode {
    return BinaryProtocol.createNode('presence', {
      to: jid,
      type,
    })
  }

  /**
   * Constrói o nó de recibo de leitura (marcar como lido / double blue tick).
   *
   * @param jid - Destinatário ou chat onde a mensagem foi recebida.
   * @param messageId - Identificador único da mensagem a ser marcada como lida.
   * @param participant - JID do remetente específico caso seja um grupo.
   * @returns Nó binário formatado de recibo de leitura.
   * @example
   * ```ts
   * const node = presence.createReadReceiptNode('5511999999999@s.whatsapp.net', '3EB0123')
   * ```
   */
  createReadReceiptNode(jid: string, messageId: string, participant?: string): BinaryNode {
    return BinaryProtocol.createNode('receipt', {
      to: jid,
      id: messageId,
      type: 'read',
      participant,
      t: Math.floor(Date.now() / 1000),
    })
  }

  /**
   * Calcula uma duração orgânica de digitação (em milissegundos) baseada no número de caracteres da mensagem.
   *
   * @param textLength - Quantidade de caracteres do texto a ser digitado.
   * @returns Duração estimada em milissegundos com variação aleatória de jitter humano.
   * @example
   * ```ts
   * const delayMs = presence.calculateTypingDuration(80)
   * ```
   */
  calculateTypingDuration(textLength: number): number {
    // Média de ~40 caracteres por segundo de digitação humana, com limites mínimo e máximo
    const estimatedMs = (textLength / 40) * 1000
    const clamped = Math.min(
      Math.max(estimatedMs, this.options.minTypingDurationMs),
      this.options.maxTypingDurationMs
    )
    // Adiciona uma pequena variação de ±200ms
    const jitter = Math.floor(Math.random() * 400) - 200
    return Math.max(clamped + jitter, 500)
  }

  /**
   * Utilitário assíncrono para pausar a execução por um determinado número de milissegundos.
   *
   * @param ms - Tempo de espera em milissegundos.
   * @returns Promessa resolvida após o tempo estipulado.
   */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
