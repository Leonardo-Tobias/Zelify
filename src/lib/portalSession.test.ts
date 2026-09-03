import { beforeEach, describe, expect, it } from 'vitest'
import { createPortalSession, getPortalBearerToken, verifyPortalSession } from './portalSession'

describe('portalSession', () => {
  beforeEach(() => {
    process.env.PORTAL_SESSION_SECRET = 'segredo-de-teste-com-tamanho-suficiente'
  })

  it('assina e valida uma sessão de morador', () => {
    const token = createPortalSession({
      condominioId: 'condominio-1',
      bloco: 'A',
      apartamento: '101',
    })

    expect(verifyPortalSession(token)).toMatchObject({
      condominioId: 'condominio-1',
      bloco: 'A',
      apartamento: '101',
    })
  })

  it('rejeita tokens adulterados e expirados', () => {
    const token = createPortalSession({ condominioId: 'c1', bloco: 'B', apartamento: '2' })
    expect(verifyPortalSession(`${token}x`)).toBeNull()

    const expired = createPortalSession({ condominioId: 'c1', bloco: 'B', apartamento: '2' }, -1)
    expect(verifyPortalSession(expired)).toBeNull()
  })

  it('extrai apenas tokens Bearer', () => {
    expect(getPortalBearerToken('Bearer abc.def')).toBe('abc.def')
    expect(getPortalBearerToken('Basic abc')).toBeNull()
  })
})
