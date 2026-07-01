import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/asaas'

export async function GET(req: NextRequest) {
  try {
    const subscriptionId = req.nextUrl.searchParams.get('subscriptionId')
    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId é obrigatório' }, { status: 400 })
    }

    const result = await api.listPaymentsBySubscription(subscriptionId)
    const payment = result.data?.[0]

    if (!payment) {
      return NextResponse.json({ qrCode: null, copyPaste: null })
    }

    return NextResponse.json({
      qrCode: payment.pixQrCode || null,
      copyPaste: payment.pixCopyPaste || null,
      invoiceUrl: payment.invoiceUrl || null,
      status: payment.status,
    })
  } catch (err) {
    console.error('[PIX-POLL ERROR]', err)
    return NextResponse.json({ error: 'Erro ao consultar PIX' }, { status: 500 })
  }
}
