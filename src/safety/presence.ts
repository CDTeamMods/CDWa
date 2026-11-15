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
 * Gerenciador de presença e comportamento humano para evitar banimentos por automação óbvia
 */
export class PresenceSimulator {
  private options: Required<PresenceSimulatorOptions>

  constructor(options: PresenceSimulatorOptions = {}) {
    this.options = {
      autoTyping: options.autoTyping ?? true,
      autoRecording: options.autoRecording ?? true,
      minTypingDurationMs: options.minTypingDurationMs ?? 800,
      maxTypingDurationMs: options.maxTypingDurationMs ?? 2500,
    }
  }

  /**
   * Constrói o nó de presença do WhatsApp (available, composing, paused, recording)
   */
  createPresenceNode(jid: string, type: PresenceType): BinaryNode {
    return BinaryProtocol.createNode('presence', {
      to: jid,
      type,
    })
  }

  /**
   * Constrói o nó de recibo de leitura (marcar como lido / double blue tick)
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
   * Calcula um tempo de digitação natural baseado no tamanho do texto
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

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
