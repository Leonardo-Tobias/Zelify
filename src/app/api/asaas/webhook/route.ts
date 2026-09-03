import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { api, cancelAsaasSubscription } from '@/lib/asaas'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const WEBHOOK_SECRET = process.env.ASAAS_WEBHOOK_SECRET || ''

function getSupabaseAdmin() {
  if (!supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function verifyWebhookToken(receivedToken: string): boolean {
  if (!WEBHOOK_SECRET) return false
  if (!receivedToken) return false

  try {
    const expected = Buffer.from(WEBHOOK_SECRET, 'utf8')
    const received = Buffer.from(receivedToken, 'utf8')
    return expected.length === received.length && crypto.timingSafeEqual(expected, received)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!WEBHOOK_SECRET) {
      console.error('[WEBHOOK] ASAAS_WEBHOOK_SECRET não configurado')
      return NextResponse.json({ error: 'Webhook não configurado' }, { status: 503 })
    }

    const receivedToken = req.headers.get('asaas-access-token') || ''

    if (!verifyWebhookToken(receivedToken)) {
      console.warn('[WEBHOOK] Token inválido — rejeitando')
      return NextResponse.json({ error: 'Invalid webhook token' }, { status: 401 })
    }

    const event = await req.json()
    const { event: eventName, subscription, payment } = event

    if (!subscription?.id && !payment?.subscription) {
      return NextResponse.json({ received: true })
    }

    const subscriptionId = subscription?.id || payment?.subscription
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      console.error('[WEBHOOK] SUPABASE_SERVICE_ROLE_KEY ausente')
      return NextResponse.json({ error: 'Banco não configurado' }, { status: 503 })
    }

    let newStatus: 'active' | 'past_due' | 'canceled' | null = null

    switch (eventName) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        newStatus = 'active'
        break
      case 'PAYMENT_OVERDUE':
      case 'SUBSCRIPTION_OVERDUE':
      case 'SUBSCRIPTION_DELETED':
        newStatus = 'past_due'
        break
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
        newStatus = 'canceled'
        break
    }

    if (newStatus === 'active') {
      const subscriptionDetails = subscription?.nextDueDate
        ? subscription
        : await api.getSubscription(subscriptionId)
      const { data: pendingCondo, error: pendingError } = await supabase
        .from('condominios')
        .select('id, asaas_subscription_id, pending_plan_type, pending_billing_type, pending_max_instances')
        .eq('pending_subscription_id', subscriptionId)
        .maybeSingle()
      if (pendingError) throw pendingError

      if (pendingCondo) {
        const previousSubscriptionId = pendingCondo.asaas_subscription_id
        const updateData: Record<string, unknown> = {
          asaas_subscription_id: subscriptionId,
          plan_type: pendingCondo.pending_plan_type,
          billing_type: pendingCondo.pending_billing_type,
          subscription_status: 'active',
          pending_subscription_id: null,
          pending_plan_type: null,
          pending_billing_type: null,
          pending_max_instances: null,
        }
        if (pendingCondo.pending_max_instances) {
          updateData.max_instances = pendingCondo.pending_max_instances
        }
        if (subscriptionDetails.nextDueDate) {
          updateData.current_period_end = new Date(subscriptionDetails.nextDueDate).toISOString()
        }

        const { error: activationError } = await supabase
          .from('condominios')
          .update(updateData)
          .eq('id', pendingCondo.id)
        if (activationError) throw activationError

        if (pendingCondo.pending_plan_type === 'corporate') {
          const { error: instancesError } = await supabase
            .from('condominios')
            .update({ plan_type: 'corporate', subscription_status: 'active' })
            .eq('parent_condominio_id', pendingCondo.id)
          if (instancesError) throw instancesError
        }

        if (previousSubscriptionId && previousSubscriptionId !== subscriptionId) {
          try {
            await cancelAsaasSubscription(previousSubscriptionId)
          } catch (error) {
            console.warn('[WEBHOOK] Não foi possível cancelar a assinatura anterior', error)
          }
        }
      } else {
        await supabase
          .from('condominios')
          .update({ subscription_status: 'active' })
          .eq('asaas_subscription_id', subscriptionId)
      }
    } else if (newStatus) {
      const updateData: Record<string, unknown> = {
        subscription_status: newStatus,
      }
      if (subscription?.nextDueDate) {
        updateData.current_period_end = new Date(subscription.nextDueDate).toISOString()
      }

      await supabase
        .from('condominios')
        .update(updateData)
        .eq('asaas_subscription_id', subscriptionId)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err)
    return NextResponse.json({ error: 'Falha ao processar webhook' }, { status: 500 })
  }
}
