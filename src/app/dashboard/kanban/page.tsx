'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import NextImage from 'next/image'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, ExternalLink, ImageIcon, Lock, MapPin, MessageSquare, Search, Trash2, UserRound, Wrench, X } from 'lucide-react'
import { db, Chamado, OcorrenciaComentario, OcorrenciaHistorico } from '@/lib/db'
import { useCondominio } from '@/contexts/CondominioContext'
import { OCCURRENCE_CATEGORIES, PRIORITIES, STATUS_LABELS, formatOccurrenceAge, occurrenceTitle, priorityLabel, requesterLabel } from '@/lib/occurrences'
import { FilterSelect } from '@/components/FilterSelect'

type StatusType = 'pendente' | 'em_execucao' | 'resolvido'
const columns: Array<{ title: string; status: StatusType; color: string; icon: typeof Clock }> = [
  { title: 'Recebidas', status: 'pendente', color: 'border-t-amber-500', icon: Clock },
  { title: 'Em andamento', status: 'em_execucao', color: 'border-t-brand', icon: Wrench },
  { title: 'Concluídas', status: 'resolvido', color: 'border-t-emerald-500', icon: CheckCircle2 },
]

const categoryOptions = [
  { value: 'todas', label: 'Todas as categorias' },
  ...OCCURRENCE_CATEGORIES.map(value => ({ value, label: value })),
]

const priorityOptions = [
  { value: 'todas', label: 'Todas as prioridades' },
  ...PRIORITIES.map(([value, label]) => ({ value, label })),
]

function PriorityBadge({ value }: { value?: Chamado['prioridade'] }) {
  const style = value === 'urgente' ? 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30' : value === 'alta' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-zinc-100 dark:bg-white/[0.03] text-zinc-500 border-zinc-200 dark:border-white/[0.07]'
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${style}`}>{priorityLabel(value)}</span>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><span className="text-[11px] text-zinc-500 font-medium">{label}</span><p className="font-medium text-zinc-800 dark:text-zinc-300 mt-1 break-words">{value}</p></div>
}

export default function KanbanPage() {
  const { condominio } = useCondominio()
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Chamado | null>(null)
  const [panelClosing, setPanelClosing] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [categoria, setCategoria] = useState('todas')
  const [prioridade, setPrioridade] = useState('todas')
  const [busca, setBusca] = useState('')
  const [historico, setHistorico] = useState<OcorrenciaHistorico[]>([])
  const [comentarios, setComentarios] = useState<OcorrenciaComentario[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [visibilidade, setVisibilidade] = useState<'interno' | 'publico'>('interno')
  const [savingComment, setSavingComment] = useState(false)
  const [responsavel, setResponsavel] = useState('')

  const closeOccurrencePanel = useCallback(() => {
    if (!selected || panelClosing) return
    setPanelClosing(true)
    window.setTimeout(() => {
      setSelected(null)
      setPanelClosing(false)
    }, 220)
  }, [panelClosing, selected])

  useEffect(() => {
    if (!condominio?.id) return
    setLoading(true)
    db.getChamados(condominio.id, 'manutencao').then(setChamados).catch(console.error).finally(() => setLoading(false))
  }, [condominio?.id])

  useEffect(() => {
    if (!selected) return
    setResponsavel(selected.responsavel || '')
    db.getOcorrenciaDetalhes(selected.id).then(data => {
      setHistorico(data.historico); setComentarios(data.comentarios)
    }).catch(error => { console.error(error); setHistorico([]); setComentarios([]) })
  }, [selected])

  useEffect(() => {
    if (!selected) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOccurrencePanel()
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [closeOccurrencePanel, selected])

  const filtered = useMemo(() => chamados.filter(item => {
    if (categoria !== 'todas' && (item.categoria || 'Manutenção') !== categoria) return false
    if (prioridade !== 'todas' && (item.prioridade || 'normal') !== prioridade) return false
    const term = busca.trim().toLowerCase()
    return !term || `${item.titulo || ''} ${item.descricao} ${item.local} ${item.responsavel || ''}`.toLowerCase().includes(term)
  }), [chamados, categoria, prioridade, busca])

  const updateStatus = async (id: string, status: StatusType) => {
    try {
      const updated = await db.updateChamadoStatus(id, status)
      if (!updated) return
      setChamados(items => items.map(item => item.id === id ? { ...item, ...updated } : item))
      setSelected(item => item?.id === id ? { ...item, ...updated } : item)
      if (selected?.id === id) {
        const details = await db.getOcorrenciaDetalhes(id)
        setHistorico(details.historico)
      }
    } catch (error) { console.error(error); alert('Não foi possível atualizar a ocorrência.') }
  }

  const removeOccurrence = async (id: string) => {
    if (!confirm('Excluir esta ocorrência permanentemente?')) return
    try { await db.deleteChamado(id); setChamados(items => items.filter(item => item.id !== id)); setSelected(null) }
    catch (error) { console.error(error); alert('Não foi possível excluir a ocorrência.') }
  }

  const addComment = async () => {
    if (!selected || !novoComentario.trim()) return
    setSavingComment(true)
    try {
      const gestor = JSON.parse(localStorage.getItem('zelcon_gestor') || '{}')
      const created = await db.addOcorrenciaComentario(selected, novoComentario, visibilidade, gestor.nome)
      setComentarios(items => [...items, created]); setNovoComentario('')
      if (visibilidade === 'publico') {
        const details = await db.getOcorrenciaDetalhes(selected.id)
        setHistorico(details.historico)
      }
    } catch (error) { console.error(error); alert('Não foi possível adicionar o comentário.') }
    finally { setSavingComment(false) }
  }

  const saveResponsible = async () => {
    if (!selected) return
    try {
      const updated = await db.updateChamadoResponsavel(selected.id, responsavel)
      if (!updated) return
      setSelected(updated)
      setChamados(items => items.map(item => item.id === updated.id ? updated : item))
    } catch (error) { console.error(error); alert('Não foi possível atribuir o responsável.') }
  }

  if (!condominio) return null
  if (condominio.subscription_status !== 'active' && condominio.plan_type !== 'free') return <div className="h-full flex flex-col items-center justify-center p-10 text-center"><Lock className="w-10 h-10 text-amber-500 mb-4" /><h1 className="font-bold text-zinc-900 dark:text-white">Gestão de Ocorrências indisponível</h1><p className="text-xs text-zinc-500 mt-2 max-w-sm">Regularize a assinatura para voltar a gerenciar as ocorrências.</p></div>

  return <div className="h-full flex flex-col bg-zinc-50 dark:bg-[#111316] text-zinc-700 dark:text-zinc-300">
    <header className="px-5 md:px-8 py-5 border-b border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-[#111316]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div><h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Gestão de ocorrências</h1><p className="text-xs text-zinc-500 mt-1">Acompanhe o fluxo operacional de {condominio.nome}</p></div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[700px] lg:grid-cols-[1.2fr_1fr_1fr]">
          <label className="relative block min-w-0">
            <span className="sr-only">Buscar ocorrência</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={busca}
              onChange={event => setBusca(event.target.value)}
              placeholder="Buscar ocorrência"
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-xs text-zinc-700 placeholder:text-zinc-500 focus:border-brand dark:border-white/[0.08] dark:bg-[#17191d] dark:text-zinc-200"
            />
          </label>
          <FilterSelect value={categoria} onChange={setCategoria} options={categoryOptions} ariaLabel="Filtrar por categoria" />
          <FilterSelect value={prioridade} onChange={setPrioridade} options={priorityOptions} ariaLabel="Filtrar por prioridade" />
        </div>
      </div>
    </header>

    <main className="flex-1 overflow-x-auto p-4 md:p-6">
      {loading ? <div className="h-56 flex items-center justify-center text-xs text-zinc-500">Carregando ocorrências...</div> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0 lg:min-w-[900px] h-full">
        {columns.map(column => {
          const items = filtered.filter(item => item.status === column.status)
          return <section key={column.status} onDragOver={event => event.preventDefault()} onDrop={() => { if (draggedId) updateStatus(draggedId, column.status); setDraggedId(null) }} className={`bg-zinc-100/70 dark:bg-[#17191d] border border-zinc-200 dark:border-white/[0.06] ${column.color} rounded-xl min-h-[260px] flex flex-col`}>
            <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.05]"><div className="flex items-center gap-2"><column.icon className="w-4 h-4 text-zinc-500" /><h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{column.title}</h2></div><span className="text-[11px] font-medium bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] px-2 py-0.5 rounded">{items.length}</span></div>
            <div className="p-3 space-y-3 overflow-y-auto">
              {!items.length && <div className="h-28 flex items-center justify-center text-[10px] text-zinc-500">Nenhuma ocorrência nesta etapa.</div>}
              {items.map(item => <article key={item.id} draggable onDragStart={() => setDraggedId(item.id)} onClick={() => { setPanelClosing(false); setSelected(item) }} className="bg-white dark:bg-[#1b1d22] border border-zinc-200 dark:border-white/[0.07] hover:border-brand/40 rounded-lg p-4 cursor-pointer transition-colors">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug line-clamp-2">{occurrenceTitle(item)}</h3>
                <p className="mt-2 text-[11px] text-zinc-500 flex items-center"><MapPin className="w-3 h-3 mr-1" />{item.local}</p>
                <div className="flex flex-wrap gap-1.5 mt-3"><span className="text-[9px] font-bold px-2 py-0.5 rounded border border-zinc-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-white/[0.03]">{item.categoria || 'Manutenção'}</span><PriorityBadge value={item.prioridade} /></div>
                <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-500"><span>{formatOccurrenceAge(item.created_at)}</span><span className="flex items-center"><UserRound className="w-3 h-3 mr-1" />{requesterLabel(item.solicitante_tipo)}</span></div>
                <div className="mt-2 flex justify-end gap-1" onClick={event => event.stopPropagation()}>{column.status !== 'pendente' && <button onClick={() => updateStatus(item.id, column.status === 'resolvido' ? 'em_execucao' : 'pendente')} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-white/[0.05]" aria-label="Mover para trás"><ChevronLeft className="w-3.5 h-3.5" /></button>}{column.status !== 'resolvido' && <button onClick={() => updateStatus(item.id, column.status === 'pendente' ? 'em_execucao' : 'resolvido')} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-white/[0.05]" aria-label="Mover para frente"><ChevronRight className="w-3.5 h-3.5" /></button>}</div>
              </article>)}
            </div>
          </section>
        })}
      </div>}
    </main>

    {selected && (
      <div className={`occurrence-drawer-backdrop fixed inset-0 z-50 flex justify-end bg-black/60 ${panelClosing ? 'occurrence-drawer-backdrop--closing' : ''}`} onMouseDown={closeOccurrencePanel}>
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="occurrence-panel-title"
          className={`occurrence-drawer flex h-full w-full flex-col border-l border-zinc-200 bg-white shadow-2xl sm:max-w-xl lg:max-w-2xl dark:border-white/[0.08] dark:bg-[#17191d] ${panelClosing ? 'occurrence-drawer--closing' : ''}`}
          onMouseDown={event => event.stopPropagation()}
        >
          <header className="shrink-0 border-b border-zinc-200 px-5 py-4 dark:border-white/[0.07] sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-zinc-500">Detalhes da ocorrência</p>
                <h2 id="occurrence-panel-title" className="mt-1 text-lg font-semibold leading-snug text-zinc-900 dark:text-white">
                  {occurrenceTitle(selected)}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-brand/20 bg-brand/10 px-2 py-1 text-[11px] font-medium text-brand">
                    {STATUS_LABELS[selected.status]}
                  </span>
                  <PriorityBadge value={selected.prioridade} />
                  <span className="text-[11px] text-zinc-500">Aberta {formatOccurrenceAge(selected.created_at).toLowerCase()}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeOccurrencePanel}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:hover:bg-white/[0.05] dark:hover:text-white"
                aria-label="Fechar detalhes"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-7 p-5 sm:p-6">
              <section>
                <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Resumo</h3>
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700 dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-zinc-300">
                  {selected.descricao}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-xs sm:grid-cols-3">
                  <Info label="Condomínio" value={condominio.nome} />
                  <Info label="Localização" value={selected.local} />
                  <Info label="Unidade" value={`${selected.bloco} · ${selected.apartamento}`} />
                  <Info label="Categoria" value={selected.categoria || 'Manutenção'} />
                  <Info label="Responsável" value={selected.responsavel || 'Não atribuído'} />
                  <Info label="Atualização" value={new Date(selected.updated_at).toLocaleString('pt-BR')} />
                </div>
              </section>

              {selected.foto_url && (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                      <ImageIcon className="h-4 w-4 text-zinc-500" />
                      Imagem anexada
                    </h3>
                    <a
                      href={selected.foto_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-brand"
                    >
                      Abrir original <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <a
                    href={selected.foto_url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block aspect-[16/10] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-white/[0.07] dark:bg-black/20"
                  >
                    <NextImage
                      src={selected.foto_url}
                      alt={`Imagem da ocorrência ${occurrenceTitle(selected)}`}
                      fill
                      sizes="(max-width: 640px) 100vw, 672px"
                      className="object-contain"
                    />
                  </a>
                </section>
              )}

              <section>
                <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Operação</h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={responsavel}
                    onChange={event => setResponsavel(event.target.value)}
                    maxLength={120}
                    placeholder="Nome do responsável"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-xs focus:border-brand dark:border-white/[0.07] dark:bg-[#131519]"
                  />
                  <button onClick={saveResponsible} className="h-10 rounded-lg border border-zinc-200 bg-zinc-100 px-4 text-xs font-semibold hover:bg-zinc-200 dark:border-white/[0.07] dark:bg-white/[0.05] dark:hover:bg-white/[0.08]">
                    Atribuir responsável
                  </button>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Solicitante</h3>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4 text-xs sm:grid-cols-4">
                  <Info label="Tipo" value={requesterLabel(selected.solicitante_tipo)} />
                  <Info label="Identidade" value={selected.anonimo !== false ? 'Anônimo' : selected.solicitante_nome || 'Não informada'} />
                  <Info label="WhatsApp" value={selected.solicitante_whatsapp || 'Não fornecido'} />
                  <Info label="Abertura" value={new Date(selected.created_at).toLocaleString('pt-BR')} />
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Histórico</h3>
                <div className="space-y-4 border-l border-zinc-300 pl-4 dark:border-zinc-700">
                  {historico.length ? historico.map(item => (
                    <div key={item.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand dark:border-[#17191d]" />
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.descricao}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {new Date(item.created_at).toLocaleString('pt-BR')} · {item.visibilidade === 'publico' ? 'Visível ao solicitante' : 'Interno'}
                      </p>
                    </div>
                  )) : (
                    <p className="text-xs text-zinc-500">O histórico começa com as próximas alterações desta ocorrência.</p>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Comentários</h3>
                  <MessageSquare className="h-4 w-4 text-zinc-500" />
                </div>
                <div className="mb-4 space-y-2">
                  {comentarios.map(item => (
                    <div key={item.id} className={`rounded-lg border p-3 text-xs ${item.visibilidade === 'interno' ? 'border-amber-500/15 bg-amber-500/5' : 'border-brand/15 bg-brand/5'}`}>
                      <p className="leading-5">{item.conteudo}</p>
                      <p className="mt-1.5 text-[11px] text-zinc-500">
                        {item.visibilidade === 'interno' ? 'Comentário interno' : 'Atualização para o solicitante'} · {new Date(item.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <button onClick={() => setVisibilidade('interno')} className={`rounded-md border px-3 py-1.5 text-[11px] font-medium ${visibilidade === 'interno' ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-zinc-200 text-zinc-500 dark:border-white/[0.07]'}`}>Comentário interno</button>
                  <button onClick={() => setVisibilidade('publico')} className={`rounded-md border px-3 py-1.5 text-[11px] font-medium ${visibilidade === 'publico' ? 'border-brand/30 bg-brand/10 text-brand' : 'border-zinc-200 text-zinc-500 dark:border-white/[0.07]'}`}>Atualização para o solicitante</button>
                </div>
                <textarea
                  value={novoComentario}
                  onChange={event => setNovoComentario(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder={visibilidade === 'interno' ? 'Somente a equipe verá este comentário.' : 'Esta atualização aparecerá no portal do solicitante.'}
                  className="w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 focus:border-brand dark:border-white/[0.07] dark:bg-[#131519]"
                />
                <button disabled={savingComment || !novoComentario.trim()} onClick={addComment} className="mt-2 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                  {savingComment ? 'Salvando...' : 'Adicionar comentário'}
                </button>
              </section>
            </div>
          </div>

          <footer className="shrink-0 border-t border-zinc-200 bg-white px-5 py-4 dark:border-white/[0.07] dark:bg-[#17191d] sm:px-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={() => removeOccurrence(selected.id)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-red-500 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4" /> Excluir ocorrência
              </button>
              <div className="flex flex-wrap justify-end gap-2">
                {columns.map(column => (
                  <button
                    key={column.status}
                    disabled={selected.status === column.status}
                    onClick={() => updateStatus(selected.id, column.status)}
                    className={`h-9 rounded-md border px-3 text-[11px] font-semibold disabled:cursor-default ${
                      selected.status === column.status
                        ? 'border-brand/20 bg-brand/10 text-brand'
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-white/[0.08] dark:text-zinc-300 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    {column.title}
                  </button>
                ))}
              </div>
            </div>
          </footer>
        </aside>
      </div>
    )}
  </div>
}
