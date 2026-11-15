import { describe, it, expect } from 'vitest'
import { SafeMessageQueue, PresenceSimulator, BrowserProfile } from '../src/safety/index.js'

describe('Safety Engine', () => {
  it('deve gerar fingerprint de navegador moderna válida', () => {
    const profile = BrowserProfile.getRandomProfile()
    expect(profile.browser).toBeDefined()
    expect(profile.version).toBeDefined()

    const ua = BrowserProfile.getUserAgent(profile)
    expect(ua).toContain('Mozilla/5.0')
  })

  it('deve simular presença com stanzas corretas', () => {
    const simulator = new PresenceSimulator()
    const testJid = '5511999999999@s.whatsapp.net'

    const node = simulator.createPresenceNode(testJid, 'composing')
    expect(node.tag).toBe('presence')
    expect(node.attrs.to).toBe(testJid)
    expect(node.attrs.type).toBe('composing')
  })

  it('deve gerar recibos de leitura (blue ticks) válidos', () => {
    const simulator = new PresenceSimulator()
    const testJid = '5511999999999@s.whatsapp.net'

    const receipt = simulator.createReadReceiptNode(testJid, 'MSG123')
    expect(receipt.tag).toBe('receipt')
    expect(receipt.attrs.type).toBe('read')
    expect(receipt.attrs.id).toBe('MSG123')
  })

  it('deve calcular tempo de digitação proporcional e natural', () => {
    const simulator = new PresenceSimulator()
    const shortDuration = simulator.calculateTypingDuration(10)
    const longDuration = simulator.calculateTypingDuration(200)

    expect(shortDuration).toBeGreaterThanOrEqual(500)
    expect(longDuration).toBeGreaterThan(shortDuration)
  })

  it('deve enfileirar tarefas sequencialmente respeitando o rate limiter', async () => {
    const queue = new SafeMessageQueue({
      minDelayMs: 10,
      maxDelayMs: 50,
      maxMessagesPerMinute: 60,
    })

    const results: number[] = []
    await Promise.all([
      queue.enqueue(async () => {
        results.push(1)
        return 1
      }),
      queue.enqueue(async () => {
        results.push(2)
        return 2
      }),
    ])

    expect(results).toEqual([1, 2])
  })
})
