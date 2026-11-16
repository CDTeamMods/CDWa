import { describe, it, expect, vi } from 'vitest'
import { makeCacheableSignalKeyStore } from '../src/auth/index.js'
import type { SignalKeyStore } from '../src/types/index.js'

describe('makeCacheableSignalKeyStore', () => {
  it('deve buscar do store na primeira leitura e servir do cache nas próximas (Zero I/O)', async () => {
    const rawStorage: Record<string, unknown> = {
      'session-user1': { registrationId: 100 },
      'session-user2': { registrationId: 200 },
    }

    const mockGet = vi.fn(async <T>(type: string, ids: string[]): Promise<Record<string, T>> => {
      const result: Record<string, T> = {}
      for (const id of ids) {
        if (rawStorage[`${type}-${id}`]) {
          result[id] = rawStorage[`${type}-${id}`] as T
        }
      }
      return result
    })

    const mockSet = vi.fn(async () => {})

    const underlyingStore: SignalKeyStore = {
      get: mockGet,
      set: mockSet,
    }

    const cachedStore = makeCacheableSignalKeyStore(underlyingStore)

    // Primeira consulta: Cache miss -> deve chamar underlyingStore.get
    const firstCall = await cachedStore.get('session', ['user1', 'user2'])
    expect(firstCall).toEqual({
      user1: { registrationId: 100 },
      user2: { registrationId: 200 },
    })
    expect(mockGet).toHaveBeenCalledTimes(1)

    // Segunda consulta: Cache hit -> NÃO deve chamar underlyingStore.get
    const secondCall = await cachedStore.get('session', ['user1', 'user2'])
    expect(secondCall).toEqual({
      user1: { registrationId: 100 },
      user2: { registrationId: 200 },
    })
    expect(mockGet).toHaveBeenCalledTimes(1) // Continua 1, zero I/O!
  })

  it('deve consultar apenas chaves ausentes em caso de hit parcial', async () => {
    const rawStorage: Record<string, unknown> = {
      'session-user1': { key: 'a' },
      'session-user2': { key: 'b' },
    }

    const mockGet = vi.fn(async <T>(type: string, ids: string[]): Promise<Record<string, T>> => {
      const result: Record<string, T> = {}
      for (const id of ids) {
        if (rawStorage[`${type}-${id}`]) {
          result[id] = rawStorage[`${type}-${id}`] as T
        }
      }
      return result
    })

    const underlyingStore: SignalKeyStore = {
      get: mockGet,
      set: vi.fn(),
    }

    const cachedStore = makeCacheableSignalKeyStore(underlyingStore)

    // Consulta user1 primeiro
    await cachedStore.get('session', ['user1'])
    expect(mockGet).toHaveBeenCalledWith('session', ['user1'])

    // Consulta user1 e user2 -> deve pedir apenas user2 ao store subjacente!
    const res = await cachedStore.get('session', ['user1', 'user2'])
    expect(res).toEqual({
      user1: { key: 'a' },
      user2: { key: 'b' },
    })
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(mockGet).toHaveBeenLastCalledWith('session', ['user2'])
  })

  it('deve atualizar o cache em chamadas set()', async () => {
    const mockGet = vi.fn(async () => ({}))
    const mockSet = vi.fn(async () => {})

    const underlyingStore: SignalKeyStore = {
      get: mockGet,
      set: mockSet,
    }

    const cachedStore = makeCacheableSignalKeyStore(underlyingStore)

    // Grava no store
    await cachedStore.set({
      session: {
        userX: { data: 'test' },
      },
    })
    expect(mockSet).toHaveBeenCalledTimes(1)

    // Ao consultar userX, deve retornar direto do cache sem chamar underlyingStore.get
    const result = await cachedStore.get('session', ['userX'])
    expect(result).toEqual({
      userX: { data: 'test' },
    })
    expect(mockGet).toHaveBeenCalledTimes(0)
  })

  it('deve suportar cache Map externo', async () => {
    const customMap = new Map<string, unknown>()
    const underlyingStore: SignalKeyStore = {
      get: vi.fn(async () => ({ a: { val: 1 } })),
      set: vi.fn(),
    }

    const cachedStore = makeCacheableSignalKeyStore(underlyingStore, customMap)

    await cachedStore.get('pre-key', ['a'])
    expect(customMap.has('pre-key-a')).toBe(true)
  })

  it('deve respeitar expiração TTL quando configurada', async () => {
    const underlyingStore: SignalKeyStore = {
      get: vi.fn(async <T>(_type: string, ids: string[]) => {
        const res: Record<string, T> = {}
        for (const id of ids) {
          res[id] = { time: Date.now() } as T
        }
        return res
      }),
      set: vi.fn(),
    }

    const cachedStore = makeCacheableSignalKeyStore(underlyingStore, { ttlMs: 10 })

    await cachedStore.get('session', ['u1'])
    expect(underlyingStore.get).toHaveBeenCalledTimes(1)

    // Aguarda expirar
    await new Promise((r) => setTimeout(r, 20))

    await cachedStore.get('session', ['u1'])
    expect(underlyingStore.get).toHaveBeenCalledTimes(2)
  })

  it('deve limpar cache ao chamar clear()', async () => {
    const mockClear = vi.fn(async () => {})
    const underlyingStore: SignalKeyStore = {
      get: vi.fn(async () => ({ u1: 'data' })),
      set: vi.fn(),
      clear: mockClear,
    }

    const cachedStore = makeCacheableSignalKeyStore(underlyingStore)
    await cachedStore.get('session', ['u1'])

    // Limpa
    await cachedStore.clear?.()
    expect(mockClear).toHaveBeenCalledTimes(1)

    // Próxima busca deve ir ao store novamente
    await cachedStore.get('session', ['u1'])
    expect(underlyingStore.get).toHaveBeenCalledTimes(2)
  })
})
