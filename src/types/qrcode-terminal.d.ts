declare module 'qrcode-terminal' {
  export interface QRCodeOptions {
    small?: boolean
  }

  export function generate(
    text: string,
    options?: QRCodeOptions | ((qrcode: string) => void),
    callback?: (qrcode: string) => void
  ): void

  export function setErrorLevel(error: 'L' | 'M' | 'Q' | 'H'): void

  const qrcodeTerminal: {
    generate: (
      text: string,
      options?: QRCodeOptions | ((qrcode: string) => void),
      callback?: (qrcode: string) => void
    ) => void
    setErrorLevel: (error: 'L' | 'M' | 'Q' | 'H') => void
  }

  export default qrcodeTerminal
}
