import { WABinaryConstants, TOKEN_MAP } from './constants.js'
import type { BinaryNode } from '../types/index.js'

/**
 * Codificador de stanzas XML em bytes compatíveis com o WhatsApp Web (WABinary).
 *
 * Transforma estruturas `BinaryNode` em sequência de bytes compactada utilizando
 * o dicionário de tokens do WhatsApp e marcadores binários (LIST_8, LIST_16, BINARY_8, BINARY_32).
 */
export class BinaryEncoder {
  private buffer: number[] = []

  /**
   * Codifica um nó binário (`BinaryNode`) em uma sequência de bytes `Uint8Array`.
   *
   * @param node - Estrutura de nó contendo tag, atributos e conteúdo a ser codificado.
   * @returns Array de bytes formatado de acordo com o protocolo WABinary.
   * @example
   * ```ts
   * const encoder = new BinaryEncoder()
   * const bytes = encoder.encode(node)
   * ```
   */
  encode(node: BinaryNode): Uint8Array {
    this.buffer = []
    this.writeNode(node)
    return new Uint8Array(this.buffer)
  }

  /**
   * Grava um único byte no buffer.
   *
   * @param byte - Valor inteiro do byte (0-255).
   * @internal
   */
  private writeByte(byte: number): void {
    this.buffer.push(byte & 0xff)
  }

  /**
   * Grava múltiplos bytes sequencialmente no buffer.
   *
   * @param bytes - Coleção ou array de bytes a gravar.
   * @internal
   */
  private writeBytes(bytes: Uint8Array | number[]): void {
    for (let i = 0; i < bytes.length; i++) {
      this.writeByte(bytes[i]!)
    }
  }

  /**
   * Grava um inteiro de 16 bits em formato Big Endian (2 bytes).
   *
   * @param value - Valor numérico a ser gravado.
   * @internal
   */
  private writeInt16(value: number): void {
    this.writeByte((value >> 8) & 0xff)
    this.writeByte(value & 0xff)
  }

  /**
   * Grava um inteiro de 32 bits em formato Big Endian (4 bytes).
   *
   * @param value - Valor numérico a ser gravado.
   * @internal
   */
  private writeInt32(value: number): void {
    this.writeByte((value >> 24) & 0xff)
    this.writeByte((value >> 16) & 0xff)
    this.writeByte((value >> 8) & 0xff)
    this.writeByte(value & 0xff)
  }

  /**
   * Grava o marcador de início de lista (LIST_EMPTY, LIST_8 ou LIST_16) com o tamanho especificado.
   *
   * @param size - Quantidade de elementos da lista.
   * @internal
   */
  private writeListStart(size: number): void {
    if (size === 0) {
      this.writeByte(WABinaryConstants.LIST_EMPTY)
    } else if (size < 256) {
      this.writeByte(WABinaryConstants.LIST_8)
      this.writeByte(size)
    } else {
      this.writeByte(WABinaryConstants.LIST_16)
      this.writeInt16(size)
    }
  }

  /**
   * Escreve uma string procurando primeiro no dicionário de tokens conhecidos do WhatsApp,
   * ou gravando-a como BINARY_8 / BINARY_32 caso não esteja no dicionário.
   *
   * @param str - String a ser codificada.
   * @internal
   */
  private writeString(str: string): void {
    const tokenIndex = TOKEN_MAP.get(str)
    if (tokenIndex !== undefined) {
      this.writeByte(tokenIndex)
      return
    }

    const encoded = new TextEncoder().encode(str)
    if (encoded.length < 256) {
      this.writeByte(WABinaryConstants.BINARY_8)
      this.writeByte(encoded.length)
    } else {
      this.writeByte(WABinaryConstants.BINARY_32)
      this.writeInt32(encoded.length)
    }
    this.writeBytes(encoded)
  }

  /**
   * Serializa recursivamente um nó e seus filhos.
   *
   * @param node - Nó a ser gravado.
   * @internal
   */
  private writeNode(node: BinaryNode): void {
    const numAttrs = Object.keys(node.attrs).length
    const hasContent = node.content !== undefined

    // Um nó é serializado como uma lista de:
    // [tag, attrs, content (se houver)] -> tamanho total = 1 + (numAttrs * 2) + (hasContent ? 1 : 0)
    const listSize = 1 + numAttrs * 2 + (hasContent ? 1 : 0)
    this.writeListStart(listSize)

    // Escreve a Tag
    this.writeString(node.tag)

    // Escreve os Atributos (Pares chave=valor)
    for (const [key, value] of Object.entries(node.attrs)) {
      if (value !== undefined) {
        this.writeString(key)
        this.writeString(String(value))
      }
    }

    // Escreve o Conteúdo (Nós filhos, string ou buffer)
    if (hasContent) {
      if (Array.isArray(node.content)) {
        this.writeListStart(node.content.length)
        for (const child of node.content) {
          this.writeNode(child)
        }
      } else if (typeof node.content === 'string') {
        this.writeString(node.content)
      } else if (node.content instanceof Uint8Array) {
        if (node.content.length < 256) {
          this.writeByte(WABinaryConstants.BINARY_8)
          this.writeByte(node.content.length)
        } else {
          this.writeByte(WABinaryConstants.BINARY_32)
          this.writeInt32(node.content.length)
        }
        this.writeBytes(node.content)
      }
    }
  }
}
