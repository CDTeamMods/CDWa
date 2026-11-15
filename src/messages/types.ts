/**
 * Tipos e interfaces de conteúdo de mensagens para o CDWA
 */

export interface TextMessageContent {
  text: string
  mentions?: string[]
}

export interface MediaUploadSource {
  url?: string
  stream?: NodeJS.ReadableStream
}

export type MediaData = Uint8Array | Buffer | MediaUploadSource

export interface ImageMessageContent {
  image: MediaData
  caption?: string
  mimetype?: string
  mentions?: string[]
}

export interface VideoMessageContent {
  video: MediaData
  caption?: string
  mimetype?: string
  gifPlayback?: boolean
  ptv?: boolean // Mensagem de vídeo circular (Push to Video)
  mentions?: string[]
}

export interface AudioMessageContent {
  audio: MediaData
  mimetype?: string
  ptt?: boolean // Nota de voz gravada no microfone
}

export interface DocumentMessageContent {
  document: MediaData
  mimetype: string
  fileName?: string
  caption?: string
}

export interface LocationMessageContent {
  location: {
    degreesLatitude: number
    degreesLongitude: number
    name?: string
    address?: string
    url?: string
  }
}

export interface ContactItem {
  displayName: string
  vcard: string
}

export interface ContactMessageContent {
  contact: ContactItem
}

export interface ContactsArrayMessageContent {
  contacts: {
    displayName: string
    contacts: ContactItem[]
  }
}

export interface ReactionMessageContent {
  react: {
    text: string
    key: {
      remoteJid: string
      id: string
      fromMe?: boolean
      participant?: string
    }
  }
}

export type AnyMessageContent =
  | TextMessageContent
  | ImageMessageContent
  | VideoMessageContent
  | AudioMessageContent
  | DocumentMessageContent
  | LocationMessageContent
  | ContactMessageContent
  | ContactsArrayMessageContent
  | ReactionMessageContent

export interface MessageOptions {
  quoted?: {
    key: {
      remoteJid: string
      id: string
      fromMe?: boolean
      participant?: string
    }
    message?: Record<string, unknown>
  }
  timestamp?: number
}
