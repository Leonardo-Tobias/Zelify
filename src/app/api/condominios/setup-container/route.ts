import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, getSupabaseAdmin, requireCondominioRole } from '@/lib/serverAuth'

export async function POST(req: NextRequest) {
  let createdContainerId: string | null = null
  try {
    const { condominioId, maxInstances } = await req.json()
    if (typeof condominioId !== 'string' || !condominioId) {
      return NextResponse.json({ error: 'condominioId é obrigatório.' }, { status: 400 })
    }

    const normalizedMax = Math.min(100, Math.max(2, Number(maxInstances) || 10))
    const { admin: supabase, user } = await requireCondominioRole(req, condominioId)
    const { data: condo, error: condoError } = await supabase
      .from('condominios')
      .select('id, nome, plan_type, slug, parent_condominio_id, subscription_status, asaas_customer_id, asaas_subscription_id, billing_type, current_period_end, pending_subscription_id, pending_plan_type, pending_billing_type, pending_max_instances')
      .eq('id', condominioId)
      .single()
    if (condoError || !condo) return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })
    if (condo.plan_type !== 'corporate' || condo.parent_condominio_id || !condo.slug) {
      return NextResponse.json({ error: 'Este condomínio não precisa dessa configuração.' }, { status: 400 })
    }

    const { data: gestor, error: gestorError } = await supabase
      .from('usuarios_gestores')
      .select('nome')
      .eq('user_id', user.id)
      .eq('condominio_id', condominioId)
      .single()
    if (gestorError || !gestor) throw gestorError || new Error('Gestor não encontrado.')

    const { data: container, error: containerError } = await supabase
      .from('condominios')
      .insert({
        nome: `Corporate - ${condo.nome}`,
        slug: null,
        codigo_acesso: null,
        created_by: user.id,
        plan_type: 'corporate',
        subscription_status: condo.subscription_status,
        asaas_customer_id: condo.asaas_customer_id,
        asaas_subscription_id: condo.asaas_subscription_id,
        billing_type: condo.billing_type,
        current_period_end: condo.current_period_end,
        pending_subscription_id: condo.pending_subscription_id,
        pending_plan_type: condo.pending_plan_type,
        pending_billing_type: condo.pending_billing_type,
        pending_max_instances: condo.pending_max_instances,
        max_instances: normalizedMax,
      })
      .select('id')
      .single()
    if (containerError || !container) throw containerError || new Error('Falha ao criar container.')
    createdContainerId = container.id

    const { error: linkError } = await supabase.from('usuarios_gestores').insert({
      user_id: user.id,
      condominio_id: container.id,
      nome: gestor.nome,
      papel: 'admin',
    })
    if (linkError) throw linkError

    const { error: updateError } = await supabase.from('condominios').update({
      parent_condominio_id: container.id,
      asaas_customer_id: null,
      asaas_subscription_id: null,
      billing_type: null,
      current_period_end: null,
      pending_subscription_id: null,
      pending_plan_type: null,
      pending_billing_type: null,
      pending_max_instances: null,
    }).eq('id', condominioId)
    if (updateError) throw updateError

    return NextResponse.json({ success: true, containerId: container.id })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    if (createdContainerId) {
      try {
        await getSupabaseAdmin().from('condominios').delete().eq('id', createdContainerId)
      } catch (rollbackError) {
        console.error('[SETUP CONTAINER ROLLBACK ERROR]', rollbackError)
      }
    }
    console.error('[SETUP CONTAINER ERROR]', error)
    return NextResponse.json({ error: 'Erro ao configurar a conta Corporate.' }, { status: 500 })
  }
}
