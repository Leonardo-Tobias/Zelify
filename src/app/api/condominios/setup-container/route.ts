import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const { condominioId, maxInstances } = await req.json()

    if (!condominioId) {
      return NextResponse.json({ error: 'condominioId é obrigatório.' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verificar se o condomínio existe e é corporate
    const { data: condo } = await supabase
      .from('condominios')
      .select('id, plan_type, slug, parent_condominio_id')
      .eq('id', condominioId)
      .single()

    if (!condo) {
      return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })
    }

    if (condo.plan_type !== 'corporate') {
      return NextResponse.json({ error: 'Apenas condomínios corporate podem ser containers.' }, { status: 400 })
    }

    if (condo.parent_condominio_id) {
      return NextResponse.json({ error: 'Este condomínio já é uma instância.' }, { status: 400 })
    }

    if (!condo.slug) {
      return NextResponse.json({ error: 'Este condomínio já é um container.' }, { status: 400 })
    }

    // Converter para container: limpar slug e codigo_acesso
    const { error: updateError } = await supabase
      .from('condominios')
      .update({
        slug: null,
        codigo_acesso: null,
        max_instances: maxInstances || 10,
      })
      .eq('id', condominioId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, message: 'Container criado com sucesso.' })
  } catch (err) {
    console.error('[SETUP CONTAINER ERROR]', err)
    return NextResponse.json({ error: 'Erro ao configurar container.' }, { status: 500 })
  }
}
