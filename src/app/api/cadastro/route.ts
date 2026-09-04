import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/serverAuth'

type CadastroBody = {
  nome?: string
  email?: string
  password?: string
  condominioNome?: string
  condominioSlug?: string
  codigoAcesso?: string
}

export async function POST(req: NextRequest) {
  let createdUserId: string | null = null
  let createdCondominioId: string | null = null
  let currentStage = 'validação dos dados'

  try {
    const body = await req.json() as CadastroBody
    const nome = body.nome?.trim() || ''
    const email = body.email?.trim().toLowerCase() || ''
    const password = body.password || ''
    const condominioNome = body.condominioNome?.trim() || ''
    const condominioSlug = body.condominioSlug?.trim().toLowerCase() || ''
    const codigoAcesso = body.codigoAcesso || ''

    if (!nome || !email || password.length < 6 || !condominioNome) {
      return NextResponse.json({ error: 'Dados de cadastro inválidos.' }, { status: 400 })
    }
    if (!/^[a-z0-9-]{1,80}$/.test(condominioSlug)) {
      return NextResponse.json({ error: 'Endereço do condomínio inválido.' }, { status: 400 })
    }
    if (!/^\d{4,8}$/.test(codigoAcesso)) {
      return NextResponse.json({ error: 'O código de acesso deve conter de 4 a 8 números.' }, { status: 400 })
    }

    currentStage = 'conexão com o banco'
    const admin = getSupabaseAdmin()
    currentStage = 'verificação do endereço'
    const { data: existingCondominio, error: slugError } = await admin
      .from('condominios')
      .select('id')
      .eq('slug', condominioSlug)
      .maybeSingle()

    if (slugError) throw new Error(slugError.message)
    if (existingCondominio) {
      return NextResponse.json({ error: 'Este endereço (slug) já está em uso por outro condomínio.' }, { status: 409 })
    }

    currentStage = 'criação do usuário'
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    })

    if (authError || !authData.user) {
      const message = authError?.message?.toLowerCase().includes('already')
        ? 'E-mail já cadastrado.'
        : authError?.message || 'Falha ao criar usuário.'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    createdUserId = authData.user.id

    currentStage = 'criação do condomínio'
    const { data: condominio, error: condominioError } = await admin
      .from('condominios')
      .insert({
        nome: condominioNome,
        slug: condominioSlug,
        codigo_acesso: codigoAcesso,
        created_by: createdUserId,
        plan_type: 'free',
        subscription_status: 'active',
      })
      .select()
      .single()

    if (condominioError || !condominio) {
      throw new Error(condominioError?.message || 'Falha ao criar condomínio.')
    }
    createdCondominioId = condominio.id

    currentStage = 'criação do perfil do gestor'
    const { data: gestor, error: gestorError } = await admin
      .from('usuarios_gestores')
      .insert({
        user_id: createdUserId,
        condominio_id: createdCondominioId,
        nome,
        papel: 'sindico',
      })
      .select()
      .single()

    if (gestorError || !gestor) {
      throw new Error(gestorError?.message || 'Falha ao criar perfil do gestor.')
    }

    return NextResponse.json({ gestor, condominio }, { status: 201 })
  } catch (error) {
    console.error('[CADASTRO ERROR]', error)

    try {
      const admin = getSupabaseAdmin()
      if (createdCondominioId) {
        await admin.from('condominios').delete().eq('id', createdCondominioId)
      }
      if (createdUserId) {
        await admin.auth.admin.deleteUser(createdUserId)
      }
    } catch (rollbackError) {
      console.error('[CADASTRO ROLLBACK ERROR]', rollbackError)
    }

    const message = error instanceof Error ? error.message : 'Erro inesperado.'
    return NextResponse.json(
      { error: `Falha na ${currentStage}: ${message}` },
      { status: 500 }
    )
  }
}
