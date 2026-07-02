import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cancelAsaasSubscription } from '@/lib/asaas'

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
    const { condominioId } = await req.json()

    if (!condominioId) {
      return NextResponse.json({ error: 'condominioId é obrigatório.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Sem permissão do servidor.' }, { status: 500 })
    }

    // Buscar dados do condomínio
    const { data: condo } = await supabase
      .from('condominios')
      .select('id, asaas_subscription_id, plan_type, parent_condominio_id, slug')
      .eq('id', condominioId)
      .single()

    if (!condo) {
      return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })
    }

    if (condo.plan_type === 'free') {
      return NextResponse.json({ error: 'Condomínio já está no plano gratuito.' }, { status: 400 })
    }

    // Encontrar o container (se for instância, sobe pra ele)
    let containerId = condominioId
    if (condo.parent_condominio_id) {
      containerId = condo.parent_condominio_id
    }

    const { data: container } = await supabase
      .from('condominios')
      .select('id, asaas_subscription_id')
      .eq('id', containerId)
      .single()

    // Cancelar assinatura no Asaas
    if (container?.asaas_subscription_id) {
      try {
        await cancelAsaasSubscription(container.asaas_subscription_id)
        console.log('[CANCEL] Assinatura cancelada no Asaas:', container.asaas_subscription_id)
      } catch (err) {
        console.warn('[CANCEL] Erro ao cancelar no Asaas (pode já estar cancelado):', err)
      }
    }

    // Se for container corporate, resetar todas as instâncias + container
    if (!condo.parent_condominio_id && !condo.slug) {
      // É o container corporate — resetar todas as instâncias
      const { data: instances } = await supabase
        .from('condominios')
        .select('id')
        .eq('parent_condominio_id', containerId)

      for (const inst of instances || []) {
        await supabase
          .from('condominios')
          .update({
            plan_type: 'free',
            subscription_status: 'active',
            billing_type: null,
            current_period_end: null,
            parent_condominio_id: null,
          })
          .eq('id', inst.id)
      }

      // Remover vínculo do gestor com o container
      await supabase
        .from('usuarios_gestores')
        .delete()
        .eq('condominio_id', containerId)

      // Resetar container
      await supabase
        .from('condominios')
        .delete()
        .eq('id', containerId)
    } else {
      // É um condomínio normal ou instância — só reseta ele
      await supabase
        .from('condominios')
        .update({
          plan_type: 'free',
          subscription_status: 'active',
          billing_type: null,
          current_period_end: null,
          asaas_customer_id: null,
          asaas_subscription_id: null,
          parent_condominio_id: null,
        })
        .eq('id', condominioId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao cancelar assinatura'
    console.error('[CANCEL ERROR]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
