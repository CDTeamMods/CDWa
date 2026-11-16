/**
 * Fingerprints modernas e atualizadas do WhatsApp Web para evitar detecção de clientes automatizados.
 */

export interface BrowserConfig {
  name: string
  browser: string
  version: string
  os: string
}

export const MODERN_BROWSERS: BrowserConfig[] = [
  {
    name: 'Chrome Windows',
    browser: 'Chrome',
    version: '131.0.6778.86',
    os: 'Windows 11',
  },
  {
    name: 'Chrome macOS',
    browser: 'Chrome',
    version: '131.0.6778.86',
    os: 'macOS Sonoma',
  },
  {
    name: 'Edge Windows',
    browser: 'Microsoft Edge',
    version: '131.0.2903.70',
    os: 'Windows 11',
  },
]

/**
 * Utilitários de simulação de perfil de navegador para mitigar identificação de bots.
 */
export class BrowserProfile {
  /**
   * Retorna um perfil de navegador moderno aleatório (ex: Chrome Windows, Chrome macOS, Edge Windows)
   * para emular um navegador autêntico perante os servidores do WhatsApp.
   *
   * @returns Configuração de perfil de navegador (`BrowserConfig`).
   * @example
   * ```ts
   * const profile = BrowserProfile.getRandomProfile()
   * console.log(profile.browser, profile.version)
   * ```
   */
  static getRandomProfile(): BrowserConfig {
    const index = Math.floor(Math.random() * MODERN_BROWSERS.length)
    return MODERN_BROWSERS[index]!
  }

  /**
   * Gera o cabeçalho User-Agent formatado correspondente ao perfil especificado ou aleatório.
   *
   * @param profile - Perfil do navegador desejado (se omitido, sorteia um perfil moderno).
   * @returns String contendo o cabeçalho User-Agent completo.
   * @example
   * ```ts
   * const ua = BrowserProfile.getUserAgent()
   * ```
   */
  static getUserAgent(profile: BrowserConfig = this.getRandomProfile()): string {
    if (profile.os.includes('Windows')) {
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${profile.version} Safari/537.36`
    }
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${profile.version} Safari/537.36`
  }
}
