import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, requireCondominioRole } from '@/lib/serverAuth'
import { decryptAccessCode, encryptAccessCode } from '@/lib/serverAccessCode'

type SettingsBody = {
  condominioId?: string
  nome?: string
  slug?: string
  codigoAcesso?: string
  identificacaoOcorrencias?: 'anonima' | 'opcional' | 'obrigatoria'
}

function safeCondominio<T extends Record<string, unknown>>(condominio: T) {
  const { codigo_acesso_cifrado: _encrypted, ...safe } = condominio
  void _encrypted
  return safe
}

export async function GET(req: NextRequest) {
  try {
    const condominioId = req.nextUrl.searchParams.get('id') || ''
    if (!condominioId) {
      return NextResponse.json({ error: 'Condomínio não informado.' }, { status: 400 })
    }

    const { admin } = await requireCondominioRole(req, condominioId)
    const { data, error } = await admin
      .from('condominios')
      .select('codigo_acesso_cifrado')
      .eq('id', condominioId)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })

    return NextResponse.json({ codigoAcesso: decryptAccessCode(data.codigo_acesso_cifrado) })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    console.error('[CONFIGURACOES GET ERROR]', error)
    return NextResponse.json({ error: 'Não foi possível carregar o código de acesso.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as SettingsBody
    const condominioId = body.condominioId || ''
    const nome = body.nome?.trim() || ''
    const slug = body.slug?.trim().toLowerCase() || ''
    const codigoAcesso = body.codigoAcesso?.trim() || ''
    const identificacao = body.identificacaoOcorrencias || 'opcional'

    if (!condominioId || !nome || !/^[a-z0-9-]{1,80}$/.test(slug)) {
      return NextResponse.json({ error: 'Dados das configurações inválidos.' }, { status: 400 })
    }
    if (!/^\d{4,8}$/.test(codigoAcesso)) {
      return NextResponse.json({ error: 'O código de acesso deve conter de 4 a 8 números.' }, { status: 400 })
    }
    if (!['anonima', 'opcional', 'obrigatoria'].includes(identificacao)) {
      return NextResponse.json({ error: 'Configuração de identificação inválida.' }, { status: 400 })
    }

    const { admin } = await requireCondominioRole(req, condominioId)
    const { data, error } = await admin
      .from('condominios')
      .update({
        nome,
        slug,
        codigo_acesso: codigoAcesso,
        codigo_acesso_cifrado: encryptAccessCode(codigoAcesso),
        identificacao_ocorrencias: identificacao,
      })
      .eq('id', condominioId)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })

    return NextResponse.json({
      condominio: { ...safeCondominio(data), codigo_acesso: codigoAcesso },
    })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    console.error('[CONFIGURACOES PATCH ERROR]', error)
    return NextResponse.json({ error: 'Não foi possível salvar as configurações.' }, { status: 500 })
  }
}
