import crypto from 'crypto'

export interface PortalSession {
  condominioId: string
  bloco: string
  apartamento: string
  exp: number
}

function getSecret(): string {
  const secret = process.env.PORTAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('PORTAL_SESSION_SECRET não configurado.')
  return secret
}

function sign(value: string): string {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url')
}

export function createPortalSession(
  payload: Omit<PortalSession, 'exp'>,
  durationSeconds = 8 * 60 * 60,
): string {
  const encoded = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + durationSeconds,
  })).toString('base64url')

  return `${encoded}.${sign(encoded)}`
}

export function verifyPortalSession(token: string | null): PortalSession | null {
  if (!token) return null
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null

  const expected = sign(encoded)
  const receivedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) return null

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PortalSession
    if (
      !payload.condominioId ||
      !payload.bloco ||
      !payload.apartamento ||
      !payload.exp ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) return null
    return payload
  } catch {
    return null
  }
}

export function getPortalBearerToken(authorization: string | null): string | null {
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1] || null
}
