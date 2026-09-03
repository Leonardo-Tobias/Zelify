import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, requireCondominioRole } from '@/lib/serverAuth'

export async function POST(req: NextRequest) {
  try {
    const { condominioId } = await req.json()

    if (!condominioId) {
      return NextResponse.json({ error: 'condominioId é obrigatório.' }, { status: 400 })
    }

    const { admin: supabase } = await requireCondominioRole(req, condominioId)

    // Verifica se é uma instância corporate (tem parent)
    const { data: condo } = await supabase
      .from('condominios')
      .select('id, parent_condominio_id, nome, slug')
      .eq('id', condominioId)
      .single()

    if (!condo) {
      return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 404 })
    }

    if (!condo.parent_condominio_id && !condo.slug) {
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
    const authResponse = authErrorResponse(err)
    if (authResponse) return authResponse
    console.error('[EXCLUIR CONDOMINIO ERROR]', err)
    return NextResponse.json({ error: 'Erro ao excluir condomínio.' }, { status: 500 })
  }
}
