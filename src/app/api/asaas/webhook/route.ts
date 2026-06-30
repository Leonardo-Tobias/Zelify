import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const WEBHOOK_SECRET = process.env.ASAAS_WEBHOOK_SECRET || ''

function getSupabaseAdmin() {
  if (!supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: NextRequest) {
  try {
    // Validar signature (se configurada)
    const signature = req.headers.get('asaas-signature') || ''
    if (WEBHOOK_SECRET && signature !== WEBHOOK_SECRET) {
      console.warn('[WEBHOOK] Signature inválida')
    }

    const event = await req.json()
    const { event: eventName, subscription, payment } = event

    if (!subscription?.id && !payment?.subscription) {
      return NextResponse.json({ received: true })
    }

    const subscriptionId = subscription?.id || payment?.subscription
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      console.warn('[WEBHOOK] Sem service role key, pulando')
      return NextResponse.json({ received: true })
    }

    // Mapear eventos do Asaas para nosso subscription_status
    let newStatus: 'active' | 'past_due' | 'canceled' | null = null

    switch (eventName) {
      case 'SUBSCRIPTION_CREATED':
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        newStatus = 'active'
        break
      case 'PAYMENT_OVERDUE':
      case 'SUBSCRIPTION_OVERDUE':
        newStatus = 'past_due'
        break
      case 'SUBSCRIPTION_DELETED':
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
        newStatus = 'canceled'
        break
    }

    if (newStatus) {
      await supabase
        .from('condominios')
        .update({
          subscription_status: newStatus,
          current_period_end: subscription?.nextDueDate
            ? new Date(subscription.nextDueDate).toISOString()
            : undefined,
        })
        .eq('asaas_subscription_id', subscriptionId)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
