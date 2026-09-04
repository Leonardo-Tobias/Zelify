import { describe, expect, it } from 'vitest'
import { hasValidImageSignature } from '../../../../lib/serverImage'

describe('assinatura de imagens', () => {
  it('reconhece JPEG, PNG e WebP reais', () => {
    expect(hasValidImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg')).toBe(true)
    expect(hasValidImageSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png')).toBe(true)
    expect(hasValidImageSignature(Buffer.from('RIFF1234WEBP'), 'image/webp')).toBe(true)
  })

  it('não confia apenas no MIME declarado', () => {
    expect(hasValidImageSignature(Buffer.from('conteudo falso'), 'image/png')).toBe(false)
  })
})
