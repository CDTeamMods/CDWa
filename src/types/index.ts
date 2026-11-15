/**
 * Tipos fundamentais do protocolo e do cliente
 */

export interface KeyPair {
  public: Uint8Array
  private: Uint8Array
}

export interface SignedKeyPair extends KeyPair {
  keyId: number
  signature: Uint8Array
}

export interface AuthenticationCreds {
  noiseKey: KeyPair
  pairingEphemeralKeyPair: KeyPair
  signedIdentityKey: KeyPair
  signedPreKey: SignedKeyPair
  registrationId: number
  advSecretKey: string
  me?: {
    id: string
    name?: string
  }
  account?: Record<string, unknown>
  signalIdentities?: Array<unknown>
  myAppStateKeyId?: string
  firstUnuploadedPreKeyId: number
  nextPreKeyId: number
  lastAccountSyncTimestamp?: number
  platform?: string
}

export interface SignalKeyStore {
  get<T>(type: string, ids: string[]): Promise<Record<string, T>>
  set(data: Record<string, Record<string, unknown>>): Promise<void>
  clear?(): Promise<void>
}

export interface AuthenticationState {
  creds: AuthenticationCreds
  keys: SignalKeyStore
}

export interface SocketConfig {
  waWebSocketUrl?: string
  connectTimeoutMs?: number
  keepAliveIntervalMs?: number
  printQRInTerminal?: boolean
  auth?: AuthenticationState
  security?: {
    storagePassphrase?: string
    enableEncryptedStorage?: boolean
  }
}

export interface BinaryNodeAttributes {
  [key: string]: string | number | undefined
}

export interface BinaryNode {
  tag: string
  attrs: BinaryNodeAttributes
  content?: BinaryNode[] | string | Uint8Array
}

export type ConnectionState = 'close' | 'connecting' | 'open'

export interface ConnectionUpdate {
  connection?: ConnectionState
  lastDisconnect?: {
    error?: Error
    date?: Date
  }
  qr?: string
  isNewLogin?: boolean
}
