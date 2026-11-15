# 🔑 Autenticação & Gerenciamento de Estado

O estado de autenticação (`AuthenticationState`) armazena todas as chaves criptográficas necessárias para restaurar uma sessão do WhatsApp sem a necessidade de escanear o QR Code novamente.

---

## 🔒 Usando o Armazenamento Encriptado (Recomendado)

O CDWA fornece o `useSecureAuthState`, que cifra todo o conteúdo gravado em disco com **AES-256-GCM**:

```typescript
import { useSecureAuthState } from 'cdwa'

// Obtém a senha mestra a partir de variáveis de ambiente
const masterPassphrase = process.env.WHATSAPP_SESSION_KEY || 'minha-chave-secreta-longa'

const auth = await useSecureAuthState('./auth_info', masterPassphrase)

const sock = makeWASocket({ auth })
```

> **Dica de Segurança**: Nunca faça commit da pasta `./auth_info` ou de senhas em texto puro no seu repositório Git! Adicione a pasta ao seu `.gitignore`.

---

## 💾 O que é salvo no Auth State?

O estado é composto por duas partes:

1. **`creds` (Credenciais Principais)**:
   * `noiseKey`: Par de chaves Curve25519 para o transporte seguro.
   * `signedIdentityKey`: Identidade permanente da conta.
   * `signedPreKey`: Pré-chave assinada com validade de sessão.
   * `registrationId`: Identificador numérico da instalação.
   * `me`: Informações da conta conectada (JID e nome).

2. **`keys` (Signal KeyStore)**:
   * `session-*`: Sessões do Double Ratchet para cada contato.
   * `sender-key-*`: Chaves criptográficas de grupos.
   * `app-state-sync-key`: Chaves de sincronização de histórico e contatos.

---

## 🗄️ Criando um Armazenamento Personalizado (Redis / PostgreSQL / MongoDB)

Se você roda sua aplicação em clusters ou ambientes serverless (onde o disco local é efêmero), você pode implementar sua própria interface `SignalKeyStore`:

```typescript
import type { SignalKeyStore, AuthenticationCreds, AuthenticationState } from 'cdwa'

class RedisSignalStore implements SignalKeyStore {
  async get<T>(type: string, ids: string[]): Promise<Record<string, T>> {
    // Busca do Redis
    return {}
  }

  async set(data: Record<string, Record<string, unknown>>): Promise<void> {
    // Salva no Redis
  }
}

// Cria o estado integrado com o banco de dados
const customAuth: AuthenticationState = {
  creds: loadedCreds,
  keys: new RedisSignalStore(),
}
```
