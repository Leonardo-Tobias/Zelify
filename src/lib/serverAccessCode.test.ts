import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decryptAccessCode, encryptAccessCode } from './serverAccessCode'

describe('proteção do código de acesso', () => {
  const originalSecret = process.env.PORTAL_SESSION_SECRET

  beforeEach(() => {
    process.env.PORTAL_SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'
  })

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.PORTAL_SESSION_SECRET
    else process.env.PORTAL_SESSION_SECRET = originalSecret
  })

  it('cifra e recupera o código sem armazená-lo em texto puro', () => {
    const encrypted = encryptAccessCode('8888')

    expect(encrypted).not.toContain('8888')
    expect(decryptAccessCode(encrypted)).toBe('8888')
  })

  it('rejeita conteúdo adulterado', () => {
    const encrypted = encryptAccessCode('1234')
    expect(() => decryptAccessCode(`${encrypted}x`)).toThrow()
  })
})
