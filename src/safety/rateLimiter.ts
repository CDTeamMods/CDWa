/**
 * Fila anti-flood com simulação de intervalos humanos (Jitter) e proteção contra rajadas.
 */

export interface RateLimiterOptions {
  /** Atraso mínimo entre mensagens em milissegundos (Padrão: 1200ms) */
  minDelayMs?: number
  /** Atraso máximo entre mensagens em milissegundos (Padrão: 3500ms) */
  maxDelayMs?: number
  /** Quantidade máxima de mensagens permitidas por minuto (Padrão: 25) */
  maxMessagesPerMinute?: number
}

/**
 * Fila sequencial de envio seguro que previne bloqueios e banimentos por spam no WhatsApp.
 *
 * Controla intervalos dinâmicos (jitter) entre mensagens e limita o fluxo máximo de disparos por minuto.
 */
export class SafeMessageQueue {
  private queue: Array<() => Promise<void>> = []
  private isProcessing = false
  private timestamps: number[] = []
  private options: Required<RateLimiterOptions>

  /**
   * Inicializa a fila de envio seguro.
   *
   * @param options - Configurações de atraso (minDelay, maxDelay) e taxa máxima por minuto.
   */
  constructor(options: RateLimiterOptions = {}) {
    this.options = {
      minDelayMs: options.minDelayMs ?? 1200,
      maxDelayMs: options.maxDelayMs ?? 3500,
      maxMessagesPerMinute: options.maxMessagesPerMinute ?? 25,
    }
  }

  /**
   * Adiciona uma tarefa de envio à fila de proteção e aguarda sua execução segura.
   *
   * @template T - Tipo de retorno esperado da tarefa.
   * @param task - Função assíncrona que efetua a operação de envio.
   * @returns Promessa com o resultado retornado pela tarefa executada.
   * @example
   * ```ts
   * const queue = new SafeMessageQueue()
   * const result = await queue.enqueue(async () => {
   *   return await socket.sendNode(node)
   * })
   * ```
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

  /**
   * Processa itens pendentes na fila aplicando checagem de limites e jitter aleatório.
   *
   * @internal
   */
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

  /**
   * Impede que a taxa de mensagens por minuto exceda o teto seguro configurado, pausando se necessário.
   *
   * @internal
   */
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

  /**
   * Gera um valor aleatório de atraso entre o limite mínimo e máximo.
   *
   * @param min - Limite mínimo em milissegundos.
   * @param max - Limite máximo em milissegundos.
   * @returns Valor de delay em ms.
   * @internal
   */
  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * Utilitário assíncrono para pausar a execução.
   *
   * @param ms - Duração da pausa em milissegundos.
   * @internal
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
