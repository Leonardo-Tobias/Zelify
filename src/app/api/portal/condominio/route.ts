import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/serverAuth'

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase() || ''
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
      return NextResponse.json({ error: 'Slug inválido.' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('condominios')
      .select('id, nome, slug, plan_type, subscription_status, current_period_end, identificacao_ocorrencias, created_at')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })

    return NextResponse.json({ condominio: data })
  } catch (error) {
    console.error('[PORTAL CONDOMINIO ERROR]', error)
    return NextResponse.json({ error: 'Erro ao carregar condomínio.' }, { status: 500 })
  }
}
