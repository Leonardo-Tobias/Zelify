import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, getSupabaseAdmin, requireUser } from '@/lib/serverAuth'
import { getPortalBearerToken, verifyPortalSession } from '@/lib/portalSession'
import { isValidPushSubscription, subscriptionKey, type PushAudience } from '@/lib/pushNotifications'

function audienceFrom(value: unknown): PushAudience | null {
  return value === 'gestor' || value === 'morador' ? value : null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const audience = audienceFrom(body.audience)
    const subscription = body.subscription
    if (!audience || !isValidPushSubscription(subscription)) {
      return NextResponse.json({ error: 'Assinatura de notificação inválida.' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (audience === 'gestor') {
      const { user } = await requireUser(req)
      const key = subscriptionKey('gestor', subscription.endpoint, { userId: user.id })
      const { error } = await admin.from('push_subscriptions').upsert({
        subscription_key: key,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        audience: 'gestor',
        user_id: user.id,
        condominio_id: null,
        bloco: null,
        apartamento: null,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      return NextResponse.json({ subscribed: true })
    }

    const portal = verifyPortalSession(getPortalBearerToken(req.headers.get('authorization')))
    if (!portal) return NextResponse.json({ error: 'Sessão do portal inválida ou expirada.' }, { status: 401 })
    const key = subscriptionKey('morador', subscription.endpoint, {
      condominioId: portal.condominioId,
      bloco: portal.bloco,
      apartamento: portal.apartamento,
    })
    const { error } = await admin.from('push_subscriptions').upsert({
      subscription_key: key,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      audience: 'morador',
      user_id: null,
      condominio_id: portal.condominioId,
      bloco: portal.bloco,
      apartamento: portal.apartamento,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    return NextResponse.json({ subscribed: true })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    console.error('[PUSH SUBSCRIBE]', error)
    return NextResponse.json({ error: 'Não foi possível ativar as notificações.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const audience = audienceFrom(body.audience)
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint : ''
    if (!audience || !endpoint || endpoint.length > 2048) {
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (audience === 'gestor') {
      const { user } = await requireUser(req)
      const key = subscriptionKey('gestor', endpoint, { userId: user.id })
      const { error } = await admin.from('push_subscriptions').delete().eq('subscription_key', key)
      if (error) throw error
    } else {
      const portal = verifyPortalSession(getPortalBearerToken(req.headers.get('authorization')))
      if (!portal) return NextResponse.json({ error: 'Sessão do portal inválida ou expirada.' }, { status: 401 })
      const key = subscriptionKey('morador', endpoint, {
        condominioId: portal.condominioId,
        bloco: portal.bloco,
        apartamento: portal.apartamento,
      })
      const { error } = await admin.from('push_subscriptions').delete().eq('subscription_key', key)
      if (error) throw error
    }

    const { count, error: countError } = await admin
      .from('push_subscriptions')
      .select('subscription_key', { count: 'exact', head: true })
      .eq('endpoint', endpoint)
    if (countError) throw countError

    return NextResponse.json({ subscribed: false, remainingTargets: count || 0 })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    console.error('[PUSH UNSUBSCRIBE]', error)
    return NextResponse.json({ error: 'Não foi possível desativar as notificações.' }, { status: 500 })
  }
}
