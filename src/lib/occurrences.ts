import type { Chamado } from '@/lib/db'

export const OCCURRENCE_CATEGORIES = [
  'Manutenção',
  'Elétrica',
  'Hidráulica',
  'Limpeza',
  'Portaria e segurança',
  'Elevadores',
  'Área comum',
  'Estrutura',
  'Compra ou reposição de material',
  'Outro',
] as const

export const REQUESTER_TYPES = [
  ['morador', 'Morador'],
  ['sindico', 'Síndico'],
  ['zelador', 'Zelador'],
  ['porteiro', 'Porteiro'],
  ['funcionario', 'Funcionário'],
  ['prestador_servico', 'Prestador de serviço'],
  ['conselheiro', 'Conselheiro'],
  ['outro', 'Outro'],
] as const

export const PRIORITIES = [
  ['baixa', 'Baixa'],
  ['normal', 'Normal'],
  ['alta', 'Alta'],
  ['urgente', 'Urgente'],
] as const

export type OccurrencePriority = typeof PRIORITIES[number][0]
export type RequesterType = typeof REQUESTER_TYPES[number][0]

export const STATUS_LABELS: Record<Chamado['status'], string> = {
  pendente: 'Recebida',
  em_execucao: 'Em andamento',
  resolvido: 'Concluída',
  encontrado: 'Encontrado',
  aguardando_retirada: 'Aguardando retirada',
  entregue: 'Entregue',
}

export function requesterLabel(value?: string | null) {
  return REQUESTER_TYPES.find(([id]) => id === value)?.[1] || 'Não informado'
}

export function priorityLabel(value?: string | null) {
  return PRIORITIES.find(([id]) => id === value)?.[1] || 'Normal'
}

export function occurrenceTitle(chamado: Pick<Chamado, 'titulo' | 'descricao'>) {
  if (chamado.titulo?.trim()) return chamado.titulo.trim()
  const text = chamado.descricao.trim()
  return text.length > 64 ? `${text.slice(0, 61).trim()}...` : text
}

export function formatOccurrenceAge(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000))
  if (minutes < 60) return `Aberta há ${Math.max(1, minutes)} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Aberta há ${hours}h`
  const days = Math.floor(hours / 24)
  return `Aberta há ${days}d`
}

export function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  const hours = Math.round(ms / 3_600_000)
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return days ? `${days}d ${rest}h` : `${Math.max(1, rest)}h`
}

export function averageResolutionTime(chamados: Chamado[]) {
  const completed = chamados
    .filter(item => item.completed_at)
    .map(item => new Date(item.completed_at!).getTime() - new Date(item.created_at).getTime())
    .filter(value => value > 0)
  return completed.length ? completed.reduce((sum, value) => sum + value, 0) / completed.length : 0
}

export function maskBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function isValidBrazilianPhone(value: string) {
  if (!value.trim()) return true
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11
}
