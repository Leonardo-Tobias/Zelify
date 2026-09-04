import { describe, expect, it } from 'vitest'
import { averageResolutionTime, maskBrazilianPhone, occurrenceTitle } from './occurrences'
import type { Chamado } from './db'

const base: Chamado = {
  id: '1', condominio_id: 'c1', tipo: 'manutencao', local: 'Hall', bloco: 'A',
  apartamento: '10', descricao: 'Lâmpada queimada no corredor', status: 'resolvido',
  created_at: '2026-09-01T10:00:00.000Z', updated_at: '2026-09-02T16:00:00.000Z',
  completed_at: '2026-09-02T16:00:00.000Z',
}

describe('occurrences', () => {
  it('formata WhatsApp brasileiro sem exceder onze dígitos', () => {
    expect(maskBrazilianPhone('11987654321')).toBe('(11) 98765-4321')
    expect(maskBrazilianPhone('1198765432199')).toBe('(11) 98765-4321')
  })

  it('prioriza o título salvo e mantém fallback compatível', () => {
    expect(occurrenceTitle({ ...base, titulo: 'Luz do hall' })).toBe('Luz do hall')
    expect(occurrenceTitle(base)).toBe(base.descricao)
  })

  it('calcula tempo médio somente com ocorrências concluídas', () => {
    expect(averageResolutionTime([base])).toBe(30 * 60 * 60 * 1000)
    expect(averageResolutionTime([{ ...base, completed_at: null }])).toBe(0)
  })
})
