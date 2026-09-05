import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/serverAuth'
import { encryptAccessCode } from '@/lib/serverAccessCode'

type CadastroBody = {
  nome?: string
  email?: string
  password?: string
  condominioNome?: string
  condominioSlug?: string
  codigoAcesso?: string
  aceiteTermos?: boolean
}

async function checkCadastroRateLimit(req: NextRequest, admin: ReturnType<typeof getSupabaseAdmin>) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || req.headers.get('x-real-ip') || 'unknown'
  const secret = process.env.PORTAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'zelcon'
  const ipHash = crypto.createHmac('sha256', secret).update(ip).digest('hex')
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data, error } = await admin
    .from('cadastro_attempts')
    .select('attempts, window_started')
    .eq('ip_hash', ipHash)
    .maybeSingle()
  if (error) {
    // Mantém compatibilidade durante o intervalo entre deploy e aplicação da migration.
    if (error.code === '42P01' || error.code === 'PGRST205') {
      console.warn('[CADASTRO] Migration de rate limit ainda não aplicada.')
      return { allowed: true, ipHash }
    }
    throw error
  }

  const inCurrentWindow = data?.window_started && data.window_started >= windowStart
  const attempts = inCurrentWindow ? Number(data.attempts) + 1 : 1
  const windowStarted = inCurrentWindow ? data.window_started : new Date().toISOString()
  const { error: upsertError } = await admin.from('cadastro_attempts').upsert({
    ip_hash: ipHash,
    attempts,
    window_started: windowStarted,
    updated_at: new Date().toISOString(),
  })
  if (upsertError) throw upsertError
  return { allowed: attempts <= 5, ipHash }
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

    if (!nome || !email || password.length < 6 || !condominioNome || body.aceiteTermos !== true) {
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
    const rateLimit = await checkCadastroRateLimit(req, admin)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas de cadastro. Aguarde uma hora e tente novamente.' },
        { status: 429 },
      )
    }
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
        codigo_acesso_cifrado: encryptAccessCode(codigoAcesso),
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

    const { error: consentError } = await admin.from('consentimentos').insert({
      user_id: createdUserId,
      terms_version: '2026-09-04',
      privacy_version: '2026-09-04',
      ip_hash: rateLimit.ipHash,
    })
    if (consentError && consentError.code !== '42P01' && consentError.code !== 'PGRST205') {
      throw consentError
    }
    if (consentError) console.warn('[CADASTRO] Migration de consentimento ainda não aplicada.')

    const { codigo_acesso_cifrado: _encryptedCode, ...condominioWithoutEncryptedCode } = condominio
    void _encryptedCode
    const safeCondominio = { ...condominioWithoutEncryptedCode, codigo_acesso: undefined }
    return NextResponse.json({ gestor, condominio: safeCondominio }, { status: 201 })
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

    return NextResponse.json(
      { error: `Não foi possível concluir o cadastro durante a ${currentStage}. Tente novamente.` },
      { status: 500 }
    )
  }
}
