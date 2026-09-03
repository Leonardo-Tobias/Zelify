import { describe, expect, it } from 'vitest'
import { calculateSubscriptionPrice, normalizeCondominioCount } from './billing'

describe('calculateSubscriptionPrice', () => {
  it('calcula os planos Pro mensal e anual no servidor', () => {
    expect(calculateSubscriptionPrice('pro', 'MONTHLY').value).toBe(149)
    expect(calculateSubscriptionPrice('pro', 'YEARLY').value).toBe(1488)
  })

  it('aplica as faixas Corporate e limita a quantidade aceita', () => {
    expect(calculateSubscriptionPrice('corporate', 'MONTHLY', 5).value).toBe(295)
    expect(calculateSubscriptionPrice('corporate', 'MONTHLY', 16).value).toBe(784)
    expect(calculateSubscriptionPrice('corporate', 'MONTHLY', 51).value).toBe(1989)
    expect(normalizeCondominioCount(200)).toBe(99)
  })

  it('multiplica o Corporate anual por doze meses', () => {
    expect(calculateSubscriptionPrice('corporate', 'YEARLY', 5).value).toBe(2940)
  })
})
