import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, requireCondominioRole } from '@/lib/serverAuth'
import { removeCondominioFiles } from '@/lib/serverStorage'

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

    // Remove as imagens antes dos registros para não deixar dados pessoais órfãos.
    await removeCondominioFiles(supabase, [condominioId])

    const { error: managersError } = await supabase
      .from('usuarios_gestores')
      .delete()
      .eq('condominio_id', condominioId)
    if (managersError) throw managersError

    // Remove chamados
    const { error: chamadosError } = await supabase
      .from('chamados')
      .delete()
      .eq('condominio_id', condominioId)
    if (chamadosError) throw chamadosError

    // Remove o condomínio
    const { error: condoError } = await supabase
      .from('condominios')
      .delete()
      .eq('id', condominioId)
    if (condoError) throw condoError

    return NextResponse.json({ success: true, nome: condo.nome })
  } catch (err) {
    const authResponse = authErrorResponse(err)
    if (authResponse) return authResponse
    console.error('[EXCLUIR CONDOMINIO ERROR]', err)
    return NextResponse.json({ error: 'Erro ao excluir condomínio.' }, { status: 500 })
  }
}
