# CDWA (Clean Decentralized WhatsApp Architecture) 🚀

> Uma biblioteca moderna, modular e com foco em alta segurança e criptografia para o protocolo WhatsApp Web Multi-Device, desenhada para o ecossistema Node.js e TypeScript.

[![NPM Version](https://img.shields.io/npm/v/cdwa?color=2ea043&label=npm)](https://www.npmjs.com/package/cdwa)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://cdteammods.github.io/CDWA/)

---

## 🌐 Site da Documentação Oficial

Acesse nosso portal interativo completo com todos os guias, exemplos e especificações da API no **GitHub Pages**:

👉 **[https://cdteammods.github.io/CDWA/](https://cdteammods.github.io/CDWA/)**

### 📑 Navegação Direta no Site:
* 🚀 **[Início Rápido](./docs/getting-started.html)**: Instalação, setup e primeiro bot conectado via QR Code.
* 🔒 **[Arquitetura & Segurança](./docs/architecture.html)**: Noise Protocol Handshake, WABinary e criptografia at-rest.
* 📩 **[Envio de Mensagens](./docs/sending-messages.html)**: Guia completo para textos, fotos, vídeos, notas de voz (PTT), GPS, contatos e reações.
* 📡 **[Eventos & Conexão](./docs/events.html)**: Monitoramento de status, reconexão automática e mensagens recebidas.
* 🔑 **[Autenticação & Estado](./docs/authentication.html)**: Como proteger tokens com AES-256-GCM e chave mestra.

---

## ⚡ Por que escolher o CDWA?

Inspirada e reconstruída a partir dos conceitos pioneiros do [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys), o **CDWA** soluciona as principais deficiências históricas:

| Recurso | Baileys Clássico | CDWA |
| :--- | :--- | :--- |
| **Armazenamento de Credenciais** | JSONs em texto plano no disco (vulnerável) | **Criptografia At-Rest com AES-256-GCM + KDF** |
| **Primitivas Criptográficas** | Libs legadas e heterogêneas | **`@noble/curves` (X25519) auditado e puro** |
| **Tipagem TypeScript** | Histórico com muitos tipos `any` | **Modo Estrito (Strict Mode) de ponta a ponta** |
| **Vazamento de Memória** | Acúmulo de listeners em conexões longas | **Ciclo de vida determinístico e buffers limpos** |
| **Empacotamento** | CommonJS predominante | **Dual Export moderno (ESM nativo + CJS via tsup)** |

---

## 📦 Instalação

```bash
npm install cdwa
```

---

## 🚀 Exemplo Rápido

```typescript
import makeWASocket, { useSecureAuthState } from 'cdwa'

async function main() {
  // 1. Armazenamento seguro de sessão criptografado com senha mestra
  const auth = await useSecureAuthState('./auth_info', 'minha-chave-secreta-ultra-forte')

  // 2. Inicializa o cliente com exibição de QR Code no terminal
  const sock = makeWASocket({
    auth,
    printQRInTerminal: true,
  })

  // 3. Monitora status da conexão
  sock.on('connection.update', (update) => {
    const { connection, qr } = update

    if (qr) {
      console.log('📌 Escaneie o QR Code no seu WhatsApp:', qr)
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado com sucesso ao WhatsApp!')
      enviarMensagens(sock)
    }
  })

  // 4. Conecta ao WebSocket do WhatsApp
  await sock.connect()
}

async function enviarMensagens(sock: ReturnType<typeof makeWASocket>) {
  const jid = '5511999999999@s.whatsapp.net'

  // Texto simples
  await sock.sendMessage(jid, { text: 'Olá do CDWA! 🚀' })

  // Imagem com legenda
  await sock.sendMessage(jid, {
    image: { url: 'https://placehold.co/600x400/png' },
    caption: 'Foto demonstrativa!',
  })

  // Áudio / Nota de voz gravada no microfone (PTT)
  await sock.sendMessage(jid, {
    audio: { url: 'https://exemplo.com/audio.mp3' },
    ptt: true,
  })
}

main().catch(console.error)
```

---

## 📁 Estrutura do Repositório

```text
├── docs/              # Site oficial de documentação (GitHub Pages)
│   ├── index.html     # Portal inicial
│   ├── style.css      # Design responsivo dark mode
│   └── *.html         # Guias temáticos interligados
├── src/
│   ├── auth/          # Gestão de credenciais e criptografia at-rest (AES-256-GCM)
│   ├── binary/        # Protocolo binário WABinary (codificação/decodificação de stanzas)
│   ├── client/        # Fachada pública do cliente (makeWASocket / WhatsAppClient)
│   ├── crypto/        # Primitivas criptográficas (Curve25519, HKDF, AES-GCM, Noise)
│   ├── messages/      # Construtor de mensagens (Texto, Mídia, GPS, Contatos, Reações)
│   ├── signal/        # Implementação do protocolo Signal (Double Ratchet, Pre-keys)
│   ├── socket/        # Camada de transporte WebSocket resiliente com keep-alive
│   └── index.ts       # Entry point principal da biblioteca
├── tests/             # Testes automatizados
├── examples/          # Exemplos de uso prático
├── package.json       # Configuração NPM (dual ESM/CJS)
└── tsup.config.ts     # Bundler otimizado para produção
```

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais informações.
