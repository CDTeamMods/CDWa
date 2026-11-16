import { randomBytes } from 'crypto'
import { CryptoEngine } from '../crypto/index.js'
import type { AuthenticationCreds, AuthenticationState, SignalKeyStore } from '../types/index.js'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Cria credenciais limpas para uma nova sessão Multi-Device do WhatsApp.
 *
 * Gera pares de chaves Curve25519 para handshake Noise, chave de identidade do Signal,
 * pré-chave assinada (com assinatura garantindo autenticidade contra MITM) e segredos de pareamento.
 *
 * @returns Um novo objeto `AuthenticationCreds` com todas as chaves e segredos criptográficos necessários.
 * @example
 * ```ts
 * const creds = initAuthCreds()
 * ```
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
 * Gerenciador de estado de autenticação em disco com suporte opcional a encriptação at-rest (AES-256-GCM + HKDF).
 *
 * Armazena credenciais e chaves do Signal em arquivos JSON no diretório informado,
 * opcionalmente criptografados por uma senha mestra para máxima proteção dos dados da sessão.
 */
export class EncryptedFileAuthState {
  private folderPath: string
  private passphrase?: string

  /**
   * Inicializa o gerenciador de estado de autenticação em disco.
   *
   * @param folderPath - Caminho do diretório onde as credenciais e chaves serão gravadas.
   * @param passphrase - Senha mestra opcional para criptografia at-rest de todas as chaves salvas em disco.
   */
  constructor(folderPath: string, passphrase?: string) {
    this.folderPath = folderPath
    this.passphrase = passphrase
  }

  /**
   * Garante que a pasta de destino exista no sistema de arquivos.
   *
   * @internal
   */
  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.folderPath, { recursive: true })
  }

  /**
   * Retorna o caminho absoluto do arquivo correspondente à chave solicitada.
   *
   * @param filename - Nome da chave/arquivo sem extensão.
   * @returns Caminho completo do arquivo JSON no disco.
   * @internal
   */
  private getFilePath(filename: string): string {
    return path.join(this.folderPath, `${filename}.json`)
  }

  /**
   * Salva dados serializados no disco, aplicando criptografia at-rest caso uma senha mestra tenha sido informada.
   *
   * @param key - Identificador único do recurso a ser salvo (ex: `'creds'`, `'pre-key-1'`).
   * @param data - Dados a serem serializados e persistidos.
   */
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

  /**
   * Carrega e desserializa um registro persistido em disco, descriptografando-o caso necessário.
   *
   * @template T - Tipo esperado do objeto recuperado.
   * @param key - Identificador do recurso a ser lido do disco.
   * @returns O objeto decodificado ou `null` caso o arquivo não exista ou ocorra erro de leitura/descriptografia.
   */
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

  /**
   * Cria e retorna o adaptador SignalKeyStore responsável por carregar e persistir chaves do protocolo Signal.
   *
   * @returns Instância compatível com a interface `SignalKeyStore`.
   */
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
 * Cria um estado de autenticação persistente com segurança reforçada e criptografia at-rest opcional.
 *
 * Carrega as credenciais existentes do diretório especificado ou gera novas caso seja o primeiro acesso.
 *
 * @param folderPath - Caminho da pasta onde os arquivos de sessão serão armazenados.
 * @param passphrase - Senha mestra opcional para criptografar os dados em repouso no disco.
 * @returns Promessa com o objeto `AuthenticationState` contendo credenciais (`creds`) e o gerenciador de chaves (`keys`).
 * @example
 * ```ts
 * import { useSecureAuthState } from 'cdwa'
 *
 * // Sessão persistida em disco sem encriptação
 * const auth = await useSecureAuthState('./auth_info')
 *
 * // Sessão persistida com segurança máxima (protegida por senha mestra)
 * const secureAuth = await useSecureAuthState('./auth_info', 'minha-senha-secreta-123')
 * ```
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

/**
 * Interface padronizada de cache em memória para armazenar chaves e sessões do Signal.
 */
export interface CacheStore {
  /** Obtém um item do cache */
  get<T>(key: string): T | undefined
  /** Armazena um item no cache */
  set<T>(key: string, value: T): void
  /** Remove um item do cache */
  del(key: string): void
  /** Limpa todos os itens do cache */
  flushAll?(): void
}

/**
 * Opções de configuração para o cache de SignalKeyStore.
 */
export interface CacheableKeyStoreOptions {
  /** Instância de cache customizada (ex: NodeCache, Map ou classe customizada) */
  cache?: CacheStore | Map<string, unknown>
  /** Tempo de vida (TTL) dos registros em milissegundos (opcional) */
  ttlMs?: number
  /** Capacidade máxima de registros em memória antes de aplicar expiração LRU (Padrão: 10000) */
  maxKeys?: number
}

/**
 * Cria uma camada de cache na memória sobre o SignalKeyStore, reduzindo significativamente as operações de E/S em disco ou banco de dados.
 *
 * Funciona de forma idêntica à função de mesmo nome do Baileys:
 * Intercepta chamadas de leitura (`get`) consultando primeiro a memória RAM; apenas em caso de cache miss
 * os registros são buscados do disco/banco e inseridos no cache. Atualizações (`set`) mantêm a memória e o disco sincronizados.
 *
 * @param store - O SignalKeyStore subjacente (ex: retornado por `auth.keys` do `useSecureAuthState` ou banco customizado).
 * @param optionsOrCache - Opções de configuração (`CacheableKeyStoreOptions`), instância de cache compatível ou Map.
 * @returns Instância de `SignalKeyStore` decorada com cache em memória de alta performance.
 * @example
 * ```ts
 * import makeWASocket, { useSecureAuthState, makeCacheableSignalKeyStore } from '@cdteam/cdwa'
 *
 * const auth = await useSecureAuthState('./auth_info')
 *
 * const sock = makeWASocket({
 *   auth: {
 *     creds: auth.creds,
 *     keys: makeCacheableSignalKeyStore(auth.keys)
 *   }
 * })
 * ```
 */
export function makeCacheableSignalKeyStore(
  store: SignalKeyStore,
  optionsOrCache?: CacheableKeyStoreOptions | CacheStore | Map<string, unknown>
): SignalKeyStore {
  let cacheGet: <T>(key: string) => T | undefined
  let cacheSet: <T>(key: string, value: T) => void
  let cacheDel: (key: string) => void
  let cacheClear: () => void

  const isMap = optionsOrCache instanceof Map
  const isCustomCache =
    typeof optionsOrCache === 'object' &&
    optionsOrCache !== null &&
    'get' in optionsOrCache &&
    'set' in optionsOrCache &&
    !('cache' in optionsOrCache)

  if (isMap) {
    const map = optionsOrCache as Map<string, unknown>
    cacheGet = <T>(key: string) => map.get(key) as T | undefined
    cacheSet = <T>(key: string, value: T) => {
      map.set(key, value)
    }
    cacheDel = (key: string) => {
      map.delete(key)
    }
    cacheClear = () => {
      map.clear()
    }
  } else if (isCustomCache) {
    const custom = optionsOrCache as CacheStore
    cacheGet = <T>(key: string) => custom.get<T>(key)
    cacheSet = <T>(key: string, value: T) => {
      custom.set(key, value)
    }
    cacheDel = (key: string) => {
      custom.del(key)
    }
    cacheClear = () => {
      if (custom.flushAll) {
        custom.flushAll()
      }
    }
  } else {
    const options = (optionsOrCache as CacheableKeyStoreOptions) || {}
    const maxKeys = options.maxKeys ?? 10000
    const ttlMs = options.ttlMs

    // Cache LRU embutido com suporte a TTL baseado em Map
    const inMemoryMap = new Map<string, { value: unknown; expiresAt?: number }>()

    cacheGet = <T>(key: string): T | undefined => {
      const entry = inMemoryMap.get(key)
      if (!entry) return undefined

      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        inMemoryMap.delete(key)
        return undefined
      }

      // Reinsere para manter a ordem de acesso recente (LRU)
      inMemoryMap.delete(key)
      inMemoryMap.set(key, entry)
      return entry.value as T
    }

    cacheSet = <T>(key: string, value: T): void => {
      if (inMemoryMap.size >= maxKeys && !inMemoryMap.has(key)) {
        // Remove a chave menos recentemente usada (primeira chave inserida)
        const oldestKey = inMemoryMap.keys().next().value
        if (oldestKey) inMemoryMap.delete(oldestKey)
      }

      const expiresAt = ttlMs ? Date.now() + ttlMs : undefined
      inMemoryMap.set(key, { value, expiresAt })
    }

    cacheDel = (key: string): void => {
      inMemoryMap.delete(key)
    }

    cacheClear = (): void => {
      inMemoryMap.clear()
    }
  }

  return {
    get: async <T>(type: string, ids: string[]): Promise<Record<string, T>> => {
      const result: Record<string, T> = {}
      const missingIds: string[] = []

      // 1. Consulta em memória primeiro (Zero E/S de disco)
      for (const id of ids) {
        const cacheKey = `${type}-${id}`
        const cached = cacheGet<T>(cacheKey)
        if (cached !== undefined) {
          result[id] = cached
        } else {
          missingIds.push(id)
        }
      }

      // 2. Se houver chaves ausentes, busca no storage subjacente e popula o cache
      if (missingIds.length > 0) {
        const fetched = await store.get<T>(type, missingIds)
        for (const [id, value] of Object.entries(fetched)) {
          if (value !== undefined && value !== null) {
            result[id] = value as T
            cacheSet(`${type}-${id}`, value)
          }
        }
      }

      return result
    },

    set: async (data: Record<string, Record<string, unknown>>): Promise<void> => {
      // 1. Atualiza imediatamente a camada de cache em memória
      for (const [type, entries] of Object.entries(data)) {
        for (const [id, value] of Object.entries(entries)) {
          const cacheKey = `${type}-${id}`
          if (value === null || value === undefined) {
            cacheDel(cacheKey)
          } else {
            cacheSet(cacheKey, value)
          }
        }
      }

      // 2. Persiste assincronamente no storage subjacente
      await store.set(data)
    },

    clear: async (): Promise<void> => {
      cacheClear()
      if (store.clear) {
        await store.clear()
      }
    },
  }
}
