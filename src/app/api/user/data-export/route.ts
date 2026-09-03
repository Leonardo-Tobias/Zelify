import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, requireUser } from '@/lib/serverAuth'

export async function GET(req: NextRequest) {
  try {
    const { admin: supabase, user } = await requireUser(req)

    const { data: gestores } = await supabase
      .from('usuarios_gestores')
      .select('*')
      .eq('user_id', user.id)

    const { data: condominios } = await supabase
      .from('condominios')
      .select('*')
      .in('id', gestores?.map(gestor => gestor.condominio_id) || [])

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
      gestores: (gestores || []).map(gestor => ({
        id: gestor.id,
        nome: gestor.nome,
        papel: gestor.papel,
        condominio_id: gestor.condominio_id,
        created_at: gestor.created_at,
      })),
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
    const authResponse = authErrorResponse(err)
    if (authResponse) return authResponse
    console.error('[DATA-EXPORT ERROR]', err)
    return NextResponse.json({ error: 'Erro ao exportar dados.' }, { status: 500 })
  }
}
