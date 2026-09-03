import { NextRequest, NextResponse } from 'next/server'
import { getPixPaymentData } from '@/lib/asaas'
import { authErrorResponse, requireUser } from '@/lib/serverAuth'

export async function GET(req: NextRequest) {
  try {
    const subscriptionId = req.nextUrl.searchParams.get('subscriptionId')
    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId é obrigatório' }, { status: 400 })
    }

    const { admin, user } = await requireUser(req)
    const { data: condo, error: condoError } = await admin
      .from('condominios')
      .select('id')
      .eq('pending_subscription_id', subscriptionId)
      .maybeSingle()
    if (condoError) throw condoError
    if (!condo) return NextResponse.json({ error: 'Cobrança não encontrada.' }, { status: 404 })

    const { data: manager, error: managerError } = await admin
      .from('usuarios_gestores')
      .select('id')
      .eq('condominio_id', condo.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (managerError) throw managerError
    if (!manager) return NextResponse.json({ error: 'Cobrança não encontrada.' }, { status: 404 })

    const payment = await getPixPaymentData(subscriptionId)

    if (!payment) {
      return NextResponse.json({ qrCode: null, copyPaste: null })
    }

    return NextResponse.json({
      qrCode: payment.qrCode || null,
      copyPaste: payment.copyPaste || null,
      invoiceUrl: payment.invoiceUrl || null,
      status: payment.status,
    })
  } catch (err) {
    const authResponse = authErrorResponse(err)
    if (authResponse) return authResponse
    console.error('[PIX-POLL ERROR]', err)
    return NextResponse.json({ error: 'Erro ao consultar PIX' }, { status: 500 })
  }
}
