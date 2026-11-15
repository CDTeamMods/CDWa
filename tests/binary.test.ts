import { describe, it, expect } from 'vitest'
import { BinaryProtocol } from '../src/binary/index.js'
import type { BinaryNode } from '../src/types/index.js'

describe('WABinary Protocol', () => {
  it('deve codificar e decodificar um nó simples com atributos', () => {
    const node: BinaryNode = {
      tag: 'iq',
      attrs: {
        to: 's.whatsapp.net',
        type: 'set',
        id: '12345',
      },
      content: undefined,
    }

    const encoded = BinaryProtocol.encode(node)
    expect(encoded.length).toBeGreaterThan(0)

    const decoded = BinaryProtocol.decode(encoded)
    expect(decoded.tag).toBe('iq')
    expect(decoded.attrs.to).toBe('s.whatsapp.net')
    expect(decoded.attrs.type).toBe('set')
    expect(decoded.attrs.id).toBe('12345')
  })

  it('deve serializar e deserializar nós aninhados (árvores de stanzas)', () => {
    const childNode: BinaryNode = {
      tag: 'ping',
      attrs: {},
      content: undefined,
    }

    const parentNode: BinaryNode = {
      tag: 'iq',
      attrs: { id: 'ping-1' },
      content: [childNode],
    }

    const encoded = BinaryProtocol.encode(parentNode)
    const decoded = BinaryProtocol.decode(encoded)

    expect(decoded.tag).toBe('iq')
    expect(Array.isArray(decoded.content)).toBe(true)
    const children = decoded.content as BinaryNode[]
    expect(children).toHaveLength(1)
    expect(children[0]?.tag).toBe('ping')
  })

  it('deve preservar payload em bytes (Buffer)', () => {
    const rawPayload = new Uint8Array([1, 2, 3, 4, 5, 255])
    const node: BinaryNode = {
      tag: 'message',
      attrs: { type: 'text' },
      content: rawPayload,
    }

    const encoded = BinaryProtocol.encode(node)
    const decoded = BinaryProtocol.decode(encoded)

    expect(decoded.tag).toBe('message')
    expect(decoded.content instanceof Uint8Array).toBe(true)
    expect(decoded.content).toEqual(rawPayload)
  })
})
