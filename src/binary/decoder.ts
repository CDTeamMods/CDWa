import { WABinaryConstants, SINGLE_BYTE_TOKENS } from './constants.js'
import type { BinaryNode, BinaryNodeAttributes } from '../types/index.js'

/**
 * Decodificador de stanzas do WhatsApp a partir de fluxos de bytes WABinary.
 *
 * Lê a representação compactada em árvore do WhatsApp, resolvendo os tokens de dicionário
 * e gerando estruturas tipadas `BinaryNode`.
 */
export class BinaryDecoder {
  private buffer: Uint8Array = new Uint8Array(0)
  private offset = 0

  /**
   * Decodifica um array de bytes WABinary em uma árvore de nós `BinaryNode`.
   *
   * @param buffer - Dados binários brutos do frame WABinary recebido.
   * @returns Nó raiz decodificado com suas propriedades e filhos.
   * @throws {Error} Se o buffer contiver tokens inválidos ou chegar a um fim prematuro.
   * @example
   * ```ts
   * const decoder = new BinaryDecoder()
   * const node = decoder.decode(bytes)
   * ```
   */
  decode(buffer: Uint8Array): BinaryNode {
    this.buffer = buffer
    this.offset = 0
    return this.readNode()
  }

  /**
   * Lê o próximo byte único do buffer e avança o cursor.
   *
   * @returns Valor do byte (0-255).
   * @throws {Error} Caso atinja o fim inesperado do buffer (EOF).
   * @internal
   */
  private readByte(): number {
    if (this.offset >= this.buffer.length) {
      throw new Error(`Unexpected EOF in WABinary stream at offset ${this.offset}`)
    }
    const b = this.buffer[this.offset]!
    this.offset += 1
    return b
  }

  /**
   * Lê uma fatia de bytes contíguos do buffer.
   *
   * @param length - Quantidade de bytes a serem lidos.
   * @returns Fatiamento `Uint8Array` dos bytes lidos.
   * @throws {Error} Caso a quantidade solicitada exceda o restante do buffer.
   * @internal
   */
  private readBytes(length: number): Uint8Array {
    if (this.offset + length > this.buffer.length) {
      throw new Error(`Buffer underrun: requested ${length} bytes, have ${this.buffer.length - this.offset}`)
    }
    const slice = this.buffer.slice(this.offset, this.offset + length)
    this.offset += length
    return slice
  }

  /**
   * Lê um inteiro de 16 bits (Big Endian) a partir dos próximos 2 bytes.
   *
   * @returns Inteiro de 16 bits.
   * @internal
   */
  private readInt16(): number {
    const b0 = this.readByte()
    const b1 = this.readByte()
    return (b0 << 8) | b1
  }

  /**
   * Lê um inteiro de 32 bits (Big Endian) a partir dos próximos 4 bytes.
   *
   * @returns Inteiro de 32 bits.
   * @internal
   */
  private readInt32(): number {
    const b0 = this.readByte()
    const b1 = this.readByte()
    const b2 = this.readByte()
    const b3 = this.readByte()
    return (b0 << 24) | (b1 << 16) | (b2 << 8) | b3
  }

  /**
   * Lê o marcador de lista e retorna a quantidade de itens que ela contém.
   *
   * @returns Quantidade de elementos na lista.
   * @throws {Error} Se o byte de marcação não corresponder a uma lista válida.
   * @internal
   */
  private readListSize(): number {
    const tag = this.readByte()
    if (tag === WABinaryConstants.LIST_EMPTY) {
      return 0
    }
    if (tag === WABinaryConstants.LIST_8) {
      return this.readByte()
    }
    if (tag === WABinaryConstants.LIST_16) {
      return this.readInt16()
    }
    throw new Error(`Invalid list tag byte: ${tag}`)
  }

  /**
   * Lê e decodifica uma string a partir do buffer (seja via token indexado ou payload UTF-8 em BINARY_8/32).
   *
   * @returns String decodificada.
   * @throws {Error} Se a tag de string for desconhecida.
   * @internal
   */
  private readString(): string {
    const tag = this.readByte()

    if (tag < SINGLE_BYTE_TOKENS.length && SINGLE_BYTE_TOKENS[tag]) {
      return SINGLE_BYTE_TOKENS[tag]!
    }

    if (tag === WABinaryConstants.BINARY_8) {
      const length = this.readByte()
      const bytes = this.readBytes(length)
      return new TextDecoder().decode(bytes)
    }

    if (tag === WABinaryConstants.BINARY_32) {
      const length = this.readInt32()
      const bytes = this.readBytes(length)
      return new TextDecoder().decode(bytes)
    }

    throw new Error(`Unsupported string tag: ${tag} at offset ${this.offset - 1}`)
  }

  /**
   * Reconstrói um `BinaryNode` a partir da lista codificada em WABinary.
   *
   * @returns O nó reconstruído com tag, atributos e conteúdo filho.
   * @throws {Error} Se o nó estiver vazio ou for inválido.
   * @internal
   */
  private readNode(): BinaryNode {
    const listSize = this.readListSize()
    if (listSize === 0) {
      throw new Error('Invalid empty node')
    }

    const tag = this.readString()
    const attrs: BinaryNodeAttributes = {}
    let remaining = listSize - 1

    // Lê pares de chave e valor de atributos
    while (remaining > 1) {
      const key = this.readString()
      const val = this.readString()
      attrs[key] = val
      remaining -= 2
    }

    let content: BinaryNode[] | string | Uint8Array | undefined

    if (remaining === 1) {
      const peekByte = this.buffer[this.offset]
      if (
        peekByte === WABinaryConstants.LIST_EMPTY ||
        peekByte === WABinaryConstants.LIST_8 ||
        peekByte === WABinaryConstants.LIST_16
      ) {
        const childCount = this.readListSize()
        const children: BinaryNode[] = []
        for (let i = 0; i < childCount; i++) {
          children.push(this.readNode())
        }
        content = children
      } else if (peekByte === WABinaryConstants.BINARY_8 || peekByte === WABinaryConstants.BINARY_32) {
        const nextTag = this.readByte()
        const length = nextTag === WABinaryConstants.BINARY_8 ? this.readByte() : this.readInt32()
        content = this.readBytes(length)
      } else {
        content = this.readString()
      }
    }

    return { tag, attrs, content }
  }
}
