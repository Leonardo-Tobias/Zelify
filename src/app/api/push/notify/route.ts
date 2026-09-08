import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, requireCondominioRole } from '@/lib/serverAuth'
import { notifyResidentsOfOccurrenceUpdate, type OccurrencePushEvent } from '@/lib/pushNotifications'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const chamadoId = typeof body.chamadoId === 'string' ? body.chamadoId : ''
    const event: OccurrencePushEvent | null = body.event === 'status' || body.event === 'public_comment'
      ? body.event
      : null
    if (!chamadoId || !event) {
      return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })
    }

    const { admin } = await requireCondominioRole(req, body.condominioId || '', ['sindico', 'zelador', 'admin'])
    const { data: occurrence, error } = await admin
      .from('chamados')
      .select('id, condominio_id, tipo, bloco, apartamento, status, prioridade')
      .eq('id', chamadoId)
      .eq('condominio_id', body.condominioId)
      .maybeSingle()
    if (error) throw error
    if (!occurrence) return NextResponse.json({ error: 'Ocorrência não encontrada.' }, { status: 404 })

    const result = await notifyResidentsOfOccurrenceUpdate(admin, occurrence, event)
    return NextResponse.json(result)
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    if (error instanceof Error && error.message === 'VAPID_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'Notificações ainda não configuradas.' }, { status: 503 })
    }
    console.error('[PUSH NOTIFY]', error)
    return NextResponse.json({ error: 'Não foi possível enviar a notificação.' }, { status: 500 })
  }
}
