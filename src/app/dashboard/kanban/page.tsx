'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Lock, MapPin, MessageSquare, Paperclip, Search, Trash2, UserRound, Wrench, X } from 'lucide-react'
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
              {items.map(item => <article key={item.id} draggable onDragStart={() => setDraggedId(item.id)} onClick={() => setSelected(item)} className="bg-white dark:bg-[#1b1d22] border border-zinc-200 dark:border-white/[0.07] hover:border-brand/40 rounded-lg p-4 cursor-pointer transition-colors">
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

    {selected && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setSelected(null)}><div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#0d0d0f] rounded-t-2xl md:rounded-2xl border border-zinc-200 dark:border-white/[0.08] shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white/95 dark:bg-[#0d0d0f]/95 border-b border-zinc-200 dark:border-white/[0.06] backdrop-blur"><div><span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Detalhes da ocorrência</span><h2 className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">{occurrenceTitle(selected)}</h2></div><button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.05]"><X className="w-4 h-4" /></button></div>
      <div className="p-5 space-y-6">
        <section><h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Informações principais</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs"><Info label="Condomínio" value={condominio.nome} /><Info label="Localização" value={selected.local} /><Info label="Categoria" value={selected.categoria || 'Manutenção'} /><Info label="Prioridade" value={priorityLabel(selected.prioridade)} /><Info label="Status" value={STATUS_LABELS[selected.status]} /><Info label="Unidade" value={`${selected.bloco} · ${selected.apartamento}`} /><Info label="Responsável" value={selected.responsavel || 'Não atribuído'} /><Info label="Atualização" value={new Date(selected.updated_at).toLocaleString('pt-BR')} /></div><p className="mt-4 p-3 rounded-lg bg-zinc-50 dark:bg-white/[0.025] border border-zinc-200 dark:border-white/[0.05] text-xs leading-relaxed">{selected.descricao}</p></section>
        <section><h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Solicitante</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs"><Info label="Tipo" value={requesterLabel(selected.solicitante_tipo)} /><Info label="Identidade" value={selected.anonimo !== false ? 'Anônimo' : selected.solicitante_nome || 'Não informada'} /><Info label="WhatsApp" value={selected.solicitante_whatsapp || 'Não fornecido'} /><Info label="Abertura" value={new Date(selected.created_at).toLocaleString('pt-BR')} /></div></section>
        <section><h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Operação</h3><div className="flex gap-2"><input value={responsavel} onChange={event => setResponsavel(event.target.value)} maxLength={120} placeholder="Nome do responsável" className="flex-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.07] p-2.5 text-xs outline-none focus:border-brand" /><button onClick={saveResponsible} className="px-3 rounded-lg bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.07] text-xs font-bold">Atribuir</button></div></section>
        {selected.foto_url && <section><h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Conteúdo</h3><a href={selected.foto_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-brand font-bold"><Paperclip className="w-4 h-4" />Abrir foto anexada</a></section>}
        <section><h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Histórico</h3><div className="border-l border-brand/30 pl-4 space-y-4">{historico.length ? historico.map(item => <div key={item.id}><p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{item.descricao}</p><p className="text-[9px] text-zinc-500 mt-1">{new Date(item.created_at).toLocaleString('pt-BR')} · {item.visibilidade === 'publico' ? 'Visível ao solicitante' : 'Interno'}</p></div>) : <p className="text-xs text-zinc-500">O histórico começa com as próximas alterações desta ocorrência.</p>}</div></section>
        <section><div className="flex items-center justify-between mb-3"><h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Comentários</h3><MessageSquare className="w-4 h-4 text-zinc-500" /></div><div className="space-y-2 mb-3">{comentarios.map(item => <div key={item.id} className={`p-3 rounded-lg border text-xs ${item.visibilidade === 'interno' ? 'bg-amber-500/5 border-amber-500/15' : 'bg-brand/5 border-brand/15'}`}><p>{item.conteudo}</p><p className="text-[9px] text-zinc-500 mt-1.5">{item.visibilidade === 'interno' ? 'Comentário interno' : 'Atualização para o solicitante'} · {new Date(item.created_at).toLocaleString('pt-BR')}</p></div>)}</div><div className="flex gap-2 mb-2"><button onClick={() => setVisibilidade('interno')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border ${visibilidade === 'interno' ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-zinc-200 dark:border-white/[0.07] text-zinc-500'}`}>Comentário interno</button><button onClick={() => setVisibilidade('publico')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border ${visibilidade === 'publico' ? 'border-brand/30 bg-brand/10 text-brand' : 'border-zinc-200 dark:border-white/[0.07] text-zinc-500'}`}>Atualização para o solicitante</button></div><textarea value={novoComentario} onChange={event => setNovoComentario(event.target.value)} maxLength={2000} rows={3} placeholder={visibilidade === 'interno' ? 'Somente a equipe verá este comentário.' : 'Esta atualização aparecerá no portal do solicitante.'} className="w-full rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.07] p-3 text-xs outline-none focus:border-brand" /><button disabled={savingComment || !novoComentario.trim()} onClick={addComment} className="mt-2 bg-brand text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50">{savingComment ? 'Salvando...' : 'Adicionar comentário'}</button></section>
      </div>
      <div className="px-5 py-4 border-t border-zinc-200 dark:border-white/[0.06] flex flex-col sm:flex-row gap-3 items-center justify-between"><button onClick={() => removeOccurrence(selected.id)} className="text-red-500 text-xs font-bold flex items-center gap-1.5"><Trash2 className="w-4 h-4" />Excluir</button><div className="flex gap-2">{columns.map(column => <button key={column.status} disabled={selected.status === column.status} onClick={() => updateStatus(selected.id, column.status)} className="px-3 py-2 text-[10px] font-bold rounded-lg border border-zinc-200 dark:border-white/[0.07] disabled:opacity-40">{column.title}</button>)}</div></div>
    </div></div>}
  </div>
}
