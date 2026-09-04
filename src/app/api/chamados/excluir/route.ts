import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, requireCondominioRole, requireUser } from '@/lib/serverAuth'
import { removeChamadoFile } from '@/lib/serverStorage'

export async function POST(req: NextRequest) {
  try {
    const { chamadoId } = await req.json()
    if (typeof chamadoId !== 'string' || !chamadoId) {
      return NextResponse.json({ error: 'Chamado inválido.' }, { status: 400 })
    }

    const { admin } = await requireUser(req)
    const { data: chamado, error: chamadoError } = await admin
      .from('chamados')
      .select('id, condominio_id, foto_url')
      .eq('id', chamadoId)
      .maybeSingle()
    if (chamadoError) throw chamadoError
    if (!chamado) return NextResponse.json({ error: 'Chamado não encontrado.' }, { status: 404 })

    const { admin: authorizedAdmin } = await requireCondominioRole(
      req,
      chamado.condominio_id,
      ['sindico', 'admin', 'zelador'],
    )
    await removeChamadoFile(authorizedAdmin, chamado.foto_url)
    const { error } = await authorizedAdmin.from('chamados').delete().eq('id', chamadoId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    console.error('[EXCLUIR CHAMADO ERROR]', error)
    return NextResponse.json({ error: 'Erro ao excluir chamado.' }, { status: 500 })
  }
}
