# Política de Segurança (Security Policy) 🛡️

A segurança e a integridade criptográfica são os pilares fundamentais do **CDWA**. Levamos a sério a proteção das chaves de identidade, tokens de sessão e a privacidade das mensagens trafegadas no protocolo.

---

## 📦 Versões Suportadas

Apenas as versões mais recentes recebem ativamente correções de segurança e patches criptográficos:

| Versão | Suporte a Patches de Segurança |
| :--- | :--- |
| `0.1.x` | :white_check_mark: Suportada (Versão Atual) |

---

## 🚨 Relatando uma Vulnerabilidade (Reporting a Vulnerability)

Se você descobriu uma falha de segurança, vazamento de memória criptográfica, vulnerabilidade no handshake do Noise Protocol ou brecha no armazenamento de credenciais, **por favor, não abra uma Issue pública no GitHub**.

### 1. Canal Recomendado: GitHub Private Vulnerability Reporting
A forma mais segura e direta de relatar é utilizando o recurso nativo do GitHub:
1. Acesse a aba **Security** no topo do repositório.
2. Clique em **Advisories** no menu lateral esquerdo.
3. Clique no botão verde **"Report a vulnerability"**.

Esse mecanismo abre uma discussão privada e criptografada entre você e os mantenedores do projeto, permitindo a colaboração direta no patch antes da divulgação pública.

### 2. O que incluir no seu relatório:
Para nos ajudar a reproduzir e corrigir a falha o mais rápido possível, inclua:
* Descrição clara da vulnerabilidade e o impacto potencial.
* Passo a passo ou código de prova de conceito (PoC) para reprodução.
* Versão do Node.js, sistema operacional e versão instalada do CDWA.
* Possíveis soluções ou sugestões de mitigação (se você tiver uma proposta de correção).

### 3. Prazos e Compromisso de Resposta (SLA):
* **Confirmação inicial de recebimento**: em até **48 horas**.
* **Avaliação de impacto e triagem**: em até **5 dias úteis**.
* **Lançamento de patch corretivo**: prioridade máxima com liberação imediata de nova versão no NPM e créditos ao pesquisador no *Advisory* de lançamento (caso deseje ser reconhecido).

---

## 🔒 Boas Práticas de Segurança para Usuários

Ao desenvolver bots ou automações com o CDWA, siga estas recomendações para manter suas credenciais seguras:

1. **Use Criptografia At-Rest**:
   Utilize sempre o `useSecureAuthState(caminho, senhaMestra)` fornecendo uma senha forte ou chave vinda de variáveis de ambiente (`process.env.SESSION_ENCRYPTION_KEY`). Isso garante que os arquivos `.json` gravados no disco fiquem protegidos com **AES-256-GCM**.
2. **Nunca comite pastas de autenticação**:
   Certifique-se de que a pasta onde as credenciais são salvas (ex: `auth_info/`, `creds/`) esteja listada no seu arquivo `.gitignore`.
3. **Mantenha as dependências atualizadas**:
   Execute periodicamente `npm audit` e atualize para as versões mais recentes do pacote.
