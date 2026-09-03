import { NextRequest, NextResponse } from 'next/server'
import { getPortalBearerToken, verifyPortalSession } from '@/lib/portalSession'
import { getSupabaseAdmin } from '@/lib/serverAuth'

function getSession(req: NextRequest) {
  return verifyPortalSession(getPortalBearerToken(req.headers.get('authorization')))
}

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const [maintenanceResult, foundResult, countResult] = await Promise.all([
      admin.from('chamados').select('*')
        .eq('condominio_id', session.condominioId)
        .eq('tipo', 'manutencao')
        .eq('bloco', session.bloco)
        .eq('apartamento', session.apartamento),
      admin.from('chamados').select('*')
        .eq('condominio_id', session.condominioId)
        .eq('tipo', 'achado_perdido'),
      admin.from('chamados').select('*', { count: 'exact', head: true })
        .eq('condominio_id', session.condominioId)
        .gte('created_at', startOfMonth),
    ])

    if (maintenanceResult.error) throw maintenanceResult.error
    if (foundResult.error) throw foundResult.error
    if (countResult.error) throw countResult.error

    const chamados = [
      ...(maintenanceResult.data || []),
      ...(foundResult.data || []).map(item => ({ ...item, bloco: '', apartamento: '' })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ chamados, monthlyCount: countResult.count || 0 })
  } catch (error) {
    console.error('[PORTAL CHAMADOS GET ERROR]', error)
    return NextResponse.json({ error: 'Erro ao carregar chamados.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })

    const body = await req.json()
    const tipo = body.tipo === 'manutencao' || body.tipo === 'achado_perdido' ? body.tipo : null
    const local = typeof body.local === 'string' ? body.local.trim() : ''
    const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : ''
    const fotoUrl = typeof body.foto_url === 'string' ? body.foto_url : ''
    if (!tipo || !local || !descricao || local.length > 100 || descricao.length > 2000 || fotoUrl.length > 2048) {
      return NextResponse.json({ error: 'Dados do chamado inválidos.' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: condo, error: condoError } = await admin
      .from('condominios')
      .select('id, plan_type, subscription_status')
      .eq('id', session.condominioId)
      .single()
    if (condoError || !condo) return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })
    if (condo.subscription_status !== 'active') {
      return NextResponse.json({ error: 'Portal temporariamente suspenso.' }, { status: 403 })
    }

    if (condo.plan_type === 'free') {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { count, error: countError } = await admin.from('chamados')
        .select('*', { count: 'exact', head: true })
        .eq('condominio_id', session.condominioId)
        .gte('created_at', startOfMonth)
      if (countError) throw countError
      if ((count || 0) >= 15) {
        return NextResponse.json({ error: 'Limite mensal de chamados atingido.' }, { status: 403 })
      }
    }

    const timestamp = new Date().toISOString()
    const { data, error } = await admin.from('chamados').insert({
      condominio_id: session.condominioId,
      tipo,
      local,
      bloco: session.bloco,
      apartamento: session.apartamento,
      descricao,
      foto_url: fotoUrl || null,
      status: tipo === 'manutencao' ? 'pendente' : 'encontrado',
      created_at: timestamp,
      updated_at: timestamp,
    }).select().single()

    if (error) throw error
    return NextResponse.json({ chamado: data }, { status: 201 })
  } catch (error) {
    console.error('[PORTAL CHAMADOS POST ERROR]', error)
    return NextResponse.json({ error: 'Erro ao criar chamado.' }, { status: 500 })
  }
}
