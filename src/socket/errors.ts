/**
 * Motivos e códigos de status de desconexão do WhatsApp Web WebSocket.
 */
export const DisconnectReason = {
  /** Sessão desconectada / desvinculada pelo usuário no aparelho celular (401 - Requer novo QR Code) */
  loggedOut: 401,
  /** Acesso proibido pelo WhatsApp / conta temporariamente restrita ou banida (403) */
  forbidden: 403,
  /** Timeout ou perda de conexão com a rede / ping não respondido (408) */
  timedOut: 408,
  /** Sinônimo de timedOut: Conexão perdida com o servidor (408) */
  connectionLost: 408,
  /** Incompatibilidade de versão do protocolo Multi-Device (411) */
  multideviceMismatch: 411,
  /** Conexão encerrada normalmente pelo servidor ou falha de socket (428) */
  connectionClosed: 428,
  /** Conexão substituída por outra sessão aberta em outro navegador ou aba (440) */
  connectionReplaced: 440,
  /** Dados da sessão ou chaves criptográficas corrompidas (500) */
  badSession: 500,
  /** Servidores do WhatsApp temporariamente indisponíveis (503) */
  unavailableService: 503,
  /** Reinicialização de sessão requerida pelo WhatsApp para sincronização de estado (515) */
  restartRequired: 515,
} as const

export type DisconnectReasonType = (typeof DisconnectReason)[keyof typeof DisconnectReason]

/**
 * Mapeamento descritivo legível para códigos de status de desconexão.
 */
const REASON_DESCRIPTIONS: Record<number, string> = {
  401: 'Sessão desvinculada ou encerrada pelo celular (Logged Out). É necessário escanear um novo QR Code.',
  403: 'Acesso proibido (Forbidden). A conta pode estar temporariamente restrita.',
  408: 'Tempo limite de conexão esgotado (Timed Out / Connection Lost).',
  411: 'Incompatibilidade na versão Multi-Device (Multidevice Mismatch).',
  428: 'Conexão encerrada pelo servidor (Connection Closed).',
  440: 'Conexão substituída por outra sessão ativa (Connection Replaced).',
  500: 'Chaves ou dados de sessão corrompidos (Bad Session).',
  503: 'Serviço do WhatsApp temporariamente indisponível (Unavailable Service).',
  515: 'Reinício de conexão solicitado pelo WhatsApp para sincronização (Restart Required).',
}

/**
 * Erro estruturado emitido em `lastDisconnect.error` quando a conexão WebSocket é encerrada.
 *
 * Facilita a inspeção do motivo da desconexão (`statusCode`, `reason`),
 * indicando diretamente se foi logout definitivo (`isLoggedOut`) ou se deve reconectar (`shouldReconnect`).
 *
 * @example
 * ```ts
 * sock.on('connection.update', ({ connection, lastDisconnect }) => {
 *   if (connection === 'close') {
 *     const err = lastDisconnect?.error
 *     if (err instanceof DisconnectError) {
 *       console.log(`Desconectado [${err.statusCode}]: ${err.reason}`)
 *       if (err.shouldReconnect) {
 *         sock.connect()
 *       }
 *     }
 *   }
 * })
 * ```
 */
export class DisconnectError extends Error {
  /** Código numérico de status HTTP/WebSocket do encerramento */
  public readonly statusCode: number
  /** Descrição legível em português do motivo da desconexão */
  public readonly reason: string
  /** Motivo bruto enviado pelo WebSocket se disponível */
  public readonly rawReason?: string
  /** Data e hora em que a desconexão ocorreu */
  public readonly date: Date
  /** Indica se o cliente foi desvinculado (código 401 - requer novo QR code) */
  public readonly isLoggedOut: boolean
  /** Indica se é seguro e recomendado tentar reconectar automaticamente */
  public readonly shouldReconnect: boolean

  constructor(statusCode: number, message?: string, rawReason?: Buffer | string) {
    const rawReasonStr = Buffer.isBuffer(rawReason) ? rawReason.toString('utf-8') : rawReason
    const desc = REASON_DESCRIPTIONS[statusCode] || `WebSocket fechado com código ${statusCode}`
    const finalMessage = message || `${desc}${rawReasonStr ? ` (Motivo: ${rawReasonStr})` : ''}`

    super(finalMessage)
    this.name = 'DisconnectError'
    this.statusCode = statusCode
    this.reason = desc
    this.rawReason = rawReasonStr
    this.date = new Date()

    // 401 (loggedOut) e 403 (forbidden) não devem tentar reconectar automaticamente
    this.isLoggedOut = statusCode === DisconnectReason.loggedOut
    this.shouldReconnect =
      statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.forbidden
  }
}

/**
 * Inspeciona um erro de desconexão e extrai o código numérico de status correspondente.
 *
 * @param error - Erro recebido no evento `connection.update` (`lastDisconnect?.error`).
 * @returns O código numérico de status (ex: 401, 408, 428, 515) ou `undefined` se desconhecido.
 * @example
 * ```ts
 * const statusCode = getDisconnectStatusCode(lastDisconnect?.error)
 * console.log('Status code:', statusCode)
 * ```
 */
export function getDisconnectStatusCode(error: unknown): number | undefined {
  if (!error) return undefined

  if (error instanceof DisconnectError) {
    return error.statusCode
  }

  if (typeof error === 'object' && error !== null) {
    // Suporte a erros estilo Boom / Baileys: (error as Boom)?.output?.statusCode
    if ('output' in error && typeof (error as { output: unknown }).output === 'object') {
      const output = (error as { output: { statusCode?: unknown } }).output
      if (typeof output?.statusCode === 'number') {
        return output.statusCode
      }
    }
    if ('statusCode' in error && typeof (error as { statusCode?: unknown }).statusCode === 'number') {
      return (error as { statusCode: number }).statusCode
    }
  }

  return undefined
}

/**
 * Inspeciona se o erro de desconexão foi motivado por desvinculação da conta (Logout / 401).
 *
 * @param error - Erro de desconexão (`lastDisconnect?.error`).
 * @returns `true` se o usuário tiver desconectado o aparelho pelo celular, exigindo novo escaneamento de QR Code.
 * @example
 * ```ts
 * if (isLoggedOut(lastDisconnect?.error)) {
 *   console.log('Sessão encerrada pelo celular. Escaneie um novo QR Code.')
 * }
 * ```
 */
export function isLoggedOut(error: unknown): boolean {
  if (error instanceof DisconnectError) {
    return error.isLoggedOut
  }
  const statusCode = getDisconnectStatusCode(error)
  return statusCode === DisconnectReason.loggedOut
}

/**
 * Avalia de forma inteligente se o cliente deve tentar se reconectar automaticamente.
 *
 * Retorna `true` em quedas de rede temporárias, reinícios solicitados pelo WhatsApp (515),
 * fechamentos de socket normais (428) e timeouts (408).
 * Retorna `false` em caso de logout deliberado (401) ou proibição (403).
 *
 * @param error - Erro recebido em `lastDisconnect?.error`.
 * @returns `true` se deve tentar reconectar, `false` caso contrário.
 * @example
 * ```ts
 * sock.on('connection.update', ({ connection, lastDisconnect }) => {
 *   if (connection === 'close') {
 *     const canReconnect = shouldReconnect(lastDisconnect?.error)
 *     if (canReconnect) {
 *       sock.connect()
 *     }
 *   }
 * })
 * ```
 */
export function shouldReconnect(error: unknown): boolean {
  if (error instanceof DisconnectError) {
    return error.shouldReconnect
  }
  const statusCode = getDisconnectStatusCode(error)
  if (statusCode !== undefined) {
    return statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.forbidden
  }
  // Se for um erro genérico de rede/timeout, reconecta por padrão
  return true
}
