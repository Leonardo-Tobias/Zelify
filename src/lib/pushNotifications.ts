import crypto from 'crypto'
import webpush, { type PushSubscription } from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PushAudience = 'gestor' | 'morador'
export type OccurrencePushEvent = 'status' | 'public_comment'

type StoredSubscription = {
  subscription_key: string
  endpoint: string
  p256dh: string
  auth_key: string
}

type OccurrenceForPush = {
  id: string
  condominio_id: string
  tipo: string
  bloco: string
  apartamento: string
  status: string
  prioridade?: string | null
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:contato@zelcon.com.br'
  if (!publicKey || !privateKey) throw new Error('VAPID_NOT_CONFIGURED')
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
}

export function endpointFingerprint(endpoint: string): string {
  return crypto.createHash('sha256').update(endpoint).digest('hex')
}

export function subscriptionKey(
  audience: PushAudience,
  endpoint: string,
  owner: { userId?: string; condominioId?: string; bloco?: string; apartamento?: string },
): string {
  const target = audience === 'gestor'
    ? owner.userId
    : `${owner.condominioId}:${owner.bloco?.trim().toLowerCase()}:${owner.apartamento?.trim().toLowerCase()}`
  return `${audience}:${target}:${endpointFingerprint(endpoint)}`
}

export function isValidPushSubscription(value: unknown): value is PushSubscription {
  if (!value || typeof value !== 'object') return false
  const subscription = value as Partial<PushSubscription>
  return typeof subscription.endpoint === 'string' && subscription.endpoint.startsWith('https://') &&
    subscription.endpoint.length <= 2048 && typeof subscription.keys?.p256dh === 'string' &&
    subscription.keys.p256dh.length <= 512 && typeof subscription.keys?.auth === 'string' &&
    subscription.keys.auth.length <= 512
}

async function deliver(
  admin: SupabaseClient,
  subscriptions: StoredSubscription[],
  payload: { title: string; body: string; url: string; tag: string },
) {
  if (!subscriptions.length) return { delivered: 0 }
  configureWebPush()

  // O navegador mantém uma única assinatura por origem. O mesmo endpoint pode
  // estar vinculado a mais de um perfil/ambiente, mas deve receber só um push.
  const uniqueSubscriptions = [
    ...new Map(subscriptions.map(subscription => [subscription.endpoint, subscription])).values(),
  ]
  let delivered = 0
  await Promise.all(uniqueSubscriptions.map(async stored => {
    try {
      await webpush.sendNotification({
        endpoint: stored.endpoint,
        keys: { p256dh: stored.p256dh, auth: stored.auth_key },
      }, JSON.stringify(payload), { TTL: 60 * 60 })
      delivered += 1
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 0
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', stored.endpoint)
      } else {
        console.error('[WEB PUSH DELIVERY]', error)
      }
    }
  }))

  return { delivered }
}

export async function notifyManagersOfNewOccurrence(
  admin: SupabaseClient,
  occurrence: OccurrenceForPush,
) {
  const { data: managers, error: managersError } = await admin
    .from('usuarios_gestores')
    .select('user_id')
    .eq('condominio_id', occurrence.condominio_id)
  if (managersError) throw managersError

  const userIds = [...new Set((managers || []).map(item => item.user_id).filter(Boolean))]
  if (!userIds.length) return { delivered: 0 }

  const { data, error } = await admin
    .from('push_subscriptions')
    .select('subscription_key, endpoint, p256dh, auth_key')
    .eq('audience', 'gestor')
    .in('user_id', userIds)
  if (error) throw error

  return deliver(admin, (data || []) as StoredSubscription[], {
    title: occurrence.prioridade === 'urgente' ? 'Nova ocorrência urgente' : 'Nova ocorrência recebida',
    body: 'Há uma nova solicitação aguardando análise no Zelcon.',
    url: `/dashboard/kanban?occurrence=${encodeURIComponent(occurrence.id)}`,
    tag: `occurrence-created-${occurrence.id}`,
  })
}

export async function notifyResidentsOfOccurrenceUpdate(
  admin: SupabaseClient,
  occurrence: OccurrenceForPush,
  event: OccurrencePushEvent,
) {
  const { data: condo } = await admin
    .from('condominios')
    .select('slug')
    .eq('id', occurrence.condominio_id)
    .maybeSingle()

  let query = admin
    .from('push_subscriptions')
    .select('subscription_key, endpoint, p256dh, auth_key')
    .eq('audience', 'morador')
    .eq('condominio_id', occurrence.condominio_id)

  if (occurrence.tipo === 'manutencao') {
    query = query.eq('bloco', occurrence.bloco).eq('apartamento', occurrence.apartamento)
  }

  const { data, error } = await query
  if (error) throw error

  const statusLabels: Record<string, string> = {
    pendente: 'Recebida',
    em_execucao: 'Em andamento',
    resolvido: 'Concluída',
    encontrado: 'Encontrado',
    aguardando_retirada: 'Aguardando retirada',
    entregue: 'Entregue',
  }
  const body = event === 'public_comment'
    ? 'A administração publicou uma nova atualização.'
    : `Novo status: ${statusLabels[occurrence.status] || 'Atualizada'}.`

  return deliver(admin, (data || []) as StoredSubscription[], {
    title: 'Sua ocorrência foi atualizada',
    body,
    url: condo?.slug ? `/${encodeURIComponent(condo.slug)}` : '/',
    tag: `occurrence-${occurrence.id}`,
  })
}
