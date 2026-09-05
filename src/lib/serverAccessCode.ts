import crypto from 'crypto'

const VERSION = 'v1'

function getEncryptionKey(): Buffer {
  const secret = process.env.PORTAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Servidor sem chave para proteger o código de acesso.')
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptAccessCode(code: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':')
}

export function decryptAccessCode(value: string | null | undefined): string | null {
  if (!value) return null

  const [version, ivValue, tagValue, ciphertextValue] = value.split(':')
  if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error('Código de acesso armazenado em formato inválido.')
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ])

  return plaintext.toString('utf8')
}
