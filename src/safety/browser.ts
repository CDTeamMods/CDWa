/**
 * Fingerprints modernas e atualizadas do WhatsApp Web para evitar detecção de clientes automatizados
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

export class BrowserProfile {
  /**
   * Retorna um perfil de navegador moderno aleatório para simular um browser real
   */
  static getRandomProfile(): BrowserConfig {
    const index = Math.floor(Math.random() * MODERN_BROWSERS.length)
    return MODERN_BROWSERS[index]!
  }

  /**
   * Gera o User-Agent correspondente
   */
  static getUserAgent(profile: BrowserConfig = this.getRandomProfile()): string {
    if (profile.os.includes('Windows')) {
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${profile.version} Safari/537.36`
    }
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${profile.version} Safari/537.36`
  }
}
