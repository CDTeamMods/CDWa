# CDWA 🚀

> A modern, modular, highly secure, and cryptography-focused library for the WhatsApp Web Multi-Device protocol, designed for the Node.js and TypeScript ecosystem.

[English](README.md) | [Português Brazil](README_br.md)

[![NPM Version](https://img.shields.io/npm/v/%40cdteam%2Fcdwa?style=for-the-badge&logo=npm&label=npm)](https://www.npmjs.com/package/@cdteam/cdwa)
[![License: MIT](https://img.shields.io/npm/l/%40cdteam%2Fcdwa?style=for-the-badge)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/CDTeamMods/CDWa/build.yml?branch=main&style=for-the-badge)](#)
[![Stars](https://img.shields.io/github/stars/CDTeamMods/CDWa?style=for-the-badge&logo=github&logoColor=white)](#)

> [!IMPORTANT]
> **Legal Notice / Disclaimer**: **CDWA** is an independent open-source project and is **not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp LLC, Meta Platforms, Inc.**, or any of their subsidiaries or affiliates. The name "WhatsApp" is used strictly for descriptive purposes to indicate protocol compatibility.

---

## 🌐 Official Documentation Website

Access our comprehensive interactive documentation portal with all guides, examples, and API specifications on **GitHub Pages**:

👉 **[https://cdteammods.github.io/CDWa/](https://cdteammods.github.io/CDWa/)**

### 📑 Direct Links to Documentation:
* 🚀 **[Quick Start](https://cdteammods.github.io/CDWa/index.html)**: Installation, setup, and first bot connected via QR Code.
* 🛡️ **[Safety](https://cdteammods.github.io/CDWa/safety.html)**: Anti-flood queue with human-like typing simulation and blue ticks.
* 🔒 **[Architecture & Cryptography](https://cdteammods.github.io/CDWa/architecture.html)**: Noise Protocol Handshake, WABinary, and at-rest encryption.
* 📩 **[Sending Messages](https://cdteammods.github.io/CDWa/sending-messages.html)**: Complete guide for text, photos, videos, voice notes (PTT), location, contacts, and reactions.
* 📡 **[Events & Connection](https://cdteammods.github.io/CDWa/events.html)**: Status monitoring, automatic reconnection, and incoming messages.
* 🔑 **[Authentication & QR Code](https://cdteammods.github.io/CDWa/authentication.html)**: How to connect to WhatsApp, display terminal QR code, and protect tokens with AES-256-GCM.
* ⚡ **[Key Caching (makeCacheableSignalKeyStore)](https://cdteammods.github.io/CDWa/cache-store.html)**: In-memory cache layer for drastic disk I/O reduction and high performance.

---

## ⚡ Why Choose CDWA?

Inspired by and rebuilt from the pioneering concepts of [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys), **CDWA** solves key historical pain points:

| Feature | Classic Baileys | CDWA |
| :--- | :--- | :--- |
| **Safety & Reliability** | Instant cold burst dispatch | **Human-like typing simulation + Anti-Flood queue** |
| **Credential Storage** | Plaintext JSON on disk (vulnerable) | **At-Rest Encryption with AES-256-GCM + KDF** |
| **Cryptographic Primitives** | Legacy & heterogeneous libraries | **Audited, pure `@noble/curves` (X25519)** |
| **TypeScript Typing** | Legacy codebase with many `any` types | **Strict Mode end-to-end** |
| **Memory Leaks** | Listener accumulation during long sessions | **Deterministic lifecycle & clean buffers** |
| **Key I/O Performance** | Requires external plugins | **Native `makeCacheableSignalKeyStore` with in-memory LRU cache** |
| **Packaging** | Predominantly CommonJS | **Modern Dual Export (Native ESM + CJS via tsup)** |

---

## ⚖️ Legal Disclaimer

This project is independently developed as free and open-source software:

* **CDWA** is **not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp LLC, Meta Platforms, Inc.**, or any of their subsidiaries or affiliates.
* The official WhatsApp service and website can be accessed at [https://whatsapp.com](https://whatsapp.com).
* "WhatsApp" and related names, trademarks, logos, and emblems are registered trademarks of Meta Platforms, Inc. and their respective owners.

---

## 📄 License

Distributed under the **MIT** license. See [LICENSE](LICENSE) for more information.
