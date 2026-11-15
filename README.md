# CDWA 🚀

> Uma biblioteca moderna, modular e com foco em alta segurança e criptografia para o protocolo WhatsApp Web Multi-Device, desenhada para o ecossistema Node.js e TypeScript.

[![NPM Version](https://img.shields.io/npm/v/@cdteam/cdwa?color=2ea043&label=npm)](https://www.npmjs.com/package/@cdteam/cdwa)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://cdteammods.github.io/CDWa/)

---

## 🌐 Site da Documentação Oficial

Acesse nosso portal interativo completo com todos os guias, exemplos e especificações da API no **GitHub Pages**:

👉 **[https://cdteammods.github.io/CDWa/](https://cdteammods.github.io/CDWa/)**

### 📑 Navegação Direta no Site:
* 🚀 **[Início Rápido](./docs/getting-started.html)**: Instalação, setup e primeiro bot conectado via QR Code.
* 🛡️ **[Segurança](./docs/safety.html)**: Fila anti-flood com simulação de digitação humana e blue ticks.
* 🔒 **[Arquitetura & Criptografia](./docs/architecture.html)**: Noise Protocol Handshake, WABinary e criptografia at-rest.
* 📩 **[Envio de Mensagens](./docs/sending-messages.html)**: Guia completo para textos, fotos, vídeos, notas de voz (PTT), GPS, contatos e reações.
* 📡 **[Eventos & Conexão](./docs/events.html)**: Monitoramento de status, reconexão automática e mensagens recebidas.
* 🔑 **[Autenticação & Estado](./docs/authentication.html)**: Como proteger tokens com AES-256-GCM e chave mestra.

---

## ⚡ Por que escolher o CDWA?

Inspirada e reconstruída a partir dos conceitos pioneiros do [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys), o **CDWA** soluciona as principais deficiências históricas:

| Recurso | Baileys Clássico | CDWA |
| :--- | :--- | :--- |
| **Segurança e Confiabilidade** | Disparo a frio instantâneo | **Simulação de digitação humana + Fila Anti-Flood** |
| **Armazenamento de Credenciais** | JSONs em texto plano no disco (vulnerável) | **Criptografia At-Rest com AES-256-GCM + KDF** |
| **Primitivas Criptográficas** | Libs legadas e heterogêneas | **`@noble/curves` (X25519) auditado e puro** |
| **Tipagem TypeScript** | Histórico com muitos tipos `any` | **Modo Estrito (Strict Mode) de ponta a ponta** |
| **Vazamento de Memória** | Acúmulo de listeners em conexões longas | **Ciclo de vida determinístico e buffers limpos** |
| **Empacotamento** | CommonJS predominante | **Dual Export moderno (ESM nativo + CJS via tsup)** |

---

## 📦 Instalação

```bash
npm install @cdteam/cdwa
```

---

## 🚀 Uso Rápido (JavaScript ou TypeScript)

### Em JavaScript com ES Modules (`import` - arquivo `.js`):
```javascript
import makeWASocket, { useSecureAuthState } from '@cdteam/cdwa'

const auth = await useSecureAuthState('./auth_info', 'senha-secreta')
const sock = makeWASocket({ auth, printQRInTerminal: true })

sock.on('connection.update', ({ qr, connection }) => {
  if (qr) console.log('Escaneie o QR Code:', qr)
  if (connection === 'open') console.log('✅ Conectado via JavaScript!')
})

await sock.connect()
```

### Em JavaScript com CommonJS (`require` - arquivo `.cjs`):
```javascript
const { default: makeWASocket, useSecureAuthState } = require('@cdteam/cdwa')

async function run() {
  const auth = await useSecureAuthState('./auth_info', 'senha-secreta')
  const sock = makeWASocket({ auth, printQRInTerminal: true })

  sock.on('connection.update', ({ qr, connection }) => {
    if (qr) console.log('Escaneie o QR Code:', qr)
    if (connection === 'open') console.log('✅ Conectado via CommonJS!')
  })

  await sock.connect()
}

run()
```


---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais informações.
