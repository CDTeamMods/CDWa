import { WABinaryConstants, TOKEN_MAP } from './constants.js'
import type { BinaryNode } from '../types/index.js'

/**
 * Codificador de stanzas XML em bytes compatíveis com o WhatsApp Web (WABinary)
 */
export class BinaryEncoder {
  private buffer: number[] = []

  encode(node: BinaryNode): Uint8Array {
    this.buffer = []
    this.writeNode(node)
    return new Uint8Array(this.buffer)
  }

  private writeByte(byte: number) {
    this.buffer.push(byte & 0xff)
  }

  private writeBytes(bytes: Uint8Array | number[]) {
    for (let i = 0; i < bytes.length; i++) {
      this.writeByte(bytes[i]!)
    }
  }

  private writeInt16(value: number) {
    this.writeByte((value >> 8) & 0xff)
    this.writeByte(value & 0xff)
  }

  private writeInt32(value: number) {
    this.writeByte((value >> 24) & 0xff)
    this.writeByte((value >> 16) & 0xff)
    this.writeByte((value >> 8) & 0xff)
    this.writeByte(value & 0xff)
  }

  private writeListStart(size: number) {
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

  private writeString(str: string) {
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

  private writeNode(node: BinaryNode) {
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
