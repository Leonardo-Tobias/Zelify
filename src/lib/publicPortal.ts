const PUBLIC_CHAMADO_FIELDS = [
  'id',
  'tipo',
  'local',
  'bloco',
  'apartamento',
  'descricao',
  'titulo',
  'categoria',
  'categoria_outro',
  'prioridade',
  'foto_url',
  'status',
  'created_at',
  'updated_at',
  'completed_at',
] as const

type DatabaseRow = Record<string, unknown>

export function toPublicChamado(row: DatabaseRow, hideUnit = false) {
  const publicRow: DatabaseRow = {}
  for (const field of PUBLIC_CHAMADO_FIELDS) publicRow[field] = row[field]

  if (hideUnit) {
    publicRow.bloco = ''
    publicRow.apartamento = ''
  }

  return publicRow
}

export function toPublicHistory(row: DatabaseRow) {
  return {
    chamado_id: row.chamado_id,
    descricao: row.descricao,
    created_at: row.created_at,
  }
}

export function toPublicComment(row: DatabaseRow) {
  return {
    chamado_id: row.chamado_id,
    conteudo: row.conteudo,
    created_at: row.created_at,
  }
}
