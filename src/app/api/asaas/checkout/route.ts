import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAsaasCustomer, createAsaasSubscription, createAsaasPixPayment, updateAsaasCustomer, cancelAsaasSubscription } from '@/lib/asaas'

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

    if (!condominioId || !planType || !billingType) {
      return NextResponse.json(
        { error: 'Dados obrigatórios ausentes.' },
        { status: 400 }
      )
    }

    // Recalcula o preço no servidor (não confia no value do cliente)
    const isAnnual = cycle === 'YEARLY'
    const getCorporatePerCondoPrice = (n: number, annual: boolean) => {
      if (n >= 16 && n <= 50) return annual ? 39 : 49
      if (n > 50 && n < 100) return annual ? 29 : 39
      return annual ? 49 : 59 // 5-15 condos
    }
    let calculatedValue: number
    if (planType === 'pro') {
      calculatedValue = isAnnual ? 1488 : 149
    } else {
      const condoCount = Math.max(5, Math.min(numCondos || 5, 99))
      const perCondo = getCorporatePerCondoPrice(condoCount, isAnnual)
      calculatedValue = condoCount * perCondo
      if (isAnnual) calculatedValue *= 12
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

        const existingContainer = allCondos?.find(c => c.plan_type === 'corporate' && !c.parent_condominio_id && !c.slug)

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

          // Vincular gestor ao container
          if (userId) {
            const { data: gestorData } = await supabase
              .from('usuarios_gestores')
              .select('nome')
              .eq('user_id', userId)
              .limit(1)
              .maybeSingle()

            await supabase
              .from('usuarios_gestores')
              .insert({
                user_id: userId,
                condominio_id: container.id,
                nome: gestorData?.nome || nome,
                papel: 'admin',
              })
          }

          // Adotar condomínio atual como primeira instância
          await supabase
            .from('condominios')
            .update({
              parent_condominio_id: container.id,
              plan_type: 'corporate',
              subscription_status: 'active',
            })
            .eq('id', condominioId)

          targetCondominioId = container.id
        } else {
          // Container já existe — atualiza max_instances e usa ele
          targetCondominioId = existingContainer.id
          const newMaxInstances = Math.max(5, numCondos || 5)
          if (existingContainer.max_instances !== newMaxInstances) {
            await supabase
              .from('condominios')
              .update({ max_instances: newMaxInstances })
              .eq('id', existingContainer.id)
          }
        }
      }
    }

    // Cancela assinatura anterior se existir (ex: upgrade Pro → Corporate ou mudança de plano)
    if (supabase) {
      const { data: currentCondo } = await supabase
        .from('condominios')
        .select('asaas_subscription_id')
        .eq('id', condominioId)
        .single()

      if (currentCondo?.asaas_subscription_id) {
        try {
          console.log('[CHECKOUT] Cancelando assinatura anterior:', currentCondo.asaas_subscription_id)
          await cancelAsaasSubscription(currentCondo.asaas_subscription_id)
        } catch (err) {
          console.warn('[CHECKOUT] Erro ao cancelar assinatura anterior (pode já estar cancelada):', err)
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

    // Usa o valor recalculado pelo servidor
    const finalValue = calculatedValue

    // 2. Criar assinatura no Asaas
    console.log('[CHECKOUT] Criando assinatura...', { customerId, planType, billingType, finalValue })
    const subscription = await createAsaasSubscription(
      customerId,
      planType,
      billingType,
      cycle,
      finalValue,
      creditCard,
      holderInfo,
    )

    // 3. Salvar subscription_id no Supabase (no container se corporate, senão no próprio condomínio)
    if (supabase) {
      const days = cycle === 'YEARLY' ? 365 : 30
      const periodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

      const updateData: Record<string, unknown> = {
        asaas_subscription_id: subscription.id,
        plan_type: planType,
        subscription_status: 'active',
        billing_type: billingType,
        current_period_end: periodEnd,
      }
      if (planType === 'corporate') {
        updateData.max_instances = Math.max(5, numCondos || 5)
      }

      await supabase
        .from('condominios')
        .update(updateData)
        .eq('id', targetCondominioId)
    }

    // 4. Se for PIX, cria primeiro pagamento avulso com vencimento imediato
    //    (a assinatura em si não gera QR Code PIX automaticamente)
    let pixData = null
    if (billingType === 'PIX') {
      const dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0] // amanhã
      const payment = await createAsaasPixPayment({
        customer: customerId,
        value: finalValue,
        dueDate,
        description: planType === 'pro' ? 'Zelcon Pro - 1º mês' : 'Zelcon Corporate - 1º mês',
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
