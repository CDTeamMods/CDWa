import { describe, it, expect } from 'vitest'
import {
  DisconnectReason,
  DisconnectError,
  shouldReconnect,
  isLoggedOut,
  getDisconnectStatusCode,
} from '../src/socket/index.js'

describe('Disconnect Error Inspection', () => {
  it('deve criar DisconnectError com informações estruturadas', () => {
    const error = new DisconnectError(401)
    expect(error.name).toBe('DisconnectError')
    expect(error.statusCode).toBe(401)
    expect(error.isLoggedOut).toBe(true)
    expect(error.shouldReconnect).toBe(false)
    expect(error.reason).toContain('Logged Out')
    expect(error.date).toBeInstanceOf(Date)
  })

  it('deve identificar desconexão recuperável (408, 428, 515)', () => {
    const timeoutErr = new DisconnectError(DisconnectReason.timedOut)
    expect(timeoutErr.shouldReconnect).toBe(true)
    expect(shouldReconnect(timeoutErr)).toBe(true)
    expect(isLoggedOut(timeoutErr)).toBe(false)

    const restartErr = new DisconnectError(DisconnectReason.restartRequired)
    expect(restartErr.shouldReconnect).toBe(true)
    expect(shouldReconnect(restartErr)).toBe(true)

    const closedErr = new DisconnectError(DisconnectReason.connectionClosed)
    expect(closedErr.shouldReconnect).toBe(true)
    expect(shouldReconnect(closedErr)).toBe(true)
  })

  it('deve identificar logout definitivo (401)', () => {
    const logoutErr = new DisconnectError(DisconnectReason.loggedOut)
    expect(logoutErr.isLoggedOut).toBe(true)
    expect(logoutErr.shouldReconnect).toBe(false)
    expect(isLoggedOut(logoutErr)).toBe(true)
    expect(shouldReconnect(logoutErr)).toBe(false)
  })

  it('deve extrair statusCode de diferentes formatos de erro (Boom / DisconnectError)', () => {
    const dcError = new DisconnectError(515)
    expect(getDisconnectStatusCode(dcError)).toBe(515)

    const boomLike = { output: { statusCode: 401 } }
    expect(getDisconnectStatusCode(boomLike)).toBe(401)
    expect(isLoggedOut(boomLike)).toBe(true)
    expect(shouldReconnect(boomLike)).toBe(false)

    const genericObj = { statusCode: 428 }
    expect(getDisconnectStatusCode(genericObj)).toBe(428)
    expect(shouldReconnect(genericObj)).toBe(true)

    expect(getDisconnectStatusCode(undefined)).toBeUndefined()
  })

  it('deve incluir rawReason quando fornecido', () => {
    const err = new DisconnectError(401, undefined, Buffer.from('device removed'))
    expect(err.rawReason).toBe('device removed')
    expect(err.message).toContain('device removed')
  })
})
