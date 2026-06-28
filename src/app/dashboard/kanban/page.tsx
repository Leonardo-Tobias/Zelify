'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  Wrench, 
  CheckCircle2, 
  MapPin, 
  Calendar,
  Building,
  ChevronRight,
  ChevronLeft,
  ArrowRightLeft,
  X,
  Maximize2
} from 'lucide-react';
import { db, Chamado, Condominio } from '@/lib/db';

type StatusType = 'pendente' | 'em_execucao' | 'resolvido';

export default function KanbanPage() {
  const router = useRouter();
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [chamados, setChamados] = useState<(Chamado & { prioridade?: 'baixa' | 'media' | 'alta'; solicitante_nome?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  
  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const loadData = async (condoId: string) => {
    try {
      const data = await db.getChamados(condoId, 'manutencao');
      setChamados(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedCondo = localStorage.getItem('zelify_condominio_gestao');
    if (!savedCondo) {
      router.push('/login');
      return;
    }
    
    const condo = JSON.parse(savedCondo) as Condominio;
    setCondominio(condo);
    loadData(condo.id);
  }, [router]);

  // Alterar status de um chamado
  const handleUpdateStatus = async (id: string, newStatus: StatusType) => {
    try {
      const updated = await db.updateChamadoStatus(id, newStatus);
      if (updated && condominio) {
        // Atualizar lista local
        setChamados(prev => prev.map(c => c.id === id ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c));
        if (selectedChamado && selectedChamado.id === id) {
          setSelectedChamado(prev => prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null);
        }
      }
    } catch (err) {
      alert('Erro ao atualizar status.');
      console.error(err);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: StatusType) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (id) {
      await handleUpdateStatus(id, status);
    }
    setDraggedId(null);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20 text-zinc-500">
        <Clock className="w-5 h-5 animate-spin mr-2" />
        <span className="text-xs font-medium">Carregando quadro...</span>
      </div>
    );
  }

  // Filtrar chamados por coluna
  const colunas: { title: string; status: StatusType; color: string; icon: any }[] = [
    { title: 'PENDENTES', status: 'pendente', color: 'border-t-4 border-amber-500', icon: Clock },
    { title: 'EM EXECUÇÃO', status: 'em_execucao', color: 'border-t-4 border-[#001CFF]', icon: Wrench },
    { title: 'RESOLVIDOS', status: 'resolvido', color: 'border-t-4 border-emerald-500', icon: CheckCircle2 }
  ];

  return (
    <div className="space-y-6 flex flex-col h-full min-h-[calc(100vh-140px)] relative">
      
      {/* HEADER DO QUADRO */}
      <div className="flex justify-between items-center shrink-0 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Mural Kanban</h1>
          <p className="text-xs text-zinc-500 font-medium">Controle de solicitações de manutenção</p>
        </div>
        <div className="text-[10px] text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded-lg">
          Total: {chamados.length} ocorrências
        </div>
      </div>

      {/* QUADROS (KANBAN COLUMNS) */}
      <div className="bg-[#f4f5f7] dark:bg-zinc-950 p-6 rounded-2xl flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start min-h-[500px]">
          {colunas.map((col) => {
            const colChamados = chamados.filter(c => c.status === col.status);
            
            return (
              <div 
                key={col.status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.status)}
                className={`bg-white dark:bg-zinc-900 rounded-xl flex flex-col h-full min-h-[400px] lg:max-h-[calc(100vh-220px)] overflow-hidden shadow-sm border border-zinc-150 dark:border-zinc-800/80 ${col.color}`}
              >
                {/* TÍTULO DA COLUNA */}
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-850 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900">
                  <div className="flex items-center space-x-2">
                    <col.icon className={`w-4 h-4 ${
                      col.status === 'pendente' ? 'text-amber-500' : col.status === 'em_execucao' ? 'text-[#001CFF]' : 'text-emerald-500'
                    }`} />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">{col.title}</span>
                  </div>
                  <span className="bg-slate-100 dark:bg-zinc-800 text-slate-650 dark:text-zinc-400 px-2 py-0.5 rounded text-xs font-bold">
                    {colChamados.length}
                  </span>
                </div>

                {/* LISTA DE CARDS */}
                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                  {colChamados.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-2 text-slate-400 dark:text-zinc-650">
                      <col.icon className="w-8 h-8 opacity-40 stroke-[1.5]" />
                      <span className="text-xs font-medium uppercase tracking-widest text-slate-400">NENHUM CHAMADO</span>
                    </div>
                  ) : (
                    colChamados.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onClick={() => setSelectedChamado(item)}
                        className="bg-white dark:bg-zinc-925 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 rounded-xl p-4 flex gap-3.5 cursor-pointer transition-all shadow-sm group text-left relative"
                      >
                        {/* TEXTOS E INFORMAÇÕES (ESQUERDA DA FOTO) */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          {/* Linha Superior: Categoria/Local ("📍 HALL") e Código */}
                          <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center truncate">
                              <span className="mr-0.5">📍</span>
                              <span className="truncate uppercase font-bold tracking-wider">{item.local}</span>
                            </span>
                            <span className="font-mono text-zinc-400 dark:text-zinc-500 font-bold shrink-0 ml-2 uppercase">
                              {(() => {
                                const cleanId = item.id.replace('chamado-', '');
                                return cleanId.length > 8 ? cleanId.substring(0, 8).toUpperCase() : cleanId;
                              })()}
                            </span>
                          </div>

                          {/* Título */}
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 line-clamp-2 leading-tight">
                            {item.descricao}
                          </p>

                          {/* NOVOS DADOS: Solicitante e Tag de Prioridade */}
                          <div className="flex items-center justify-between mt-2.5 gap-2">
                            <div className="text-[10px] text-slate-500 dark:text-slate-450 truncate">
                              <span className="font-semibold text-slate-400">Solicitante:</span>{' '}
                              <span className="font-bold text-slate-700 dark:text-zinc-300">
                                {item.solicitante_nome || 'Carlos Silva'}
                              </span>{' '}
                              <span className="text-slate-400 font-bold">
                                (Ap. {item.apartamento || '302'})
                              </span>
                            </div>

                            {/* Tag de Prioridade compacta com cores dinâmicas */}
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${
                              item.prioridade === 'baixa' 
                                ? 'bg-zinc-100 text-zinc-650' 
                                : item.prioridade === 'media'
                                  ? 'bg-amber-50 text-amber-650'
                                  : 'bg-red-50 text-red-600' // 'alta' ou default
                            }`}>
                              {item.prioridade || 'ALTA'}
                            </span>
                          </div>

                          {/* Base do Card: Data e Ação */}
                          <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold font-mono">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </span>

                            {/* Setinha azul de ação */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedChamado(item);
                              }}
                              className="text-[#001CFF] hover:text-[#0014CC] p-0.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors cursor-pointer"
                              title="Abrir detalhes"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* MINIATURA DA FOTO (DIREITA) */}
                        {item.foto_url && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shrink-0 self-center">
                            <img 
                              src={item.foto_url} 
                              alt={item.descricao} 
                              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAIL MODAL (ESTILO LINEAR / DEEP DARK) */}
      {selectedChamado && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 relative">
            
            {/* CABEÇALHO MODAL */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                <Wrench className="w-4 h-4 text-[#001CFF]" />
                <span>
                  Ocorrência #
                  {(() => {
                    const cleanId = selectedChamado.id.replace('chamado-', '');
                    return cleanId.length > 8 ? cleanId.substring(0, 8).toUpperCase() : cleanId;
                  })()}
                </span>
              </div>
              <button 
                onClick={() => setSelectedChamado(null)}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CONTEÚDO MODAL */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* IMAGEM AMPLIADA */}
              {selectedChamado.foto_url && (
                <div className="rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 aspect-video relative">
                  <img src={selectedChamado.foto_url} alt="Problema Ampliado" className="w-full h-full object-contain bg-black/40" />
                </div>
              )}

              {/* INFO CHAVE DENSE */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Local</span>
                  <p className="text-zinc-900 dark:text-white font-bold mt-1 flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-zinc-400 dark:text-zinc-500 shrink-0" />
                    {selectedChamado.local}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Solicitante</span>
                  <p className="text-zinc-900 dark:text-white font-bold mt-1 flex items-center">
                    <Building className="w-4 h-4 mr-1 text-zinc-400 dark:text-zinc-500 shrink-0" />
                    Unidade {selectedChamado.bloco} - Apto {selectedChamado.apartamento}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Data de Abertura</span>
                  <p className="text-zinc-700 dark:text-zinc-350 font-semibold mt-1 font-mono">
                    {new Date(selectedChamado.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Estado do Chamado</span>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      selectedChamado.status === 'pendente' ? 'bg-amber-500 animate-pulse' : selectedChamado.status === 'em_execucao' ? 'bg-[#001CFF]' : 'bg-emerald-400'
                    }`}></span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      selectedChamado.status === 'pendente' 
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400' 
                        : selectedChamado.status === 'em_execucao' 
                          ? 'bg-[#001CFF]/10 border-[#001CFF]/25 text-[#001CFF]' 
                          : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {selectedChamado.status === 'pendente' ? 'Pendente' : selectedChamado.status === 'em_execucao' ? 'Em andamento' : 'Resolvido'}
                    </span>
                  </div>
                </div>
              </div>

              {/* DESCRIÇÃO */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Descrição</span>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-semibold bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  {selectedChamado.descricao}
                </p>
              </div>

              {/* CONTROLES DE STATUS */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center">
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                  Atualizar Status Operacional
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedChamado.id, 'pendente')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      selectedChamado.status === 'pendente'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                    }`}
                  >
                    Pendente
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedChamado.id, 'em_execucao')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      selectedChamado.status === 'em_execucao'
                        ? 'bg-[#001CFF]/10 border-[#001CFF]/30 text-[#001CFF] font-bold shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-925 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                    }`}
                  >
                    Em Execução
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedChamado.id, 'resolvido')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      selectedChamado.status === 'resolvido'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-925 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                    }`}
                  >
                    Resolvido
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
