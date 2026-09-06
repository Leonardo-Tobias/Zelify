import { NextRequest, NextResponse } from 'next/server'
import { getPortalBearerToken, verifyPortalSession } from '@/lib/portalSession'
import { getSupabaseAdmin } from '@/lib/serverAuth'
import { isChamadoUrlForCondominio, removeChamadoFile } from '@/lib/serverStorage'
import { toPublicChamado, toPublicComment, toPublicHistory } from '@/lib/publicPortal'

const PUBLIC_CHAMADO_SELECT = 'id, tipo, local, bloco, apartamento, descricao, titulo, categoria, categoria_outro, prioridade, foto_url, status, created_at, updated_at, completed_at'

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
      admin.from('chamados').select(PUBLIC_CHAMADO_SELECT)
        .eq('condominio_id', session.condominioId)
        .eq('tipo', 'manutencao')
        .eq('bloco', session.bloco)
        .eq('apartamento', session.apartamento),
      admin.from('chamados').select(PUBLIC_CHAMADO_SELECT)
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
      ...(maintenanceResult.data || []).map(item => toPublicChamado(item)),
      ...(foundResult.data || []).map(item => toPublicChamado(item, true)),
    ].sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())

    const ids = chamados.map(item => item.id)
    let historico: unknown[] = []
    let comentarios: unknown[] = []
    if (ids.length) {
      const [historyResult, commentsResult] = await Promise.all([
        admin.from('ocorrencia_historico').select('chamado_id, descricao, created_at').in('chamado_id', ids).eq('visibilidade', 'publico').order('created_at'),
        admin.from('ocorrencia_comentarios').select('chamado_id, conteudo, created_at').in('chamado_id', ids).eq('visibilidade', 'publico').order('created_at'),
      ])
      if (!historyResult.error) historico = (historyResult.data || []).map(item => toPublicHistory(item))
      if (!commentsResult.error) comentarios = (commentsResult.data || []).map(item => toPublicComment(item))
    }

    return NextResponse.json({ chamados, monthlyCount: countResult.count || 0, historico, comentarios })
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
    const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
    const categoria = typeof body.categoria === 'string' ? body.categoria.trim() : ''
    const categoriaOutro = typeof body.categoria_outro === 'string' ? body.categoria_outro.trim() : ''
    const prioridade = ['baixa', 'normal', 'alta', 'urgente'].includes(body.prioridade) ? body.prioridade : 'normal'
    const requesterTypes = ['morador', 'sindico', 'zelador', 'porteiro', 'funcionario', 'prestador_servico', 'conselheiro', 'outro']
    const solicitanteTipo = requesterTypes.includes(body.solicitante_tipo) ? body.solicitante_tipo : 'morador'
    const solicitanteTipoOutro = typeof body.solicitante_tipo_outro === 'string' ? body.solicitante_tipo_outro.trim() : ''
    const solicitanteNome = typeof body.solicitante_nome === 'string' ? body.solicitante_nome.trim() : ''
    const solicitanteWhatsapp = typeof body.solicitante_whatsapp === 'string' ? body.solicitante_whatsapp.trim() : ''
    const whatsappDigits = solicitanteWhatsapp.replace(/\D/g, '')
    const anonimo = body.anonimo !== false
    const fotoUrl = typeof body.foto_url === 'string' ? body.foto_url : ''
    if (!tipo || !local || !descricao || (tipo === 'manutencao' && (!titulo || !categoria)) ||
      local.length > 100 || titulo.length > 120 || categoria.length > 100 || descricao.length > 2000 ||
      solicitanteNome.length > 120 || (!anonimo && !!solicitanteWhatsapp && ![10, 11].includes(whatsappDigits.length)) || fotoUrl.length > 2048) {
      return NextResponse.json({ error: 'Dados do chamado inválidos.' }, { status: 400 })
    }
    if (fotoUrl && !isChamadoUrlForCondominio(fotoUrl, session.condominioId)) {
      return NextResponse.json({ error: 'Endereço da imagem inválido.' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: atomicChamado, error: atomicError } = await admin.rpc('criar_chamado_portal', {
      p_condominio_id: session.condominioId,
      p_tipo: tipo,
      p_local: local,
      p_bloco: session.bloco,
      p_apartamento: session.apartamento,
      p_descricao: descricao,
      p_foto_url: fotoUrl || null,
      p_titulo: titulo || descricao.slice(0, 120),
      p_categoria: categoria || (tipo === 'manutencao' ? 'Manutenção' : 'Outro'),
      p_categoria_outro: categoriaOutro || null,
      p_prioridade: prioridade,
      p_solicitante_tipo: solicitanteTipo,
      p_solicitante_tipo_outro: solicitanteTipoOutro || null,
      p_solicitante_nome: anonimo ? null : solicitanteNome || null,
      p_solicitante_whatsapp: anonimo ? null : solicitanteWhatsapp || null,
      p_anonimo: anonimo,
    })
    const rpcUnavailable = atomicError?.code === 'PGRST202' || atomicError?.code === '42883'
    if (!rpcUnavailable) {
      if (atomicError) {
        if (fotoUrl) await removeChamadoFile(admin, fotoUrl).catch(cleanupError => console.error('[PORTAL IMAGE CLEANUP]', cleanupError))
        if (atomicError.message.includes('PORTAL_SUSPENSO')) {
          return NextResponse.json({ error: 'Portal temporariamente suspenso.' }, { status: 403 })
        }
        if (atomicError.message.includes('LIMITE_MENSAL')) {
          return NextResponse.json({ error: 'Limite mensal de chamados atingido.' }, { status: 403 })
        }
        if (atomicError.message.includes('CONDOMINIO_NAO_ENCONTRADO')) {
          return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })
        }
        if (atomicError.message.includes('IDENTIFICACAO_OBRIGATORIA')) {
          return NextResponse.json({ error: 'Este condomínio exige a identificação do solicitante.' }, { status: 400 })
        }
        throw atomicError
      }
      return NextResponse.json({ chamado: atomicChamado }, { status: 201 })
    }

    console.warn('[PORTAL CHAMADOS] Migration de criação atômica ainda não aplicada.')
    const { data: condo, error: condoError } = await admin
      .from('condominios')
      .select('id, plan_type, subscription_status')
      .eq('id', session.condominioId)
      .single()
    if (condoError || !condo) return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })
    if (condo.subscription_status !== 'active') {
      if (fotoUrl) await removeChamadoFile(admin, fotoUrl).catch(cleanupError => console.error('[PORTAL IMAGE CLEANUP]', cleanupError))
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
        if (fotoUrl) await removeChamadoFile(admin, fotoUrl).catch(cleanupError => console.error('[PORTAL IMAGE CLEANUP]', cleanupError))
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
      titulo: titulo || descricao.slice(0, 120),
      categoria: categoria || (tipo === 'manutencao' ? 'Manutenção' : 'Outro'),
      categoria_outro: categoriaOutro || null,
      prioridade,
      solicitante_tipo: solicitanteTipo,
      solicitante_tipo_outro: solicitanteTipoOutro || null,
      solicitante_nome: anonimo ? null : solicitanteNome || null,
      solicitante_whatsapp: anonimo ? null : solicitanteWhatsapp || null,
      anonimo,
      foto_url: fotoUrl || null,
      status: tipo === 'manutencao' ? 'pendente' : 'encontrado',
      created_at: timestamp,
      updated_at: timestamp,
    }).select().single()

    if (error) {
      if (fotoUrl) {
        try { await removeChamadoFile(admin, fotoUrl) } catch (cleanupError) {
          console.error('[PORTAL CHAMADO IMAGE ROLLBACK ERROR]', cleanupError)
        }
      }
      throw error
    }
    return NextResponse.json({ chamado: data }, { status: 201 })
  } catch (error) {
    console.error('[PORTAL CHAMADOS POST ERROR]', error)
    return NextResponse.json({ error: 'Erro ao criar chamado.' }, { status: 500 })
  }
}
