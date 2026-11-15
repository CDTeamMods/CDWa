# 📡 Manipulação de Eventos & Ciclo de Vida

O cliente do CDWA estende o `EventEmitter` padrão do Node.js, emitindo eventos fortemente tipados para acompanhar o status da sessão, novas mensagens e erros de conexão.

---

## 1. `connection.update`

Disparado sempre que o estado da conexão muda ou um novo QR Code é gerado pelo servidor:

```typescript
sock.on('connection.update', (update) => {
  const { connection, lastDisconnect, qr, isNewLogin } = update

  // 1. QR Code recebido
  if (qr) {
    console.log('📌 Novo QR Code disponível para escanear:', qr)
  }

  // 2. Novo login realizado com sucesso
  if (isNewLogin) {
    console.log('🎉 Dispositivo pareado com sucesso pela primeira vez!')
  }

  // 3. Conexão aberta e pronta para envio
  if (connection === 'open') {
    console.log('🟢 Bot conectado com sucesso!')
  }

  // 4. Conexão encerrada
  if (connection === 'close') {
    const error = lastDisconnect?.error
    console.log('🔴 Conexão finalizada:', error?.message)

    // Lógica para reconectar
    const shouldReconnect = true
    if (shouldReconnect) {
      console.log('Tentando reconectar em 5 segundos...')
      setTimeout(() => startBot(), 5000)
    }
  }
})
```

---

## 2. `messages.upsert`

Disparado quando uma ou mais mensagens são recebidas pelo socket:

```typescript
sock.on('messages.upsert', (data) => {
  console.log('📩 Nova mensagem recebida:', data)
  
  // Exemplo de bot de auto-resposta (Eco):
  // if (mensagemDeTexto === '!ping') {
  //   await sock.sendMessage(remetente, { text: 'pong! 🏓' })
  // }
})
```

---

## 3. `creds.update`

Disparado quando novas chaves de sessão ou tokens de autenticação são renovados:

```typescript
sock.on('creds.update', () => {
  console.log('🔑 Credenciais atualizadas e salvas automaticamente!')
})
```

---

## 4. `error`

Disparado em caso de exceções no WebSocket ou falha no handshake criptográfico:

```typescript
sock.on('error', (err) => {
  console.error('⚠️ Erro capturado no cliente CDWA:', err.message)
})
```
