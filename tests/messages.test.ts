import { describe, it, expect } from 'vitest'
import { MessageBuilder } from '../src/messages/index.js'
import { BinaryProtocol } from '../src/binary/index.js'

describe('MessageBuilder', () => {
  const testJid = '5511999999999@s.whatsapp.net'

  it('deve construir mensagem de texto simples', async () => {
    const { node, messageId } = await MessageBuilder.buildMessageNode(testJid, {
      text: 'Olá mundo!',
    })

    expect(messageId).toBeDefined()
    expect(node.tag).toBe('message')
    expect(node.attrs.to).toBe(testJid)
    expect(node.attrs.type).toBe('text')
    expect(new TextDecoder().decode(node.content as Uint8Array)).toBe('Olá mundo!')
  })

  it('deve construir mensagem de imagem com encriptação de mídia', async () => {
    const mockImageBuffer = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70])
    const { node } = await MessageBuilder.buildMessageNode(testJid, {
      image: mockImageBuffer,
      caption: 'Olhe esta foto!',
      mimetype: 'image/jpeg',
    })

    expect(node.tag).toBe('message')
    expect(node.attrs.type).toBe('media')
    expect(node.attrs.mediatype).toBe('image')

    const imageNode = BinaryProtocol.getChildNode(node, 'image')
    expect(imageNode).toBeDefined()
    expect(imageNode?.attrs.caption).toBe('Olhe esta foto!')
    expect(imageNode?.attrs.mimetype).toBe('image/jpeg')
    expect(imageNode?.attrs.mediaKey).toBeDefined()
    expect(imageNode?.attrs.fileSha256).toBeDefined()
  })

  it('deve construir mensagem de áudio (PTT - nota de voz)', async () => {
    const mockAudioBuffer = new Uint8Array([1, 2, 3, 4, 5])
    const { node } = await MessageBuilder.buildMessageNode(testJid, {
      audio: mockAudioBuffer,
      ptt: true,
    })

    const audioNode = BinaryProtocol.getChildNode(node, 'audio')
    expect(audioNode).toBeDefined()
    expect(audioNode?.attrs.ptt).toBe('true')
  })

  it('deve construir mensagem de localização com coordenadas GPS', async () => {
    const { node } = await MessageBuilder.buildMessageNode(testJid, {
      location: {
        degreesLatitude: -23.55052,
        degreesLongitude: -46.633308,
        name: 'Praça da Sé',
        address: 'São Paulo - SP',
      },
    })

    expect(node.attrs.type).toBe('location')
    const locNode = BinaryProtocol.getChildNode(node, 'location')
    expect(locNode?.attrs.degreesLatitude).toBe(-23.55052)
    expect(locNode?.attrs.degreesLongitude).toBe(-46.633308)
    expect(locNode?.attrs.name).toBe('Praça da Sé')
  })

  it('deve construir mensagem de contato com vCard', async () => {
    const vcard =
      'BEGIN:VCARD\nVERSION:3.0\nFN:João Silva\nORG:Empresa;\nTEL;type=CELL;waid=5511988888888:+55 11 98888-8888\nEND:VCARD'

    const { node } = await MessageBuilder.buildMessageNode(testJid, {
      contact: {
        displayName: 'João Silva',
        vcard,
      },
    })

    expect(node.attrs.type).toBe('contact')
    const contactNode = BinaryProtocol.getChildNode(node, 'contact')
    expect(contactNode?.attrs.displayName).toBe('João Silva')
    expect(contactNode?.attrs.vcard).toBe(vcard)
  })

  it('deve construir mensagem de reação com emoji', async () => {
    const { node } = await MessageBuilder.buildMessageNode(testJid, {
      react: {
        text: '🔥',
        key: {
          remoteJid: testJid,
          id: 'ABC12345',
        },
      },
    })

    expect(node.attrs.type).toBe('reaction')
    const reactNode = BinaryProtocol.getChildNode(node, 'reaction')
    expect(reactNode?.attrs.text).toBe('🔥')
    expect(reactNode?.attrs.targetId).toBe('ABC12345')
  })
})
