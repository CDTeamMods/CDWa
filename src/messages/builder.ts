import { BinaryProtocol } from '../binary/index.js'
import { MediaCrypto } from './media.js'
import type { AnyMessageContent, MessageOptions } from './types.js'
import type { BinaryNode } from '../types/index.js'

/**
 * Construtor de nós e stanzas de mensagens do WhatsApp.
 *
 * Responsável por traduzir diferentes tipos de conteúdos (texto, imagem, vídeo, áudio,
 * documentos, localização, contatos, reações) em stanzas `<message>` válidas para o protocolo WABinary.
 */
export class MessageBuilder {
  /**
   * Converte qualquer conteúdo de mensagem suportado em uma stanza `<message>` pronta para transmissão via WebSocket.
   *
   * @param jid - Destinatário da mensagem (JID de usuário ou grupo).
   * @param content - Objeto de conteúdo contendo o tipo da mensagem (texto, imagem, áudio, etc).
   * @param options - Opções complementares de envio, como citação (`quoted`) ou timestamp personalizado.
   * @returns Objeto contendo o nó binário formatado (`node`) e o identificador único gerado para a mensagem (`messageId`).
   * @example
   * ```ts
   * // Mensagem de texto
   * const { node, messageId } = await MessageBuilder.buildMessageNode('5511999999999@s.whatsapp.net', {
   *   text: 'Olá mundo!'
   * })
   *
   * // Mensagem de imagem com legenda
   * const { node, messageId } = await MessageBuilder.buildMessageNode('5511999999999@s.whatsapp.net', {
   *   image: Buffer.from(...),
   *   caption: 'Foto do produto'
   * })
   * ```
   */
  static async buildMessageNode(
    jid: string,
    content: AnyMessageContent,
    options: MessageOptions = {}
  ): Promise<{ node: BinaryNode; messageId: string }> {
    const messageId = `3EB0${Date.now().toString(16).toUpperCase()}${Math.floor(Math.random() * 10000)}`
    const timestamp = options.timestamp || Math.floor(Date.now() / 1000)

    const messageAttrs: Record<string, string | number | undefined> = {
      id: messageId,
      to: jid,
      type: 'text',
      t: timestamp,
    }

    let payloadContent: Uint8Array | BinaryNode[] = new Uint8Array(0)

    // 1. Mensagem de Texto
    if ('text' in content) {
      payloadContent = new TextEncoder().encode(content.text)
    }

    // 2. Mensagem de Imagem
    else if ('image' in content) {
      messageAttrs.type = 'media'
      messageAttrs.mediatype = 'image'
      const buffer = await this.resolveMediaBuffer(content.image)
      const encrypted = MediaCrypto.encryptMedia(buffer, 'image')

      payloadContent = [
        BinaryProtocol.createNode('image', {
          mimetype: content.mimetype || 'image/jpeg',
          caption: content.caption,
          fileLength: buffer.length,
          fileSha256: Buffer.from(encrypted.fileSha256).toString('base64'),
          fileEncSha256: Buffer.from(encrypted.fileEncSha256).toString('base64'),
          mediaKey: Buffer.from(encrypted.mediaKey).toString('base64'),
        }),
      ]
    }

    // 3. Mensagem de Vídeo
    else if ('video' in content) {
      messageAttrs.type = 'media'
      messageAttrs.mediatype = 'video'
      const buffer = await this.resolveMediaBuffer(content.video)
      const encrypted = MediaCrypto.encryptMedia(buffer, 'video')

      payloadContent = [
        BinaryProtocol.createNode('video', {
          mimetype: content.mimetype || 'video/mp4',
          caption: content.caption,
          gifPlayback: content.gifPlayback ? 'true' : undefined,
          ptv: content.ptv ? 'true' : undefined,
          fileLength: buffer.length,
          fileSha256: Buffer.from(encrypted.fileSha256).toString('base64'),
          fileEncSha256: Buffer.from(encrypted.fileEncSha256).toString('base64'),
          mediaKey: Buffer.from(encrypted.mediaKey).toString('base64'),
        }),
      ]
    }

    // 4. Mensagem de Áudio
    else if ('audio' in content) {
      messageAttrs.type = 'media'
      messageAttrs.mediatype = 'audio'
      const buffer = await this.resolveMediaBuffer(content.audio)
      const encrypted = MediaCrypto.encryptMedia(buffer, 'audio')

      payloadContent = [
        BinaryProtocol.createNode('audio', {
          mimetype: content.mimetype || (content.ptt ? 'audio/ogg; codecs=opus' : 'audio/mp4'),
          ptt: content.ptt ? 'true' : 'false',
          fileLength: buffer.length,
          fileSha256: Buffer.from(encrypted.fileSha256).toString('base64'),
          fileEncSha256: Buffer.from(encrypted.fileEncSha256).toString('base64'),
          mediaKey: Buffer.from(encrypted.mediaKey).toString('base64'),
        }),
      ]
    }

    // 5. Mensagem de Documento
    else if ('document' in content) {
      messageAttrs.type = 'media'
      messageAttrs.mediatype = 'document'
      const buffer = await this.resolveMediaBuffer(content.document)
      const encrypted = MediaCrypto.encryptMedia(buffer, 'document')

      payloadContent = [
        BinaryProtocol.createNode('document', {
          mimetype: content.mimetype,
          fileName: content.fileName || 'file',
          caption: content.caption,
          fileLength: buffer.length,
          fileSha256: Buffer.from(encrypted.fileSha256).toString('base64'),
          fileEncSha256: Buffer.from(encrypted.fileEncSha256).toString('base64'),
          mediaKey: Buffer.from(encrypted.mediaKey).toString('base64'),
        }),
      ]
    }

    // 6. Mensagem de Localização
    else if ('location' in content) {
      messageAttrs.type = 'location'
      payloadContent = [
        BinaryProtocol.createNode('location', {
          degreesLatitude: content.location.degreesLatitude,
          degreesLongitude: content.location.degreesLongitude,
          name: content.location.name,
          address: content.location.address,
          url: content.location.url,
        }),
      ]
    }

    // 7. Mensagem de Contato
    else if ('contact' in content) {
      messageAttrs.type = 'contact'
      payloadContent = [
        BinaryProtocol.createNode('contact', {
          displayName: content.contact.displayName,
          vcard: content.contact.vcard,
        }),
      ]
    }

    // 8. Mensagem de Múltiplos Contatos
    else if ('contacts' in content) {
      messageAttrs.type = 'contacts'
      const contactNodes = content.contacts.contacts.map((c) =>
        BinaryProtocol.createNode('contact', {
          displayName: c.displayName,
          vcard: c.vcard,
        })
      )
      payloadContent = [
        BinaryProtocol.createNode(
          'contacts',
          { displayName: content.contacts.displayName },
          contactNodes
        ),
      ]
    }

    // 9. Reação
    else if ('react' in content) {
      messageAttrs.type = 'reaction'
      payloadContent = [
        BinaryProtocol.createNode('reaction', {
          text: content.react.text,
          targetId: content.react.key.id,
          targetJid: content.react.key.remoteJid,
        }),
      ]
    }

    // Monta o nó final da mensagem
    const node = BinaryProtocol.createNode('message', messageAttrs, payloadContent)

    return {
      node,
      messageId,
    }
  }

  /**
   * Resolve diferentes fontes de mídia (Buffer, Uint8Array ou URL) para um Uint8Array em memória.
   *
   * @param source - Buffer de bytes direto, Uint8Array ou objeto `{ url: string }`.
   * @returns Promessa com os bytes da mídia em `Uint8Array`.
   * @throws {Error} Se o formato da fonte fornecida não for suportado.
   * @internal
   */
  private static async resolveMediaBuffer(source: unknown): Promise<Uint8Array> {
    if (source instanceof Uint8Array) {
      return source
    }
    if (Buffer.isBuffer(source)) {
      return new Uint8Array(source)
    }
    if (typeof source === 'object' && source !== null && 'url' in source) {
      const res = await fetch((source as { url: string }).url)
      const arrayBuf = await res.arrayBuffer()
      return new Uint8Array(arrayBuf)
    }
    throw new Error('Unsupported media source format')
  }
}
