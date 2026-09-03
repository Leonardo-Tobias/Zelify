import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPortalBearerToken, verifyPortalSession } from '@/lib/portalSession'
import { getSupabaseAdmin } from '@/lib/serverAuth'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(req: NextRequest) {
  try {
    const session = verifyPortalSession(getPortalBearerToken(req.headers.get('authorization')))
    if (!session) return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })

    const { dataUrl } = await req.json()
    if (typeof dataUrl !== 'string' || dataUrl.length > MAX_IMAGE_BYTES * 1.5) {
      return NextResponse.json({ error: 'Imagem inválida ou muito grande.' }, { status: 400 })
    }

    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
    if (!match || !ALLOWED_TYPES.has(match[1])) {
      return NextResponse.json({ error: 'Formato de imagem não permitido.' }, { status: 400 })
    }

    const buffer = Buffer.from(match[2], 'base64')
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Imagem inválida ou muito grande.' }, { status: 400 })
    }

    const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1]
    const path = `${session.condominioId}/${crypto.randomUUID()}.${extension}`
    const admin = getSupabaseAdmin()
    const { error } = await admin.storage.from('chamados').upload(path, buffer, {
      contentType: match[1],
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error

    const { data } = admin.storage.from('chamados').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (error) {
    console.error('[PORTAL UPLOAD ERROR]', error)
    return NextResponse.json({ error: 'Erro ao enviar imagem.' }, { status: 500 })
  }
}
