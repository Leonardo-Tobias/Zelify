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
  const [chamados, setChamados] = useState<Chamado[]>([]);
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
    { title: 'Pendentes', status: 'pendente', color: 'border-t-amber-500', icon: Clock },
    { title: 'Em Execução', status: 'em_execucao', color: 'border-t-blue-500', icon: Wrench },
    { title: 'Resolvidos', status: 'resolvido', color: 'border-t-emerald-500', icon: CheckCircle2 }
  ];

  return (
    <div className="space-y-6 flex flex-col h-full min-h-[calc(100vh-140px)] relative">
      
      {/* HEADER DO QUADRO */}
      <div className="flex justify-between items-center shrink-0 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Mural de Ocorrências</h1>
          <p className="text-xs text-zinc-500 font-medium">Controle e gestão de ocorrências do condomínio</p>
        </div>
        <div className="text-[10px] text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded-lg">
          Total: {chamados.length} ocorrências
        </div>
      </div>

      {/* QUADROS (KANBAN COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start min-h-[500px]">
        {colunas.map((col) => {
          const colChamados = chamados.filter(c => c.status === col.status);
          
          return (
            <div 
              key={col.status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
              className="bg-zinc-100/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col h-full min-h-[400px] lg:max-h-[calc(100vh-220px)] overflow-hidden shadow-sm"
            >
              {/* TÍTULO DA COLUNA */}
              <div className={`p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between border-t-2 ${col.status === 'em_execucao' ? 'border-t-[#001CFF]' : col.color} shrink-0 bg-zinc-100/40 dark:bg-zinc-950/60`}>
                <div className="flex items-center space-x-2">
                  <col.icon className={`w-4 h-4 ${
                    col.status === 'pendente' ? 'text-amber-500' : col.status === 'em_execucao' ? 'text-[#001CFF]' : 'text-emerald-500'
                  }`} />
                  <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">{col.title}</span>
                </div>
                <span className="text-[10px] bg-zinc-200 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-800 px-2.5 py-0.5 rounded font-bold">
                  {colChamados.length}
                </span>
              </div>

              {/* LISTA DE CARDS */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {colChamados.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center space-y-1">
                    <col.icon className="w-5 h-5 opacity-20 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Nenhum chamado</span>
                  </div>
                ) : (
                  colChamados.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onClick={() => setSelectedChamado(item)}
                      className="bg-white dark:bg-zinc-925 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 rounded-lg p-3.5 space-y-3.5 cursor-pointer transition-all shadow-sm group text-left"
                    >
                      {/* MINI FOTO (SE EXISTIR) */}
                      {item.foto_url && (
                        <div className="relative aspect-video w-full rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shrink-0 font-sans">
                          <img 
                            src={item.foto_url} 
                            alt={item.descricao} 
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChamado(item);
                            }}
                            className="absolute bottom-1.5 right-1.5 bg-black/60 hover:bg-[#001CFF] text-white p-1 rounded transition-colors border border-zinc-700 cursor-pointer"
                            title="Expandir Chamado"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* CORPO DO CARD */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          <span className="flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-0.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            {item.local}
                          </span>
                          <span className="flex items-center">
                            <Building className="w-3.5 h-3.5 mr-0.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            {item.bloco}-{item.apartamento}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold line-clamp-2 leading-relaxed pt-0.5">
                          {item.descricao}
                        </p>
                      </div>

                      {/* RODAPÉ DO CARD / BOTÕES MÓVEIS */}
                      <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold font-mono">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        
                        {/* BOTÕES DE TRANSIÇÃO (FÁCIL NO MOBILE) */}
                        <div className="flex items-center space-x-1">
                          {col.status !== 'pendente' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(item.id, col.status === 'resolvido' ? 'em_execucao' : 'pendente');
                              }}
                              className="p-1 bg-zinc-100 dark:bg-zinc-950 hover:bg-zinc-200 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white rounded transition-colors cursor-pointer"
                              title="Mover para esquerda"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          )}
                          {col.status !== 'resolvido' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(item.id, col.status === 'pendente' ? 'em_execucao' : 'resolvido');
                              }}
                              className="p-1 bg-zinc-100 dark:bg-zinc-925 hover:bg-zinc-200 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[#001CFF] hover:text-[#001CFF]/80 rounded transition-colors cursor-pointer"
                              title="Mover para direita"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
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
