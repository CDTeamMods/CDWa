/**
 * Tipos e interfaces de conteúdo de mensagens para o CDWA.
 */

/**
 * Mensagem de texto simples com suporte opcional a menções (@usuário).
 */
export interface TextMessageContent {
  /** Texto da mensagem */
  text: string
  /** Lista de JIDs mencionados no corpo da mensagem */
  mentions?: string[]
}

/**
 * Fonte de mídia via URL remota ou Stream.
 */
export interface MediaUploadSource {
  /** URL pública de onde a mídia será baixada */
  url?: string
  /** Stream legível contendo os dados binários */
  stream?: NodeJS.ReadableStream
}

/**
 * Tipos de entrada aceitos para payloads de mídia.
 */
export type MediaData = Uint8Array | Buffer | MediaUploadSource

/**
 * Mensagem de imagem com legenda opcional.
 */
export interface ImageMessageContent {
  /** Buffer, Uint8Array ou URL da imagem */
  image: MediaData
  /** Legenda da imagem */
  caption?: string
  /** Tipo MIME da imagem (padrão: `image/jpeg`) */
  mimetype?: string
  /** JIDs mencionados na legenda */
  mentions?: string[]
}

/**
 * Mensagem de vídeo com legenda e opções de reprodução como GIF ou nota de vídeo circular (PTV).
 */
export interface VideoMessageContent {
  /** Buffer, Uint8Array ou URL do vídeo */
  video: MediaData
  /** Legenda do vídeo */
  caption?: string
  /** Tipo MIME do vídeo (padrão: `video/mp4`) */
  mimetype?: string
  /** Reproduzir automaticamente em loop como GIF */
  gifPlayback?: boolean
  /** Nota de vídeo circular (Push to Video - PTV) */
  ptv?: boolean
  /** JIDs mencionados na legenda */
  mentions?: string[]
}

/**
 * Mensagem de áudio ou nota de voz (PTT).
 */
export interface AudioMessageContent {
  /** Buffer, Uint8Array ou URL do áudio */
  audio: MediaData
  /** Tipo MIME do áudio (ex: `audio/ogg; codecs=opus` para notas de voz ou `audio/mp4`) */
  mimetype?: string
  /** `true` para exibir como nota de voz gravada pelo usuário (PTT com microfone azul) */
  ptt?: boolean
}

/**
 * Mensagem de documento/arquivo genérico (PDF, ZIP, DOCX, etc).
 */
export interface DocumentMessageContent {
  /** Buffer, Uint8Array ou URL do arquivo */
  document: MediaData
  /** Tipo MIME do documento (obrigatório, ex: `application/pdf`) */
  mimetype: string
  /** Nome do arquivo com extensão (ex: `relatorio.pdf`) */
  fileName?: string
  /** Legenda descritiva do arquivo */
  caption?: string
}

/**
 * Mensagem contendo localização geográfica.
 */
export interface LocationMessageContent {
  location: {
    /** Latitude em graus */
    degreesLatitude: number
    /** Longitude em graus */
    degreesLongitude: number
    /** Nome do local (ex: "Aeroporto Internacional") */
    name?: string
    /** Endereço por extenso */
    address?: string
    /** URL de navegação ou mapa */
    url?: string
  }
}

/**
 * Cartão de contato individual no formato vCard.
 */
export interface ContactItem {
  /** Nome de exibição do contato */
  displayName: string
  /** Conteúdo do vCard versão 3.0 */
  vcard: string
}

/**
 * Mensagem enviando um cartão de contato único.
 */
export interface ContactMessageContent {
  contact: ContactItem
}

/**
 * Mensagem enviando múltiplos cartões de contato agrupados.
 */
export interface ContactsArrayMessageContent {
  contacts: {
    /** Nome descritivo da lista de contatos */
    displayName: string
    /** Lista de contatos */
    contacts: ContactItem[]
  }
}

/**
 * Reação com emoji a uma mensagem pré-existente.
 */
export interface ReactionMessageContent {
  react: {
    /** Emoji da reação (ex: "👍", "❤️") ou string vazia `""` para remover a reação */
    text: string
    /** Identificadores da mensagem alvo da reação */
    key: {
      remoteJid: string
      id: string
      fromMe?: boolean
      participant?: string
    }
  }
}

/**
 * União de todos os tipos válidos de conteúdo aceitos pelo método `sendMessage`.
 */
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

/**
 * Opções complementares de envio de mensagens.
 */
export interface MessageOptions {
  /** Citação de mensagem anterior (mensagem respondida/quoted) */
  quoted?: {
    key: {
      remoteJid: string
      id: string
      fromMe?: boolean
      participant?: string
    }
    message?: Record<string, unknown>
  }
  /** Timestamp Unix personalizado para a mensagem */
  timestamp?: number
}
