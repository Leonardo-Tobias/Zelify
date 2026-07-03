import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Rate limit: armazena tentativas por condominio_id + IP
const attemptStore = new Map<string, { count: number; until: number }>()

function getKey(condominioId: string, ip: string): string {
  return `${condominioId}:${ip}`
}

export async function POST(req: NextRequest) {
  try {
    const { condominioId, codigo } = await req.json()

    if (!condominioId || !codigo) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 })
    }

    // Rate limit check
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const key = getKey(condominioId, ip)
    const now = Date.now()
    const record = attemptStore.get(key)

    if (record && now < record.until) {
      const secondsLeft = Math.ceil((record.until - now) / 1000)
      return NextResponse.json({
        error: `Muitas tentativas. Aguarde ${secondsLeft}s.`,
        blocked: true,
        secondsLeft,
      }, { status: 429 })
    }

    // Validar via RPC (SECURITY DEFINER — não expõe o código)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase.rpc('validar_codigo_acesso', {
      p_condominio_id: condominioId,
      p_codigo: codigo,
    })

    if (error || data !== true) {
      // Incrementar contagem de tentativas
      const current = attemptStore.get(key)
      const newCount = (current?.count || 0) + 1

      if (newCount >= 5) {
        attemptStore.set(key, { count: newCount, until: now + 120000 }) // bloqueia 2min
        return NextResponse.json({
          error: 'Código inválido. Muitas tentativas — acesso bloqueado por 2 minutos.',
          blocked: true,
        }, { status: 429 })
      }

      attemptStore.set(key, { count: newCount, until: 0 })
      const remaining = 5 - newCount
      return NextResponse.json({
        error: `Código de acesso incorreto. ${remaining} tentativa${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`,
        valid: false,
        remaining,
      })
    }

    // Sucesso — resetar contagem
    attemptStore.delete(key)

    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error('[VALIDATE-ACESSO ERROR]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
