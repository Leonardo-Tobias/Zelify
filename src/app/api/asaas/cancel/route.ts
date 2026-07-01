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
      .select('asaas_subscription_id, plan_type')
      .eq('id', condominioId)
      .single()

    if (!condo) {
      return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })
    }

    if (condo.plan_type === 'free') {
      return NextResponse.json({ error: 'Condomínio já está no plano gratuito.' }, { status: 400 })
    }

    // Cancelar assinatura no Asaas
    if (condo.asaas_subscription_id) {
      try {
        await cancelAsaasSubscription(condo.asaas_subscription_id)
        console.log('[CANCEL] Assinatura cancelada no Asaas:', condo.asaas_subscription_id)
      } catch (err) {
        console.warn('[CANCEL] Erro ao cancelar no Asaas (pode já estar cancelado):', err)
      }
    }

    // Resetar para plano free no banco
    await supabase
      .from('condominios')
      .update({
        plan_type: 'free',
        subscription_status: 'active',
        billing_type: null,
        current_period_end: null,
        asaas_customer_id: null,
        asaas_subscription_id: null,
      })
      .eq('id', condominioId)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao cancelar assinatura'
    console.error('[CANCEL ERROR]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
