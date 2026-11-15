# Bem-vindo à Wiki do CDWA 🚀

O **CDWA (Clean Decentralized WhatsApp Architecture)** é uma biblioteca moderna, modular e de alta segurança escrita em TypeScript para conexão e automação com o protocolo WhatsApp Web Multi-Device.

Inspirada e reconstruída a partir dos conceitos pioneiros do [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys), o CDWA foi projetado do zero para ser mais seguro, auditável, livre de vazamentos de memória e preparado para os padrões atuais do ecossistema Node.js (v18+).

---

## 🧭 Navegação Rápida

| Seção | Descrição |
| :--- | :--- |
| **[Início Rápido (Getting Started)](./Getting-Started.md)** | Instalação, configuração do ambiente e seu primeiro bot conectado em 2 minutos. |
| **[Arquitetura & Segurança](./Architecture-and-Security.md)** | Detalhes sobre o Noise Protocol, Signal Protocol e criptografia em repouso (*at-rest*). |
| **[Envio de Mensagens](./Sending-Messages.md)** | Guia completo: texto, imagem, vídeo, áudio (PTT), documentos, GPS, contatos e reações. |
| **[Manipulação de Eventos](./Handling-Events.md)** | Como escutar atualizações de conexão, reconexões automáticas e novas mensagens. |
| **[Autenticação & Estado](./Authentication-and-State.md)** | Gerenciamento de credenciais criptografadas e persistência de chaves de sessão. |

---

## ⚡ Por que escolher o CDWA?

### 1. 🛡️ Segurança de Credenciais At-Rest
O Baileys tradicional grava as chaves privadas e tokens de sessão em dezenas de arquivos JSON em texto plano. No CDWA, você pode fornecer uma **senha mestra** ou chave de ambiente e todas as credenciais no disco serão blindadas com **AES-256-GCM + HKDF**.

### 2. 🔑 Primitivas Criptográficas Auditadas
Substituição de bibliotecas de curvas elípticas legadas por implementações puras e auditadas (`@noble/curves` X25519, `@noble/ciphers` e `@noble/hashes`), alinhadas às RFCs abertas (RFC 7748, RFC 5869 e RFC 8439).

### 3. 🎯 TypeScript Estrito & Tipagem Completa
Sem tipos `any` ocultos ou tipagens fracas em stanzas. O CDWA opera em modo estrito (`strict: true`), garantindo autocompletar preciso em qualquer IDE.

### 4. 📦 Dual-Build Nativo (ESM + CJS)
Empacotado com `tsup`, oferecendo suporte transparente tanto para projetos modernos com `import` (ESM) quanto legados com `require` (CommonJS).
