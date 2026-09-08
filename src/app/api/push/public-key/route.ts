import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/pushNotifications'

export async function GET() {
  const publicKey = getVapidPublicKey()
  if (!publicKey) {
    return NextResponse.json({ error: 'Notificações ainda não configuradas.' }, { status: 503 })
  }
  return NextResponse.json({ publicKey })
}
