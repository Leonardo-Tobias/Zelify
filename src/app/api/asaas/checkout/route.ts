import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAsaasCustomer, createAsaasSubscription, createAsaasPixPayment } from '@/lib/asaas'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getSupabaseAdmin() {
  if (!supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      condominioId,
      nome,
      email,
      cpfCnpj,
      phone,
      planType,        // 'pro' | 'corporate'
      billingType,     // 'PIX' | 'CREDIT_CARD'
      cycle,           // 'MONTHLY' | 'YEARLY'
      value,
      creditCard,
      holderInfo,
    } = body

    if (!condominioId || !planType || !billingType || !value) {
      return NextResponse.json(
        { error: 'Dados obrigatórios ausentes.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1. Buscar ou criar customer no Asaas
    let customerId: string | null = null

    if (supabase) {
      const { data: condo } = await supabase
        .from('condominios')
        .select('asaas_customer_id')
        .eq('id', condominioId)
        .single()

      if (condo?.asaas_customer_id) {
        customerId = condo.asaas_customer_id
      }
    }

    if (!customerId) {
      const customer = await createAsaasCustomer(nome, email, cpfCnpj, phone)
      customerId = customer.id

      // Salvar customer_id no Supabase
      if (supabase) {
        await supabase
          .from('condominios')
          .update({ asaas_customer_id: customerId })
          .eq('id', condominioId)
      }
    }

    // 2. Criar assinatura no Asaas
    const subscription = await createAsaasSubscription(
      customerId,
      planType,
      billingType,
      cycle,
      value,
      creditCard,
      holderInfo,
    )

    // 3. Salvar subscription_id no Supabase
    if (supabase) {
      const days = cycle === 'YEARLY' ? 365 : 30
      const periodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

      await supabase
        .from('condominios')
        .update({
          asaas_subscription_id: subscription.id,
          plan_type: planType,
          subscription_status: 'active',
          billing_type: billingType,
          current_period_end: periodEnd,
        })
        .eq('id', condominioId)
    }

    // 4. Se for PIX, cria primeiro pagamento avulso com vencimento imediato
    //    (a assinatura em si não gera QR Code PIX automaticamente)
    let pixData = null
    if (billingType === 'PIX') {
      const dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0] // amanhã
      const payment = await createAsaasPixPayment({
        customer: customerId,
        value,
        dueDate,
        description: planType === 'pro' ? 'Zelcore Pro - 1º mês' : 'Zelcore Corporate - 1º mês',
      })
      if (payment) {
        pixData = {
          qrCode: payment.pixQrCode,
          copyPaste: payment.pixCopyPaste,
          invoiceUrl: payment.invoiceUrl,
          status: payment.status,
        }
      }
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      pix: pixData,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno no checkout'
    console.error('[CHECKOUT ERROR]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
