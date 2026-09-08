import { describe, expect, it } from 'vitest'
import { endpointFingerprint, isValidPushSubscription, subscriptionKey } from './pushNotifications'

const subscription = {
  endpoint: 'https://push.example.com/subscription/123',
  keys: { p256dh: 'public-key', auth: 'auth-key' },
}

describe('pushNotifications', () => {
  it('gera uma impressão estável sem expor o endpoint', () => {
    const fingerprint = endpointFingerprint(subscription.endpoint)
    expect(fingerprint).toHaveLength(64)
    expect(fingerprint).not.toContain('push.example.com')
    expect(endpointFingerprint(subscription.endpoint)).toBe(fingerprint)
  })

  it('separa a mesma assinatura por público e destino', () => {
    const manager = subscriptionKey('gestor', subscription.endpoint, { userId: 'user-1' })
    const resident = subscriptionKey('morador', subscription.endpoint, {
      condominioId: 'condo-1',
      bloco: ' A ',
      apartamento: ' 101 ',
    })

    expect(manager).not.toBe(resident)
    expect(resident).toContain('morador:condo-1:a:101:')
  })

  it('aceita apenas assinaturas HTTPS completas e limitadas', () => {
    expect(isValidPushSubscription(subscription)).toBe(true)
    expect(isValidPushSubscription({ ...subscription, endpoint: 'http://push.example.com/123' })).toBe(false)
    expect(isValidPushSubscription({ endpoint: subscription.endpoint, keys: { p256dh: 'key' } })).toBe(false)
  })
})
