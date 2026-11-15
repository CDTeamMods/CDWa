import type { BinaryNode } from '../types/index.js'
import { BinaryEncoder } from './encoder.js'
import { BinaryDecoder } from './decoder.js'

export * from './constants.js'
export * from './encoder.js'
export * from './decoder.js'

/**
 * Utilitários para manipulação de stanzas e nós binários (WABinary)
 */
export class BinaryProtocol {
  private static encoder = new BinaryEncoder()
  private static decoder = new BinaryDecoder()

  /**
   * Converte um BinaryNode para bytes WABinary
   */
  static encode(node: BinaryNode): Uint8Array {
    return this.encoder.encode(node)
  }

  /**
   * Converte bytes WABinary de volta para um BinaryNode estruturado
   */
  static decode(buffer: Uint8Array): BinaryNode {
    return this.decoder.decode(buffer)
  }

  /**
   * Constrói um nó binário com validação de formato
   */
  static createNode(
    tag: string,
    attrs: Record<string, string | number | undefined> = {},
    content?: BinaryNode[] | string | Uint8Array
  ): BinaryNode {
    return {
      tag,
      attrs,
      content,
    }
  }

  /**
   * Localiza o primeiro filho correspondente à tag fornecida
   */
  static getChildNode(node: BinaryNode, childTag: string): BinaryNode | undefined {
    if (Array.isArray(node.content)) {
      return node.content.find((child) => child.tag === childTag)
    }
    return undefined
  }

  /**
   * Extrai todos os nós filhos que batem com uma determinada tag
   */
  static getChildrenNodes(node: BinaryNode, childTag: string): BinaryNode[] {
    if (Array.isArray(node.content)) {
      return node.content.filter((child) => child.tag === childTag)
    }
    return []
  }

  /**
   * Converte o nó para representação em string legível para debug
   */
  static stringify(node: BinaryNode, indent = 0): string {
    const spaces = '  '.repeat(indent)
    const attrsStr = Object.entries(node.attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')

    const openTag = attrsStr ? `<${node.tag} ${attrsStr}>` : `<${node.tag}>`

    if (!node.content) {
      return `${spaces}<${node.tag} ${attrsStr} />`
    }

    if (Array.isArray(node.content)) {
      const children = node.content.map((c) => this.stringify(c, indent + 1)).join('\n')
      return `${spaces}${openTag}\n${children}\n${spaces}</${node.tag}>`
    }

    const contentStr =
      node.content instanceof Uint8Array
        ? `[Buffer ${node.content.length}b]`
        : String(node.content)

    return `${spaces}${openTag}${contentStr}</${node.tag}>`
  }
}
