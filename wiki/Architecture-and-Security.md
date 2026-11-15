# 🔒 Arquitetura & Segurança Criptográfica

O **CDWA** implementa de forma rigorosa as camadas do protocolo proprietário do WhatsApp Web Multi-Device, incorporando práticas modernas de criptografia e proteção de dados em repouso (*data at-rest*).

---

## 🏗️ Camadas do Protocolo

```text
┌────────────────────────────────────────────────────────┐
│           Camada de Aplicação (CDWA Client)            │
│         - sendMessage(), eventos, handlers             │
├────────────────────────────────────────────────────────┤
│           Camada de Criptografia E2EE (Signal)         │
│     - Double Ratchet (1:1), Sender Keys (Grupos)       │
├────────────────────────────────────────────────────────┤
│           Camada Binária (WABinary Stanzas)            │
│   - Serialização de nós e tokens em árvores de bytes   │
├────────────────────────────────────────────────────────┤
│           Camada de Transporte Criptografado           │
│     - Noise_XX_25519_AESGCM_SHA256 Handshake           │
├────────────────────────────────────────────────────────┤
│           Camada de Rede (WebSocket Seguro)            │
│          - wss://web.whatsapp.com/ws/chat              │
└────────────────────────────────────────────────────────┘
```

---

## 1. Túnel de Transporte: Noise Protocol Handshake

Antes de qualquer mensagem trafegar, o cliente negocia uma chave de sessão efêmera com o servidor da Meta usando o **Noise Protocol Framework**:

* **Padrão**: `Noise_XX_25519_AESGCM_SHA256`
* **Prólogo do WhatsApp**: `WA\x06\x02` (4 bytes prefixados no primeiro payload)
* **Fluxo de Handshake (XX)**:
  1. `-> e`: O cliente envia sua chave efêmera de curva elíptica Curve25519.
  2. `<- e, ee, s, es`: O servidor WhatsApp responde com sua chave efêmera, prova Diffie-Hellman e chave de identidade estática criptografada.
  3. `-> s, se`: O cliente envia sua identidade autenticada e payload inicial criptografado.
* **Chaves de Transporte**: O handshake divide a chave em duas cifras simétricas: `writeCipher` (envio) e `readCipher` (recebimento), ambas usando contador de Nonce sequencial de 64 bits para impedir ataques de repetição (*replay attacks*).

---

## 2. Formato Binário: WABinary

O WhatsApp não envia JSON e nem XML puro. Ele compacta stanzas XML em representações binárias compactas com dicionários de tokens:

* Tokens de 1 byte (ex: `iq`, `message`, `presence`, `user`, `from`, `to`).
* Tokens de 2 bytes (dicionários estendidos).
* Dados literais codificados em UTF-8 ou buffers de bytes com delimitadores de comprimento (8 bits ou 32 bits).

O motor `BinaryEncoder` e `BinaryDecoder` do CDWA faz a conversão direta entre objetos TypeScript estruturados (`BinaryNode`) e o fluxo de bytes do WhatsApp.

---

## 3. Criptografia Ponta a Ponta: Protocolo Signal

As conversas reais são protegidas pelo protocolo Signal:
* **Identidade (IK)**: Par de chaves Curve25519 permanente do dispositivo.
* **Pré-chave Assinada (SPK)**: Chave com assinatura criptográfica para garantir autenticidade contra ataques Man-in-the-Middle (MITM).
* **Double Ratchet**: Cada mensagem enviada em conversa 1:1 gira uma chave de derivação KDF, garantindo sigilo progressivo (*Forward Secrecy*).
* **Sender Keys**: Em grupos, uma chave de remetente simétrica é compartilhada de forma eficiente entre os participantes, reduzindo o custo computacional de reencriptar a mensagem para cada membro.

---

## 4. 🛡️ Segurança de Armazenamento: Criptografia At-Rest

### O Problema do Baileys Tradicional
No Baileys comum, a função `useMultiFileAuthState` salva dezenas de arquivos JSON no disco contendo todas as chaves privadas em texto puro:
```json
// creds.json tradicional (Vulnerável!)
{
  "noiseKey": { "private": { "type": "Buffer", "data": "..." } },
  "signedIdentityKey": { "private": { "type": "Buffer", "data": "..." } }
}
```
Se o servidor for comprometido, ou se os arquivos forem baixados de uma imagem Docker ou backup desprotegido, qualquer invasor pode se passar pela sua conta do WhatsApp.

### A Solução do CDWA
Com o `useSecureAuthState(caminho, senhaMestra)`, o CDWA deriva uma chave de alta entropia via **HKDF-SHA256** combinada com **Salt criptográfico aleatório de 16 bytes** e encripta cada arquivo de credencial com **AES-256-GCM (12-byte IV aleatório + 16-byte Auth Tag)**:

```json
// creds.json no CDWA (Protegido!)
{
  "salt": "a4f1082c9e...",
  "iv": "7c8e9b01...",
  "data": "k2mE5rTzVbX...=="
}
```
Mesmo com acesso físico ao disco rígido, é matematicamente inviável ler as chaves sem a senha mestra.
