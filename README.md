# CDWA 🚀

> Uma biblioteca moderna, modular e com foco em alta segurança e criptografia para o protocolo WhatsApp Web Multi-Device, desenhada para o ecossistema Node.js e TypeScript.

Inspirada no [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys), o **CDWA** foi concebido desde a raiz para solucionar os principais gargalos históricos do Baileys:
- **Segurança At-Rest**: Suporte nativo a criptografia de credenciais e chaves do Signal com senha mestra (AES-256-GCM + PBKDF2/HKDF), impedindo que tokens de sessão fiquem vulneráveis em texto puro no disco.
- **Criptografia Moderna**: Adoção de primitivas criptográficas auditadas (`@noble/curves`, `@noble/ciphers`, `@noble/hashes`) e compatíveis com padrões abertos (RFC 7748, RFC 5869, RFC 8439).
- **TypeScript Strict & Zero Leaks**: Tipagem rígida sem `any`, remoção de dependências legadas e gerenciamento limpo do ciclo de vida dos sockets e listeners.
- **Dual Export Moderno**: Suporte nativo a ESM e CJS com empacotamento ultrarrápido via `tsup`.

---

## 📚 Documentação Completa (Wiki)

A documentação detalhada e guias práticos estão disponíveis na pasta **[`wiki/`](./wiki/Home.md)**:
* 🚀 **[Guia de Início Rápido](./wiki/Getting-Started.md)**
* 🔒 **[Arquitetura & Segurança Criptográfica](./wiki/Architecture-and-Security.md)**
* 📩 **[Guia Completo de Envio de Mensagens](./wiki/Sending-Messages.md)**
* 📡 **[Manipulação de Eventos & Reconexão](./wiki/Handling-Events.md)**
* 🔑 **[Autenticação & Estado Seguro](./wiki/Authentication-and-State.md)**

---