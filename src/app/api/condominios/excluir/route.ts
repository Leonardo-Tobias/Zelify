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
    const { condominioId } = await req.json()

    if (!condominioId) {
      return NextResponse.json({ error: 'condominioId é obrigatório.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 })
    }

    // Verifica se é uma instância corporate (tem parent)
    const { data: condo } = await supabase
      .from('condominios')
      .select('id, parent_condominio_id, nome')
      .eq('id', condominioId)
      .single()

    if (!condo) {
      return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })
    }

    if (!condo.parent_condominio_id) {
      return NextResponse.json({ error: 'Não é possível excluir o container corporate.' }, { status: 400 })
    }

    // Remove vínculos dos gestores
    await supabase
      .from('usuarios_gestores')
      .delete()
      .eq('condominio_id', condominioId)

    // Remove chamados
    await supabase
      .from('chamados')
      .delete()
      .eq('condominio_id', condominioId)

    // Remove o condomínio
    await supabase
      .from('condominios')
      .delete()
      .eq('id', condominioId)

    return NextResponse.json({ success: true, nome: condo.nome })
  } catch (err) {
    console.error('[EXCLUIR CONDOMINIO ERROR]', err)
    return NextResponse.json({ error: 'Erro ao excluir condomínio.' }, { status: 500 })
  }
}
