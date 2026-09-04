import { describe, expect, it } from 'vitest'
import { getChamadoStoragePath, isChamadoUrlForCondominio } from './serverStorage'

describe('serverStorage', () => {
  const url = 'https://projeto.supabase.co/storage/v1/object/public/chamados/condo-1/foto%20teste.webp?x=1'

  it('extrai o caminho de uma URL pública do bucket', () => {
    expect(getChamadoStoragePath(url)).toBe('condo-1/foto teste.webp')
  })

  it('aceita somente imagens da pasta do condomínio', () => {
    expect(isChamadoUrlForCondominio(url, 'condo-1')).toBe(true)
    expect(isChamadoUrlForCondominio(url, 'condo-2')).toBe(false)
    expect(isChamadoUrlForCondominio('https://example.com/foto.webp', 'condo-1')).toBe(false)
  })

  it('rejeita caminhos com tentativa de traversal', () => {
    expect(getChamadoStoragePath('https://x/storage/v1/object/public/chamados/../segredo')).toBeNull()
  })
})
