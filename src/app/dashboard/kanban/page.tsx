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
  Maximize2,
  AlertCircle,
  Lock,
  Trash2,
  Paperclip
} from 'lucide-react';
import { db, Chamado } from '@/lib/db';
import { useCondominio } from '@/contexts/CondominioContext';

type StatusType = 'pendente' | 'em_execucao' | 'resolvido';

const getPrioridade = (id: string, descricao: string) => {
  const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  if (
    descricao.toLowerCase().includes('urgente') || 
    descricao.toLowerCase().includes('risco') || 
    descricao.toLowerCase().includes('vazamento') || 
    sum % 3 === 0
  ) {
    return 'Alta';
  }
  if (descricao.toLowerCase().includes('lâmpada') || sum % 3 === 1) {
    return 'Média';
  }
  return 'Baixa';
};

const getTitleAndDesc = (text: string) => {
  const index = text.indexOf('.');
  if (index !== -1 && index < 50) {
    return {
      title: text.substring(0, index).trim(),
      desc: text.substring(index + 1).trim()
    };
  }
  const words = text.split(' ');
  if (words.length > 5) {
    const title = words.slice(0, 4).join(' ');
    const desc = words.slice(4).join(' ');
    return {
      title: title + '...',
      desc: desc
    };
  }
  return {
    title: text,
    desc: ''
  };
};

export default function KanbanPage() {
  const router = useRouter();
  const { condominio } = useCondominio();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  
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
    if (condominio?.id) {
      loadData(condominio.id);
    }
  }, [condominio?.id]);

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

  const handleDeleteChamado = async (id: string) => {
    try {
      await db.deleteChamado(id);
      setChamados(prev => prev.filter(c => c.id !== id));
      if (selectedChamado && selectedChamado.id === id) {
        setSelectedChamado(null);
      }
    } catch (err) {
      alert('Erro ao excluir chamado.');
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

  const isBlocked = condominio?.subscription_status !== 'active' && condominio?.plan_type !== 'free';

  return (
    <div className="space-y-6 flex flex-col h-full min-h-[calc(100vh-140px)] relative">
      
      {/* BLOQUEIO POR INADIMPLÊNCIA */}
      {isBlocked && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-base font-bold text-white">Assinatura Bloqueada</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Seu acesso ao Mural de Ocorrências está temporariamente suspenso devido a pendências de pagamento na sua assinatura.
            </p>
            <button
              onClick={() => router.push('/dashboard/configuracoes?tab=faturamento')}
              className="inline-flex items-center space-x-2 bg-brand hover:bg-brand/90 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all active:scale-[0.98]"
            >
              <span>Regularizar Assinatura</span>
            </button>
          </div>
        </div>
      )}
      
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
          
          // Determine theme-specific color settings
          const themeStyles = {
            pendente: {
              border: 'border-amber-500/20 dark:border-amber-500/30',
              bgHeader: 'bg-amber-500/5',
              badge: 'bg-amber-500 text-white',
              text: 'text-amber-600 dark:text-amber-500',
              hover: 'hover:border-amber-500/30 dark:hover:border-amber-500/40'
            },
            em_execucao: {
              border: 'border-blue-500/20 dark:border-blue-500/30',
              bgHeader: 'bg-brand/5',
              badge: 'bg-brand text-white',
              text: 'text-brand',
              hover: 'hover:border-blue-500/30 dark:hover:border-blue-500/40'
            },
            resolvido: {
              border: 'border-emerald-500/20 dark:border-emerald-500/30',
              bgHeader: 'bg-emerald-500/5',
              badge: 'bg-emerald-500 text-white',
              text: 'text-emerald-600 dark:text-emerald-500',
              hover: 'hover:border-emerald-500/30 dark:hover:border-emerald-500/40'
            }
          }[col.status];

          return (
            <div 
              key={col.status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`bg-zinc-50/50 dark:bg-[#070A13] border ${themeStyles.border} rounded-xl flex flex-col h-full min-h-[400px] lg:max-h-[calc(100vh-220px)] overflow-hidden shadow-sm`}
            >
              {/* TÍTULO DA COLUNA */}
              <div className={`p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 ${themeStyles.bgHeader}`}>
                <div className="flex items-center space-x-2">
                  <col.icon className={`w-4 h-4 ${themeStyles.text}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${themeStyles.text}`}>{col.title}</span>
                </div>
                <span className={`text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 shadow-sm ${themeStyles.badge}`}>
                  {colChamados.length}
                </span>
              </div>

              {/* LISTA DE CARDS */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {colChamados.length === 0 ? (
                  <div className="py-16 text-center text-zinc-400 dark:text-zinc-500 flex flex-col items-center justify-center space-y-1">
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
                      className={`bg-white dark:bg-[#13192B] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/80 dark:hover:bg-[#182037] rounded-xl p-3.5 space-y-3.5 cursor-pointer transition-all shadow-sm group text-left`}
                    >
                      {/* HEADER DO CARD (LOCATION & PRIORITY) */}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-indigo-500 dark:text-indigo-400 shrink-0" />
                          {item.local}
                        </span>
                        
                        {(() => {
                          const prio = getPrioridade(item.id, item.descricao);
                          const badgeStyles = {
                            Alta: 'text-red-500 border border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
                            Média: 'text-amber-500 border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10',
                            Baixa: 'text-emerald-500 border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                          }[prio];
                          return (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wide ${badgeStyles}`}>
                              {prio}
                            </span>
                          );
                        })()}
                      </div>

                      {/* CORPO DO CARD (TITLE & DESCRIPTION OR PHOTO LINK) */}
                      <div className="space-y-1.5">
                        {(() => {
                          const { title, desc } = getTitleAndDesc(item.descricao);
                          return (
                            <>
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-snug">
                                {title}
                              </h4>
                              {desc && (
                                <p className="text-[11px] text-zinc-550 dark:text-zinc-400 font-medium leading-relaxed">
                                  {desc}
                                </p>
                              )}
                            </>
                          );
                        })()}
                        
                        {/* PHOTO LINK AS SPECIFIED IN DESIGN */}
                        {item.foto_url && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChamado(item);
                            }}
                            className="flex items-center space-x-1 text-[10.5px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold cursor-pointer py-0.5 inline-flex"
                          >
                            <Paperclip className="w-3.5 h-3.5 shrink-0" />
                            <span>Ver foto do chamado</span>
                          </div>
                        )}
                      </div>

                      {/* RODAPÉ DO CARD / NAV ARROWS */}
                      <div className="pt-2.5 border-t border-zinc-150 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                        <span className="flex items-center font-semibold text-zinc-500 dark:text-zinc-400">
                          <Building className="w-3.5 h-3.5 mr-1 text-zinc-450 dark:text-zinc-500 shrink-0" />
                          {item.bloco === 'Portaria' ? 'Portaria' : `Bloco ${item.bloco} · Apt ${item.apartamento}`}
                        </span>

                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-555 pl-2">
                            {new Date(item.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          
                          {/* BOTÕES DE TRANSIÇÃO (CIRCULAR DESIGN) */}
                          <div className="flex items-center space-x-1 shrink-0">
                            {col.status !== 'pendente' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatus(item.id, col.status === 'resolvido' ? 'em_execucao' : 'pendente');
                                }}
                                className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-750"
                                title="Mover para esquerda"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {col.status !== 'resolvido' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatus(item.id, col.status === 'pendente' ? 'em_execucao' : 'resolvido');
                                }}
                                className="w-5 h-5 rounded-full bg-zinc-850 dark:bg-zinc-200 text-white dark:text-zinc-900 flex items-center justify-center hover:bg-zinc-950 dark:hover:bg-white transition-colors cursor-pointer border border-zinc-700 dark:border-white"
                                title="Mover para direita"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {col.status === 'resolvido' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Excluir este chamado permanentemente?')) {
                                    handleDeleteChamado(item.id);
                                  }
                                }}
                                className="w-5 h-5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 hover:text-red-450 flex items-center justify-center transition-colors cursor-pointer"
                                title="Excluir chamado"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

              {/* COLUMN FOOTER - + NOVO CHAMADO ACTIONS */}
              <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/30 dark:bg-zinc-950/40 shrink-0">
                <a 
                  href={`/${condominio?.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-850 hover:border-brand dark:hover:border-blue-500 text-zinc-500 hover:text-brand dark:hover:text-blue-400 text-[11px] font-bold tracking-wide transition-all flex items-center justify-center space-x-1.5 cursor-pointer bg-white dark:bg-[#13192B]/30 shadow-sm"
                >
                  <span>+ Novo chamado</span>
                </a>
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
                <Wrench className="w-4 h-4 text-brand" />
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
                      selectedChamado.status === 'pendente' ? 'bg-amber-500 animate-pulse' : selectedChamado.status === 'em_execucao' ? 'bg-brand' : 'bg-emerald-400'
                    }`}></span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      selectedChamado.status === 'pendente' 
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400' 
                        : selectedChamado.status === 'em_execucao' 
                          ? 'bg-brand/10 border-brand/25 text-brand' 
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
                        ? 'bg-brand/10 border-brand/30 text-brand font-bold shadow-sm'
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

              {selectedChamado.status === 'resolvido' && (
                <div className="pt-2 border-t border-zinc-800/60">
                  <button
                    onClick={() => {
                      if (window.confirm('Excluir este chamado permanentemente?')) {
                        handleDeleteChamado(selectedChamado.id);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold transition-all border bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20 flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir permanentemente</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
