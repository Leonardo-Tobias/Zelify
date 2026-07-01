import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAsaasCustomer, createAsaasSubscription, createAsaasPixPayment, updateAsaasCustomer } from '@/lib/asaas'

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
      numCondos,       // corporate: max_instances
    } = body

    if (!condominioId || !planType || !billingType || !value) {
      return NextResponse.json(
        { error: 'Dados obrigatórios ausentes.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 0. Se for corporate, cria ou recupera o container
    let targetCondominioId = condominioId
    if (planType === 'corporate' && supabase) {
      const { data: gestorRows } = await supabase
        .from('usuarios_gestores')
        .select('user_id')
        .eq('condominio_id', condominioId)
        .limit(1)

      const userId = gestorRows?.[0]?.user_id

      if (userId) {
        // Buscar todos os condomínios do gestor
        const { data: allGestorRows } = await supabase
          .from('usuarios_gestores')
          .select('condominio_id')
          .eq('user_id', userId)

        const allCondoIds = allGestorRows?.map(r => r.condominio_id) || []

        const { data: allCondos } = await supabase
          .from('condominios')
          .select('*')
          .in('id', allCondoIds)

        const existingContainer = allCondos?.find(c => c.plan_type === 'corporate' && !c.parent_condominio_id)

        if (!existingContainer) {
          // Criar container corporate
          const { data: container, error: containerErr } = await supabase
            .from('condominios')
            .insert({
              nome: `Corporate - ${nome}`,
              plan_type: 'corporate',
              subscription_status: 'active',
              max_instances: numCondos || 5,
            })
            .select()
            .single()

          if (containerErr) throw containerErr

          // Adotar condomínio atual como primeira instância
          await supabase
            .from('condominios')
            .update({ parent_condominio_id: container.id })
            .eq('id', condominioId)

          targetCondominioId = container.id
        } else {
          // Container já existe — usa ele
          targetCondominioId = existingContainer.id
        }
      }
    }

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
      console.log('[CHECKOUT] Criando customer...', { nome, email, cpfCnpj, phone })
      const customer = await createAsaasCustomer(nome, email, cpfCnpj, phone)
      customerId = customer.id
      console.log('[CHECKOUT] Customer criado:', customerId)

      // Salvar customer_id no Supabase (no container se corporate)
      if (supabase) {
        await supabase
          .from('condominios')
          .update({ asaas_customer_id: customerId })
          .eq('id', targetCondominioId)
      }
    } else {
      // Atualiza customer existente com CPF e telefone mais recentes
      console.log('[CHECKOUT] Atualizando customer existente:', customerId, { nome, email, cpfCnpj, phone })
      await updateAsaasCustomer(customerId, nome, email, cpfCnpj, phone)
    }

    // 2. Criar assinatura no Asaas
    console.log('[CHECKOUT] Criando assinatura...', { customerId, planType, billingType })
    const subscription = await createAsaasSubscription(
      customerId,
      planType,
      billingType,
      cycle,
      value,
      creditCard,
      holderInfo,
    )

    // 3. Salvar subscription_id no Supabase (no container se corporate, senão no próprio condomínio)
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
        .eq('id', targetCondominioId)
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
    console.error('[CHECKOUT ERROR stack]', err instanceof Error ? err.stack : '')
    return NextResponse.json({
      error: message,
      detail: err instanceof Error ? err.message : 'Erro desconhecido',
    }, { status: 500 })
  }
}
