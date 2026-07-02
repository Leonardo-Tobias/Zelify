import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 401 })
    }

    const { data: gestor } = await supabase
      .from('usuarios_gestores')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: condominios } = await supabase
      .from('condominios')
      .select('*')
      .in('id', gestor ? [gestor.condominio_id] : [])

    const { data: chamados } = await supabase
      .from('chamados')
      .select('*')
      .in('condominio_id', condominios?.map(c => c.id) || [])

    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      gestor: gestor ? {
        id: gestor.id,
        nome: gestor.nome,
        papel: gestor.papel,
        condominio_id: gestor.condominio_id,
        created_at: gestor.created_at,
      } : null,
      condominios: (condominios || []).map(c => ({
        id: c.id,
        nome: c.nome,
        plan_type: c.plan_type,
        subscription_status: c.subscription_status,
        billing_type: c.billing_type,
        created_at: c.created_at,
      })),
      chamados: (chamados || []).map(c => ({
        id: c.id,
        tipo: c.tipo,
        descricao: c.descricao,
        bloco: c.bloco,
        apartamento: c.apartamento,
        status: c.status,
        created_at: c.created_at,
      })),
    }

    return NextResponse.json(exportData)
  } catch (err) {
    console.error('[DATA-EXPORT ERROR]', err)
    return NextResponse.json({ error: 'Erro ao exportar dados.' }, { status: 500 })
  }
}
