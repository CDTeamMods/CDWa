# 📩 Guia de Envio de Mensagens

O método `sock.sendMessage(jid, content, options)` é o ponto central para envio de qualquer conteúdo no WhatsApp com o CDWA.

---

## 🎯 Formato do Destinatário (`jid`)

* **Contatos Individuais**: `[DDI][DDD][NUMERO]@s.whatsapp.net` (Exemplo: `5511999999999@s.whatsapp.net`).
* **Grupos**: `[ID_DO_GRUPO]@g.us` (Exemplo: `120363025345678901@g.us`).

---

## 1. Mensagem de Texto

```typescript
// Texto simples
await sock.sendMessage(jid, { text: 'Olá! Mensagem enviada pelo CDWA.' })

// Texto com menção a participantes em um grupo
await sock.sendMessage(jid, {
  text: 'Atenção @5511999999999, por favor leia o aviso.',
  mentions: ['5511999999999@s.whatsapp.net'],
})
```

---

## 2. Mensagem de Imagem

Você pode passar a imagem como um `Buffer`, `Uint8Array` ou simplesmente um objeto `{ url: '...' }`:

```typescript
// Envio por URL
await sock.sendMessage(jid, {
  image: { url: 'https://exemplo.com/foto.jpg' },
  caption: 'Foto demonstrativa!',
})

// Envio por Buffer em memória ou arquivo local
import { promises as fs } from 'fs'

const buffer = await fs.readFile('./foto.png')
await sock.sendMessage(jid, {
  image: buffer,
  caption: 'Imagem do meu disco local',
})
```

---

## 3. Mensagem de Vídeo

```typescript
// Vídeo comum
await sock.sendMessage(jid, {
  video: { url: 'https://exemplo.com/video.mp4' },
  caption: 'Confira este vídeo!',
})

// Vídeo reproduzido como GIF em loop infinito
await sock.sendMessage(jid, {
  video: { url: 'https://exemplo.com/animacao.mp4' },
  gifPlayback: true,
})
```

---

## 4. Mensagem de Áudio / Nota de Voz (PTT)

O WhatsApp diferencia áudios normais de notas de voz gravadas no microfone (*Push to Talk*):

```typescript
// Nota de voz gravada no microfone (balão verde/azul com foto de perfil)
await sock.sendMessage(jid, {
  audio: { url: 'https://exemplo.com/voz.mp3' },
  ptt: true,
})

// Arquivo de áudio como música
await sock.sendMessage(jid, {
  audio: { url: 'https://exemplo.com/musica.mp3' },
  ptt: false,
})
```

---

## 5. Documentos (PDF, ZIP, DOCX, etc.)

```typescript
await sock.sendMessage(jid, {
  document: { url: 'https://exemplo.com/contrato.pdf' },
  mimetype: 'application/pdf',
  fileName: 'Contrato_Assinado.pdf',
  caption: 'Segue o contrato para análise.',
})
```

---

## 6. Localização GPS

```typescript
await sock.sendMessage(jid, {
  location: {
    degreesLatitude: -23.55052,
    degreesLongitude: -46.633308,
    name: 'Praça da Sé',
    address: 'São Paulo - SP, Brasil',
    url: 'https://maps.google.com',
  },
})
```

---

## 7. Contatos (vCard)

```typescript
const vcard =
  'BEGIN:VCARD\n' +
  'VERSION:3.0\n' +
  'FN:Nome do Contato\n' +
  'ORG:Nome da Empresa;\n' +
  'TEL;type=CELL;waid=5511999999999:+55 11 99999-9999\n' +
  'END:VCARD'

await sock.sendMessage(jid, {
  contact: {
    displayName: 'Nome do Contato',
    vcard: vcard,
  },
})
```

---

## 8. Reações com Emojis

Para adicionar uma reação a uma mensagem enviada anteriormente:

```typescript
await sock.sendMessage(jid, {
  react: {
    text: '❤️', // Emoji da reação (ou string vazia '' para remover a reação)
    key: {
      remoteJid: jid,
      id: '3EB0ABC123DEF456', // ID da mensagem alvo
      fromMe: false,
    },
  },
})
```

---

## 9. Respondendo a Mensagens (Quoted / Reply)

Você pode citar qualquer mensagem recebida passando a opção `quoted`:

```typescript
await sock.sendMessage(
  jid,
  { text: 'Concordo com você!' },
  {
    quoted: {
      key: {
        remoteJid: jid,
        id: 'MESSAGE_ID_RECEBIDA',
      },
    },
  }
)
```
