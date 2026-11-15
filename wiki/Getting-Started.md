# 🚀 Começando com o CDWA (Getting Started)

Este guia ensina como instalar o CDWA e criar seu primeiro cliente conectado ao WhatsApp Web em minutos.

---

## 📋 Pré-requisitos

* **Node.js**: Versão 18.0.0 ou superior (Recomendado: 20 LTS ou 22 LTS).
* **Gerenciador de Pacotes**: npm, pnpm ou yarn.

---

## 📦 Instalação

Instale a biblioteca no seu projeto:

```bash
npm install cdwa
```

*(Se estiver utilizando TypeScript, instale também `@types/node` como dependência de desenvolvimento)*:
```bash
npm install -D @types/node typescript
```

---

## 🤖 Criando seu primeiro Bot

Crie um arquivo chamado `index.ts` (ou `index.js`):

```typescript
import makeWASocket, { useSecureAuthState } from 'cdwa'

async function connectToWhatsApp() {
  // 1. Cria ou carrega a sessão com armazenamento protegido por senha mestra
  const auth = await useSecureAuthState('./auth_info', 'minha-chave-secreta-forte')

  // 2. Inicializa o cliente WhatsApp
  const sock = makeWASocket({
    auth,
    printQRInTerminal: true,
  })

  // 3. Monitora o status da conexão e QR Code
  sock.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('📌 Escaneie o QR Code no seu WhatsApp:', qr)
    }

    if (connection === 'close') {
      const shouldReconnect = true
      console.log('❌ Conexão encerrada. Erro:', lastDisconnect?.error?.message)
      if (shouldReconnect) {
        connectToWhatsApp()
      }
    } else if (connection === 'open') {
      console.log('🎉 Conexão estabelecida com sucesso com o WhatsApp!')
    }
  })

  // 4. Escuta mensagens recebidas
  sock.on('messages.upsert', async ({ node }) => {
    console.log('📩 Nova mensagem recebida:', node)
  })

  // 5. Conecta ao WebSocket do WhatsApp
  await sock.connect()
}

connectToWhatsApp().catch(console.error)
```

---

## 🏃 Executando o Projeto

Se você usa TypeScript com `tsx` ou `ts-node`:

```bash
npx tsx index.ts
```

Ou se compilou para JavaScript:

```bash
node dist/index.js
```

Abra o WhatsApp no seu smartphone, acesse **Aparelhos conectados** > **Conectar um aparelho** e escaneie o QR Code gerado!
