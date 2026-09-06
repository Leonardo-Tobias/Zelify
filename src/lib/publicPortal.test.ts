import { describe, expect, it } from 'vitest'
import { toPublicChamado, toPublicComment, toPublicHistory } from './publicPortal'

describe('serialização segura do portal público', () => {
  it('remove dados pessoais e administrativos do chamado', () => {
    const result = toPublicChamado({
      id: 'chamado-1',
      tipo: 'manutencao',
      descricao: 'Lâmpada queimada',
      bloco: 'A',
      apartamento: '101',
      solicitante_nome: 'Maria',
      solicitante_whatsapp: '11999999999',
      solicitante_tipo: 'morador',
      responsavel: 'Prestador X',
      condominio_id: 'condo-1',
    })

    expect(result).toMatchObject({ id: 'chamado-1', descricao: 'Lâmpada queimada' })
    expect(result).not.toHaveProperty('solicitante_nome')
    expect(result).not.toHaveProperty('solicitante_whatsapp')
    expect(result).not.toHaveProperty('responsavel')
    expect(result).not.toHaveProperty('condominio_id')
  })

  it('oculta a unidade no mural de achados e perdidos', () => {
    expect(toPublicChamado({ bloco: 'B', apartamento: '202' }, true)).toMatchObject({
      bloco: '',
      apartamento: '',
    })
  })

  it('remove autor e identificadores internos das atualizações públicas', () => {
    const history = toPublicHistory({ chamado_id: '1', descricao: 'Atualizado', created_at: 'agora', autor_id: 'user-1' })
    const comment = toPublicComment({ chamado_id: '1', conteudo: 'Em análise', created_at: 'agora', autor_nome: 'Admin' })

    expect(history).not.toHaveProperty('autor_id')
    expect(comment).not.toHaveProperty('autor_nome')
  })
})
