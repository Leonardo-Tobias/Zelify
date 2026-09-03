export type PaidPlan = 'pro' | 'corporate'
export type BillingCycle = 'MONTHLY' | 'YEARLY'

export function normalizeCondominioCount(value: unknown): number {
  const parsed = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 5
  return Math.max(5, Math.min(parsed, 99))
}

export function calculateSubscriptionPrice(
  plan: PaidPlan,
  cycle: BillingCycle,
  requestedCondominios?: unknown,
): { value: number; condominios: number | null } {
  const annual = cycle === 'YEARLY'
  if (plan === 'pro') {
    return { value: annual ? 1488 : 149, condominios: null }
  }

  const condominios = normalizeCondominioCount(requestedCondominios)
  let unitPrice = annual ? 49 : 59
  if (condominios >= 16 && condominios <= 50) unitPrice = annual ? 39 : 49
  if (condominios > 50) unitPrice = annual ? 29 : 39

  return {
    value: condominios * unitPrice * (annual ? 12 : 1),
    condominios,
  }
}
