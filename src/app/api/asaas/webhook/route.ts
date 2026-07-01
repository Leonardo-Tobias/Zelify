import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const WEBHOOK_SECRET = process.env.ASAAS_WEBHOOK_SECRET || ''

function getSupabaseAdmin() {
  if (!supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function verifySignature(rawBody: string, signatureHeader: string): boolean {
  if (!WEBHOOK_SECRET) return true
  if (!signatureHeader) return false

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex')

  try {
    const receivedSignatures = signatureHeader.split(',').map(s => s.trim())
    return receivedSignatures.some(sig => {
      const match = sig.match(/^sha256=([a-f0-9]+)$/i)
      if (!match) return false
      return crypto.timingSafeEqual(
        Buffer.from(match[1]),
        Buffer.from(expectedSignature)
      )
    })
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('asaas-signature') || ''

    if (WEBHOOK_SECRET && !verifySignature(rawBody, signature)) {
      console.warn('[WEBHOOK] Signature inválida — rejeitando')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody)
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

    let newStatus: 'active' | 'past_due' | 'canceled' | null = null

    switch (eventName) {
      case 'SUBSCRIPTION_CREATED':
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

    if (newStatus) {
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
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
