import { NextRequest, NextResponse } from 'next/server'
import { createAsaasCustomer, createAsaasSubscription, getPixPaymentData, updateAsaasCustomer } from '@/lib/asaas'
import { authErrorResponse, requireCondominioRole } from '@/lib/serverAuth'
import { calculateSubscriptionPrice } from '@/lib/billing'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      condominioId,
      cpfCnpj,
      phone,
      planType,        // 'pro' | 'corporate'
      billingType,     // 'PIX' | 'CREDIT_CARD'
      cycle,           // 'MONTHLY' | 'YEARLY'
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

    if ((planType !== 'pro' && planType !== 'corporate') ||
        (billingType !== 'PIX' && billingType !== 'CREDIT_CARD') ||
        (cycle !== 'MONTHLY' && cycle !== 'YEARLY')) {
      return NextResponse.json({ error: 'Plano ou forma de cobrança inválidos.' }, { status: 400 })
    }

    const { admin: supabase, user } = await requireCondominioRole(req, condominioId)
    const { data: sourceCondo, error: sourceCondoError } = await supabase
      .from('condominios')
      .select('nome')
      .eq('id', condominioId)
      .single()
    if (sourceCondoError || !sourceCondo) throw sourceCondoError || new Error('Condomínio não encontrado.')
    if (!user.email) return NextResponse.json({ error: 'Usuário sem e-mail de cobrança.' }, { status: 400 })
    const billingName = sourceCondo.nome
    const billingEmail = user.email

    // Recalcula o preço no servidor (não confia no value do cliente)
    const { value: calculatedValue, condominios: normalizedCondoCount } =
      calculateSubscriptionPrice(planType, cycle, numCondos)

    // 0. Se for corporate, cria ou recupera o container
    let targetCondominioId = condominioId
    if (planType === 'corporate') {
      const userId = user.id
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
              nome: `Corporate - ${billingName}`,
              created_by: userId,
              plan_type: 'corporate',
              subscription_status: 'past_due',
              max_instances: normalizedCondoCount || 5,
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
                nome: gestorData?.nome || billingName,
                papel: 'admin',
              })
          }

          // Adotar condomínio atual como primeira instância
          await supabase
            .from('condominios')
            .update({
              parent_condominio_id: container.id,
            })
            .eq('id', condominioId)

          targetCondominioId = container.id
        } else {
          // Container já existe — atualiza max_instances e usa ele
          targetCondominioId = existingContainer.id
        }
    }

    // 1. Buscar ou criar customer no Asaas
    let customerId: string | null = null
    let customerName = billingName

    if (supabase) {
      const { data: condo } = await supabase
        .from('condominios')
        .select('asaas_customer_id, nome')
        .eq('id', targetCondominioId)
        .single()

      if (condo?.asaas_customer_id) {
        customerId = condo.asaas_customer_id
      }
      if (condo?.nome) customerName = condo.nome
    }

    if (!customerId) {
      const customer = await createAsaasCustomer(customerName, billingEmail, cpfCnpj, phone)
      customerId = customer.id

      // Salvar customer_id no Supabase (no container se corporate)
      if (supabase) {
        await supabase
          .from('condominios')
          .update({ asaas_customer_id: customerId })
          .eq('id', targetCondominioId)
      }
    } else {
      // Atualiza customer existente com CPF e telefone mais recentes
      await updateAsaasCustomer(customerId, customerName, billingEmail, cpfCnpj, phone)
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
      const updateData: Record<string, unknown> = {
        pending_subscription_id: subscription.id,
        pending_plan_type: planType,
        pending_billing_type: billingType,
      }
      if (planType === 'corporate') {
        updateData.pending_max_instances = normalizedCondoCount || 5
      }

      await supabase
        .from('condominios')
        .update(updateData)
        .eq('id', targetCondominioId)
    }

    // 4. No PIX, obtém a cobrança pertencente à assinatura para que o webhook
    //    consiga associar o pagamento ao plano pendente.
    let pixData = null
    if (billingType === 'PIX') {
      try {
        pixData = await getPixPaymentData(subscription.id)
      } catch (error) {
        // A cobrança pode levar alguns segundos para ficar disponível; o cliente continua via polling.
        console.warn('[CHECKOUT] QR Code PIX ainda não disponível', error)
      }
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: 'pending_payment',
      pix: pixData,
    })
  } catch (err: unknown) {
    const authResponse = authErrorResponse(err)
    if (authResponse) return authResponse
    const message = err instanceof Error ? err.message : 'Erro interno no checkout'
    console.error('[CHECKOUT ERROR]', err)
    console.error('[CHECKOUT ERROR stack]', err instanceof Error ? err.stack : '')
    return NextResponse.json({
      error: message,
      detail: err instanceof Error ? err.message : 'Erro desconhecido',
    }, { status: 500 })
  }
}
