import type { BinaryNode } from '../types/index.js'
import { BinaryEncoder } from './encoder.js'
import { BinaryDecoder } from './decoder.js'

export * from './constants.js'
export * from './encoder.js'
export * from './decoder.js'

/**
 * Utilitários para serialização, desserialização e manipulação de stanzas e nós binários (WABinary) do WhatsApp Web.
 */
export class BinaryProtocol {
  private static encoder = new BinaryEncoder()
  private static decoder = new BinaryDecoder()

  /**
   * Codifica uma árvore de `BinaryNode` para o formato binário proprietário do WhatsApp (WABinary).
   *
   * @param node - O nó raiz a ser serializado.
   * @returns Array de bytes `Uint8Array` contendo o payload codificado.
   * @example
   * ```ts
   * const bytes = BinaryProtocol.encode({
   *   tag: 'presence',
   *   attrs: { type: 'available' }
   * })
   * ```
   */
  static encode(node: BinaryNode): Uint8Array {
    return this.encoder.encode(node)
  }

  /**
   * Converte bytes WABinary de volta para uma árvore estruturada de nós (`BinaryNode`).
   *
   * @param buffer - Dados binários brutos recebidos dos servidores do WhatsApp.
   * @returns Nó binário raiz decodificado.
   * @throws {Error} Se o buffer contiver tokens desconhecidos ou for corrompido.
   * @example
   * ```ts
   * const node = BinaryProtocol.decode(decryptedFrame)
   * console.log(node.tag, node.attrs)
   * ```
   */
  static decode(buffer: Uint8Array): BinaryNode {
    return this.decoder.decode(buffer)
  }

  /**
   * Cria uma estrutura `BinaryNode` validada com tag, atributos e conteúdo filhos opcionais.
   *
   * @param tag - Nome da tag XML/WABinary (ex: `'iq'`, `'message'`, `'presence'`, `'receipt'`).
   * @param attrs - Dicionário de atributos chave-valor associados à tag.
   * @param content - Filhos do nó: lista de nós filhos (`BinaryNode[]`), string de texto ou bytes (`Uint8Array`).
   * @returns Instância estruturada de `BinaryNode`.
   * @example
   * ```ts
   * const node = BinaryProtocol.createNode('iq', { to: 's.whatsapp.net', type: 'get' })
   * ```
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
   * Localiza o primeiro nó filho que corresponda à tag informada.
   *
   * @param node - Nó pai onde a busca será realizada.
   * @param childTag - Tag do elemento filho procurado.
   * @returns O primeiro `BinaryNode` correspondente ou `undefined` se não encontrado.
   * @example
   * ```ts
   * const pairNode = BinaryProtocol.getChildNode(iqNode, 'pair-device')
   * ```
   */
  static getChildNode(node: BinaryNode, childTag: string): BinaryNode | undefined {
    if (Array.isArray(node.content)) {
      return node.content.find((child) => child.tag === childTag)
    }
    return undefined
  }

  /**
   * Extrai todos os nós filhos que correspondam a uma determinada tag.
   *
   * @param node - Nó pai contendo a lista de filhos.
   * @param childTag - Tag dos elementos a serem filtrados.
   * @returns Lista de nós filhos correspondentes.
   * @example
   * ```ts
   * const participants = BinaryProtocol.getChildrenNodes(groupNode, 'participant')
   * ```
   */
  static getChildrenNodes(node: BinaryNode, childTag: string): BinaryNode[] {
    if (Array.isArray(node.content)) {
      return node.content.filter((child) => child.tag === childTag)
    }
    return []
  }

  /**
   * Converte a árvore de nós binários para uma representação em XML/string legível para logs e depuração.
   *
   * @param node - Nó a ser formatado como string.
   * @param indent - Nível de indentação de espaços (padrão: 0).
   * @returns String formatada em XML com tags e atributos.
   * @example
   * ```ts
   * console.log(BinaryProtocol.stringify(receivedNode))
   * ```
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
