/**
 * Fila anti-flood com simulação de intervalos humanos (Jitter) e proteção contra rajadas
 */

export interface RateLimiterOptions {
  /** Atraso mínimo entre mensagens em milissegundos (Padrão: 1200ms) */
  minDelayMs?: number
  /** Atraso máximo entre mensagens em milissegundos (Padrão: 3500ms) */
  maxDelayMs?: number
  /** Quantidade máxima de mensagens permitidas por minuto (Padrão: 25) */
  maxMessagesPerMinute?: number
}

export class SafeMessageQueue {
  private queue: Array<() => Promise<void>> = []
  private isProcessing = false
  private timestamps: number[] = []
  private options: Required<RateLimiterOptions>

  constructor(options: RateLimiterOptions = {}) {
    this.options = {
      minDelayMs: options.minDelayMs ?? 1200,
      maxDelayMs: options.maxDelayMs ?? 3500,
      maxMessagesPerMinute: options.maxMessagesPerMinute ?? 25,
    }
  }

  /**
   * Adiciona uma tarefa de envio à fila segura
   */
  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task()
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })

      if (!this.isProcessing) {
        this.processQueue()
      }
    })
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const currentTask = this.queue.shift()

    if (currentTask) {
      // 1. Verifica taxa de mensagens no último minuto
      await this.enforceMinuteLimit()

      // 2. Executa o envio
      await currentTask()
      this.timestamps.push(Date.now())

      // 3. Aplica jitter humano aleatório antes da próxima mensagem
      if (this.queue.length > 0) {
        const randomDelay = this.getRandomDelay(
          this.options.minDelayMs,
          this.options.maxDelayMs
        )
        await this.sleep(randomDelay)
      }
    }

    this.processQueue()
  }

  private async enforceMinuteLimit(): Promise<void> {
    const oneMinuteAgo = Date.now() - 60000
    this.timestamps = this.timestamps.filter((t) => t > oneMinuteAgo)

    if (this.timestamps.length >= this.options.maxMessagesPerMinute) {
      const oldest = this.timestamps[0]!
      const waitTime = 60000 - (Date.now() - oldest) + 500
      if (waitTime > 0) {
        await this.sleep(waitTime)
      }
    }
  }

  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
