import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/serverAuth'
import { createPortalSession } from '@/lib/portalSession'

interface AccessResult {
  valid: boolean
  blocked?: boolean
  remaining?: number
  retry_after?: number
}

export async function POST(req: NextRequest) {
  try {
    const { condominioId, codigo, bloco, apartamento } = await req.json()
    if (
      typeof condominioId !== 'string' ||
      typeof codigo !== 'string' ||
      typeof bloco !== 'string' ||
      typeof apartamento !== 'string' ||
      !/^[0-9]{4,8}$/.test(codigo) ||
      !bloco.trim() ||
      !apartamento.trim() ||
      bloco.length > 40 ||
      apartamento.length > 20
    ) {
      return NextResponse.json({ error: 'Dados de acesso inválidos.' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rateLimitSecret = process.env.PORTAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const ipHash = crypto.createHmac('sha256', rateLimitSecret).update(ip).digest('hex')
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('validar_acesso_portal', {
      p_condominio_id: condominioId,
      p_codigo: codigo,
      p_ip_hash: ipHash,
    })

    if (error) throw error
    const result = data as AccessResult
    if (result.blocked) {
      return NextResponse.json({
        error: `Muitas tentativas. Aguarde ${result.retry_after || 120}s.`,
        blocked: true,
        secondsLeft: result.retry_after || 120,
      }, { status: 429 })
    }
    if (!result.valid) {
      return NextResponse.json({
        error: `Código de acesso incorreto. ${result.remaining || 0} tentativa(s) restante(s).`,
        valid: false,
        remaining: result.remaining || 0,
      }, { status: 401 })
    }

    const token = createPortalSession({
      condominioId,
      bloco: bloco.trim(),
      apartamento: apartamento.trim(),
    })

    return NextResponse.json({ valid: true, token, expiresIn: 8 * 60 * 60 })
  } catch (error) {
    console.error('[VALIDATE-ACESSO ERROR]', error)
    return NextResponse.json({ error: 'Não foi possível validar o acesso.' }, { status: 500 })
  }
}
