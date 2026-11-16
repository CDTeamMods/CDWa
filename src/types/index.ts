import type { DisconnectError } from '../socket/errors.js'

/**
 * Tipos fundamentais do protocolo CDWA e do cliente WhatsApp Web Multi-Device.
 */

/**
 * Par de chaves assimétricas Curve25519 (X25519).
 */
export interface KeyPair {
  /** Chave pública em formato de bytes (32 bytes) */
  public: Uint8Array
  /** Chave privada em formato de bytes (32 bytes) */
  private: Uint8Array
}

/**
 * Pré-chave assinada com identificador numérico e assinatura digital.
 */
export interface SignedKeyPair extends KeyPair {
  /** Identificador único da pré-chave */
  keyId: number
  /** Assinatura criptográfica calculada com a chave de identidade */
  signature: Uint8Array
}

/**
 * Credenciais completas de autenticação para a sessão Multi-Device.
 */
export interface AuthenticationCreds {
  /** Chave estática do cliente para o handshake Noise */
  noiseKey: KeyPair
  /** Par de chaves efêmeras para o processo de pareamento inicial */
  pairingEphemeralKeyPair: KeyPair
  /** Chave de identidade estática do protocolo Signal */
  signedIdentityKey: KeyPair
  /** Pré-chave assinada do protocolo Signal */
  signedPreKey: SignedKeyPair
  /** Identificador de registro único da instalação */
  registrationId: number
  /** Chave secreta de pareamento advSecretKey em base64 */
  advSecretKey: string
  /** Dados do usuário autenticado após pareamento bem-sucedido */
  me?: {
    id: string
    name?: string
  }
  /** Metadados da conta associada */
  account?: Record<string, unknown>
  /** Identidades de dispositivos vinculados */
  signalIdentities?: Array<unknown>
  /** Identificador de estado do AppState */
  myAppStateKeyId?: string
  /** Próximo ID de pré-chave não enviada */
  firstUnuploadedPreKeyId: number
  /** Próximo ID sequencial de pré-chave */
  nextPreKeyId: number
  /** Timestamp da última sincronização */
  lastAccountSyncTimestamp?: number
  /** Plataforma do cliente WhatsApp */
  platform?: string
}

/**
 * Interface de armazenamento persistente de chaves e sessões do protocolo Signal.
 */
export interface SignalKeyStore {
  /**
   * Recupera chaves ou sessões por tipo e IDs.
   *
   * @template T - Tipo esperado dos dados retornados.
   * @param type - Categoria da chave (ex: `'session'`, `'pre-key'`, `'sender-key'`).
   * @param ids - Lista de identificadores das chaves a serem recuperadas.
   */
  get<T>(type: string, ids: string[]): Promise<Record<string, T>>

  /**
   * Persiste um lote de chaves categorizadas por tipo e ID.
   *
   * @param data - Dicionário estruturado `[tipo][id] -> valor`.
   */
  set(data: Record<string, Record<string, unknown>>): Promise<void>

  /**
   * Limpa todas as chaves armazenadas.
   */
  clear?(): Promise<void>
}

/**
 * Estrutura agregada do estado de autenticação contendo credenciais e key store.
 */
export interface AuthenticationState {
  /** Credenciais de criptografia da conta */
  creds: AuthenticationCreds
  /** Repositório de persistência de chaves criptográficas do Signal */
  keys: SignalKeyStore
}

/**
 * Opções de configuração do cliente `WhatsAppClient` e `WhatsAppSocket`.
 */
export interface SocketConfig {
  /** URL do endpoint WebSocket do WhatsApp (Padrão: `wss://web.whatsapp.com/ws/chat`) */
  waWebSocketUrl?: string
  /** Tempo limite de conexão em milissegundos (Padrão: 20000ms) */
  connectTimeoutMs?: number
  /** Intervalo entre pings de keep-alive em milissegundos (Padrão: 30000ms) */
  keepAliveIntervalMs?: number
  /** Imprimir QR Code no terminal automaticamente quando gerado */
  printQRInTerminal?: boolean
  /** Estado de autenticação obtido via `useSecureAuthState()` */
  auth?: AuthenticationState
  /** Configurações de segurança para armazenamento em disco */
  security?: {
    /** Senha mestra para encriptação at-rest com AES-256-GCM */
    storagePassphrase?: string
    /** Ativa encriptação dos arquivos de sessão no disco */
    enableEncryptedStorage?: boolean
  }
  /** Recursos anti-ban e de segurança operacional */
  safety?: {
    /** Simulação automática de presença humana (digitando... / gravando áudio...) antes do envio */
    simulateHumanBehavior?: boolean
    /** Fila anti-flood com intervalo humano aleatório (jitter) */
    rateLimit?: boolean
    /** Limite máximo de mensagens disparadas por minuto (Padrão: 25) */
    maxMessagesPerMinute?: number
    /** Atraso mínimo entre mensagens em milissegundos (Padrão: 1200ms) */
    minDelayMs?: number
    /** Atraso máximo entre mensagens em milissegundos (Padrão: 3500ms) */
    maxDelayMs?: number
  }
}

/**
 * Dicionário de atributos de um nó WABinary.
 */
export interface BinaryNodeAttributes {
  [key: string]: string | number | undefined
}

/**
 * Representação em árvore de um nó binário do WhatsApp (WABinary stanza).
 */
export interface BinaryNode {
  /** Tag do elemento XML/WABinary (ex: `'message'`, `'iq'`, `'presence'`) */
  tag: string
  /** Atributos associados ao nó */
  attrs: BinaryNodeAttributes
  /** Conteúdo do nó: lista de nós filhos, texto em string ou buffer de bytes */
  content?: BinaryNode[] | string | Uint8Array
}

/**
 * Estados possíveis da conexão WebSocket.
 */
export type ConnectionState = 'close' | 'connecting' | 'open'

/**
 * Notificação de atualização do estado da conexão emitida no evento `'connection.update'`.
 */
export interface ConnectionUpdate {
  /** Novo status da conexão (`'connecting'`, `'open'` ou `'close'`) */
  connection?: ConnectionState
  /** Detalhes do motivo do encerramento caso a conexão tenha caído */
  lastDisconnect?: {
    error?: DisconnectError | Error
    date?: Date
  }
  /** String bruta do QR Code de pareamento gerada pelo servidor */
  qr?: string
  /** Indica se a conexão atual é um novo login recém-pareado */
  isNewLogin?: boolean
}
