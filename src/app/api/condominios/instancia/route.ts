import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { nome, slug, codigo_acesso, userId, gestorNome } = await req.json()

    if (!nome || !slug || !codigo_acesso || !userId || !gestorNome) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 })
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!cleanSlug) {
      return NextResponse.json({ error: 'Slug inválido.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 })
    }

    // Buscar container corporate do usuário
    const { data: gestorRows } = await supabase
      .from('usuarios_gestores')
      .select('condominio_id')
      .eq('user_id', userId)

    if (!gestorRows?.length) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }

    const condoIds = gestorRows.map(r => r.condominio_id)

    const { data: condos } = await supabase
      .from('condominios')
      .select('*')
      .in('id', condoIds)

    const container = condos?.find(c => c.plan_type === 'corporate' && !c.parent_condominio_id && !c.slug)

    if (!container) {
      return NextResponse.json({ error: 'Nenhum plano Corporate ativo encontrado.' }, { status: 400 })
    }

    // Validar limite
    if (container.max_instances) {
      const { count } = await supabase
        .from('condominios')
        .select('*', { count: 'exact', head: true })
        .eq('parent_condominio_id', container.id)

      if (count !== null && count >= container.max_instances) {
        return NextResponse.json({
          error: `Limite de ${container.max_instances} condomínios atingido. Entre em contato para aumentar o limite.`,
        }, { status: 400 })
      }
    }

    // Validar slug único
    const { data: existing } = await supabase
      .from('condominios')
      .select('id')
      .eq('slug', cleanSlug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Este slug já está em uso.' }, { status: 400 })
    }

    // Criar instância
    const { data: newCondo, error: insertError } = await supabase
      .from('condominios')
      .insert({
        nome,
        slug: cleanSlug,
        codigo_acesso,
        plan_type: 'corporate',
        subscription_status: 'active',
        parent_condominio_id: container.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[INSTANCIA INSERT ERROR]', insertError)
      return NextResponse.json({ error: `Erro ao criar: ${insertError.message}` }, { status: 500 })
    }

    // Vincular gestor
    const { error: linkError } = await supabase
      .from('usuarios_gestores')
      .insert({
        user_id: userId,
        condominio_id: newCondo.id,
        nome: gestorNome,
        papel: 'admin',
      })

    if (linkError) {
      console.error('[INSTANCIA LINK ERROR]', linkError)
      // Tenta desfazer a criação se o vínculo falhar
      await supabase.from('condominios').delete().eq('id', newCondo.id)
      return NextResponse.json({ error: `Erro ao vincular gestor: ${linkError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, condominio: newCondo })
  } catch (err) {
    console.error('[INSTANCIA ERROR]', err)
    const message = err instanceof Error ? err.message : 'Erro ao criar condomínio.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
