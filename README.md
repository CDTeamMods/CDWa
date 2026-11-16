# CDWA 🚀

> Uma biblioteca moderna, modular e com foco em alta segurança e criptografia para o protocolo WhatsApp Web Multi-Device, desenhada para o ecossistema Node.js e TypeScript.

[![NPM Version](https://img.shields.io/npm/v/%40cdteam%2Fcdwa?style=for-the-badge&logo=npm&label=npm)](https://www.npmjs.com/package/@cdteam/cdwa)
[![License: MIT](https://img.shields.io/npm/l/%40cdteam%2Fcdwa?style=for-the-badge)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/CDTeamMods/CDWa/build.yml?branch=main&style=for-the-badge)](#)
[![Stars](https://img.shields.io/github/stars/CDTeamMods/CDWa?style=for-the-badge&logo=github&logoColor=white)](#)

> [!IMPORTANT]
> **Aviso Legal / Disclaimer**: O **CDWA** é um projeto independente de código aberto e **não possui qualquer vínculo, afiliação, autorização ou endosso oficial do WhatsApp LLC, da Meta Platforms, Inc.** ou de suas afiliadas. O uso do nome "WhatsApp" é feito com propósitos estritamente descritivos para indicar compatibilidade de protocolo.

---

## 🌐 Site da Documentação Oficial

Acesse nosso portal interativo completo com todos os guias, exemplos e especificações da API no **GitHub Pages**:

👉 **[https://cdteammods.github.io/CDWa/](https://cdteammods.github.io/CDWa/)**

### 📑 Navegação Direta no Site:
* 🚀 **[Início Rápido](https://cdteammods.github.io/CDWa/index.html)**: Instalação, setup e primeiro bot conectado via QR Code.
* [Segurança](https://cdteammods.github.io/CDWa/safety.html): Fila anti-flood com simulação de digitação humana e blue ticks.
* 🔒 **[Arquitetura & Criptografia](https://cdteammods.github.io/CDWa/architecture.html)**: Noise Protocol Handshake, WABinary e criptografia at-rest.
* 📩 **[Envio de Mensagens](https://cdteammods.github.io/CDWa/sending-messages.html)**: Guia completo para textos, fotos, vídeos, notas de voz (PTT), GPS, contatos e reações.
* 📡 **[Eventos & Conexão](https://cdteammods.github.io/CDWa/sending-messages.html)**: Monitoramento de status, reconexão automática e mensagens recebidas.
* 🔑 **[Autenticação & QR Code](https://cdteammods.github.io/CDWa/authentication.html)**: Como conectar ao WhatsApp, emitir o QR Code no terminal e proteger tokens com AES-256-GCM.
* ⚡ **[Cache de Chaves (makeCacheableSignalKeyStore)](https://cdteammods.github.io/CDWa/cache-store.html)**: Camada de cache em memória para redução drástica de E/S em disco e alta performance.

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
| **Desempenho de E/S de Chaves** | Requer plugins externos | **`makeCacheableSignalKeyStore` nativo com cache LRU em memória** |
| **Empacotamento** | CommonJS predominante | **Dual Export moderno (ESM nativo + CJS via tsup)** |

---

## ⚖️ Aviso Legal (Disclaimer)

Este projeto é desenvolvido de forma independente como software livre e de código aberto:

* O **CDWA** **não é afiliado, associado, autorizado, homologado, endossado ou de qualquer forma oficialmente conectado ao WhatsApp LLC, à Meta Platforms, Inc.** ou a qualquer uma de suas subsidiárias ou empresas controladoras.
* O serviço e site oficial do WhatsApp podem ser acessados em [https://whatsapp.com](https://whatsapp.com).
* "WhatsApp", bem como nomes, marcas comerciais, logotipos e símbolos correlatos, são marcas registradas de titularidade da Meta Platforms, Inc. e de seus respectivos detentores.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais informações.
