import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, requireUser } from '@/lib/serverAuth'
import { encryptAccessCode } from '@/lib/serverAccessCode'

export async function POST(req: NextRequest) {
  try {
    const { nome, slug, codigo_acesso } = await req.json()

    if (!nome || !slug || !codigo_acesso) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 })
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!cleanSlug) {
      return NextResponse.json({ error: 'Slug inválido.' }, { status: 400 })
    }

    const { admin: supabase, user } = await requireUser(req)

    // Buscar container corporate do usuário
    const { data: gestorRows } = await supabase
      .from('usuarios_gestores')
      .select('condominio_id, nome, papel')
      .eq('user_id', user.id)

    if (!gestorRows?.some(row => row.papel === 'sindico' || row.papel === 'admin')) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }

    const authorizedGestor = gestorRows.find(row => row.papel === 'sindico' || row.papel === 'admin')!
    const condoIds = gestorRows
      .filter(row => row.papel === 'sindico' || row.papel === 'admin')
      .map(row => row.condominio_id)

    const { data: condos } = await supabase
      .from('condominios')
      .select('*')
      .in('id', condoIds)

    const container = condos?.find(c => c.plan_type === 'corporate' && !c.parent_condominio_id && !c.slug)

    if (!container) {
      return NextResponse.json({ error: 'Nenhum plano Corporate ativo encontrado.' }, { status: 400 })
    }

    if (container.subscription_status !== 'active') {
      return NextResponse.json({ error: 'Assinatura Corporate inativa. Regularize o pagamento para criar novos condomínios.' }, { status: 400 })
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
        codigo_acesso_cifrado: encryptAccessCode(codigo_acesso),
        created_by: user.id,
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
        user_id: user.id,
        condominio_id: newCondo.id,
        nome: authorizedGestor.nome,
        papel: 'admin',
      })

    if (linkError) {
      console.error('[INSTANCIA LINK ERROR]', linkError)
      // Tenta desfazer a criação se o vínculo falhar
      await supabase.from('condominios').delete().eq('id', newCondo.id)
      return NextResponse.json({ error: `Erro ao vincular gestor: ${linkError.message}` }, { status: 500 })
    }

    const { codigo_acesso_cifrado: _encryptedCode, ...safeCondominio } = newCondo
    void _encryptedCode
    return NextResponse.json({ success: true, condominio: safeCondominio })
  } catch (err) {
    const authResponse = authErrorResponse(err)
    if (authResponse) return authResponse
    console.error('[INSTANCIA ERROR]', err)
    const message = err instanceof Error ? err.message : 'Erro ao criar condomínio.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
