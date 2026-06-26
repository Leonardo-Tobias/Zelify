'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Plus, 
  MapPin, 
  Calendar, 
  Check, 
  Clock, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  X,
  Maximize2
} from 'lucide-react';
import { db, Chamado, Condominio } from '@/lib/db';
import { compressImage } from '@/lib/imageCompressor';

type StatusType = 'encontrado' | 'aguardando_retirada' | 'entregue';

export default function AchadosPerdidosPage() {
  const router = useRouter();
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [itens, setItens] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<StatusType | 'todos'>('todos');

  // Form de cadastro do porteiro
  const [descricao, setDescricao] = useState('');
  const [local, setLocal] = useState('');
  const [foto, setFoto] = useState<string>('');
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Modal detalhado
  const [selectedItem, setSelectedItem] = useState<Chamado | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async (condoId: string) => {
    try {
      const data = await db.getChamados(condoId, 'achado_perdido');
      setItens(data);
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

  // Upload e compressão de foto pela portaria
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const base64 = await compressImage(file, 800, 800, 0.7);
      setFoto(base64);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao otimizar foto.');
    } finally {
      setCompressing(false);
    }
  };

  // Cadastrar objeto
  const handleCadastrarObjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !local.trim()) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    try {
      let finalFotoUrl = '';
      if (foto) {
        finalFotoUrl = await db.uploadImagem(foto, condominio!.id);
      }

      const novoObjeto = await db.createChamado({
        condominio_id: condominio!.id,
        tipo: 'achado_perdido',
        local,
        bloco: 'Portaria',
        apartamento: '00', // Código de unidade fictício para a portaria
        descricao,
        foto_url: finalFotoUrl,
        status: 'encontrado'
      });

      setItens(prev => [novoObjeto, ...prev]);
      setSuccessMsg(true);
      
      setTimeout(() => {
        setDescricao('');
        setLocal('');
        setFoto('');
        setShowAddForm(false);
        setSuccessMsg(false);
      }, 1500);
    } catch (err) {
      alert('Erro ao cadastrar.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Atualizar status do achado (encontrado -> aguardando_retirada -> entregue)
  const handleUpdateStatus = async (id: string, newStatus: StatusType) => {
    try {
      const updated = await db.updateChamadoStatus(id, newStatus);
      if (updated) {
        setItens(prev => prev.map(item => item.id === id ? { ...item, status: newStatus, updated_at: new Date().toISOString() } : item));
        if (selectedItem && selectedItem.id === id) {
          setSelectedItem(prev => prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null);
        }
      }
    } catch (err) {
      alert('Erro ao atualizar status.');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20 text-zinc-500">
        <Clock className="w-5 h-5 animate-spin mr-2" />
        <span className="text-xs font-medium">Carregando inventário...</span>
      </div>
    );
  }

  // Filtrar itens exibidos
  const itensExibidos = filterStatus === 'todos' 
    ? itens 
    : itens.filter(item => item.status === filterStatus);

  return (
    <div className="space-y-6 relative">
        {/* HEADER E CONTROLES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Achados e Perdidos</h1>
          <p className="text-xs text-zinc-500 font-medium">Controle de pertences encontrados no condomínio</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-[#0033FF] hover:bg-[#0033FF]/90 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-[0_4px_20px_rgba(0,51,255,0.20)] active:scale-[0.98] self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Objeto pela Portaria</span>
        </button>
      </div>

      {/* FILTROS E CONTAGEM */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex gap-2">
          {(['todos', 'encontrado', 'aguardando_retirada', 'entregue'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border uppercase tracking-wider ${
                filterStatus === status 
                  ? 'bg-zinc-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                  : 'bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              {status === 'todos' ? 'Todos' : status === 'encontrado' ? 'Na Portaria' : status === 'aguardando_retirada' ? 'Aguardando Retirada' : 'Entregue'}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
          Exibindo {itensExibidos.length} de {itens.length} objetos
        </span>
      </div>

      {/* LISTA / GRID DE ITENS */}
      {itensExibidos.length === 0 ? (
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 text-center text-zinc-500 space-y-2">
          <Package className="w-8 h-8 mx-auto text-zinc-400 dark:text-zinc-700" />
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-400">Nenhum objeto encontrado</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            Nenhum pertence corresponde ao filtro selecionado no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {itensExibidos.map((item) => (
            <div 
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-all shadow-sm group text-left"
            >
              {/* IMAGEM E STATUS */}
              <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-925 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                {item.foto_url ? (
                  <img 
                    src={item.foto_url} 
                    alt={item.descricao} 
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                ) : (
                  <Package className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
                )}
                
                {/* STATUS BADGE */}
                <div className="absolute top-2 left-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase shadow-md ${
                    item.status === 'encontrado' 
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                      : item.status === 'aguardando_retirada'
                        ? 'bg-[#0033FF]/15 text-[#0033FF] border border-[#0033FF]/20'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {item.status === 'encontrado' ? 'Na Portaria' : item.status === 'aguardando_retirada' ? 'Retirada' : 'Entregue'}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                  className="absolute bottom-2 right-2 bg-black/60 hover:bg-[#0033FF] text-white p-1 rounded-md transition-colors border border-zinc-700 cursor-pointer"
                  title="Expandir Imagem"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* CONTEÚDO */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    <MapPin className="w-3.5 h-3.5 mr-0.5 text-zinc-400 dark:text-zinc-500" />
                    {item.local}
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold line-clamp-2 leading-relaxed">
                    {item.descricao}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-col space-y-2">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-zinc-400 dark:text-zinc-500" />
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </span>

                  {/* CONTROLE RÁPIDO DO STATUS */}
                  {item.status !== 'entregue' && (
                    <div className="flex gap-1.5 pt-1">
                      {item.status === 'encontrado' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(item.id, 'aguardando_retirada');
                          }}
                          className="flex-1 text-[9px] font-bold py-1.5 bg-[#0033FF]/10 hover:bg-[#0033FF]/20 text-[#0033FF] border border-[#0033FF]/20 rounded-md transition-colors cursor-pointer"
                        >
                          Pronto
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(item.id, 'entregue');
                        }}
                        className="flex-1 text-[9px] font-bold py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-650 dark:text-emerald-450 border border-emerald-500/20 rounded-md transition-colors cursor-pointer"
                      >
                        Entregar
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* FORM MODAL: CADASTRAR NOVO ACHADO PELA PORTARIA */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center">
                <Package className="w-4 h-4 text-[#0033FF] mr-2" />
                Registrar Pertence Encontrado
              </h3>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successMsg ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 rounded-full flex items-center justify-center animate-bounce">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Objeto Registrado!</h4>
                <p className="text-[10px] text-zinc-500">O item já está listado no mural público dos moradores.</p>
              </div>
            ) : (
              <form onSubmit={handleCadastrarObjeto} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">O que foi achado?</label>
                  <textarea
                    rows={2}
                    placeholder="Descreva o pertence de forma simples..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-[#0033FF]/50 focus:ring-4 focus:ring-[#0033FF]/10 font-medium"
                    required
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Onde foi encontrado?</label>
                  <input
                    type="text"
                    placeholder="Ex: Próximo à portaria principal"
                    value={local}
                    onChange={(e) => setLocal(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-[#0033FF]/50 focus:ring-4 focus:ring-[#0033FF]/10 font-semibold"
                    required
                  />
                </div>
                           <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Foto do Pertence (Opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {foto ? (
                    <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 aspect-video bg-zinc-50 dark:bg-zinc-950">
                      <img src={foto} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFoto('')}
                        className="absolute top-2 right-2 bg-black/80 hover:bg-red-500 text-white text-[9px] font-bold px-2.5 py-1.5 rounded transition-all border border-zinc-700"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={compressing}
                      className="w-full border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg py-5 flex flex-col items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 transition-colors"
                    >
                      {compressing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mb-1 text-[#0033FF]" />
                          <span className="text-[10px] font-bold">Processando foto...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mb-1.5 text-zinc-400 dark:text-zinc-500" />
                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tirar Foto / Upload</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || compressing}
                    className="w-full bg-[#0033FF] hover:bg-[#0033FF]/90 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(0,51,255,0.20)] active:scale-[0.98] disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Registrando objeto...
                      </>
                    ) : (
                      'Publicar Pertence'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 relative">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <div className="flex items-center space-x-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                <Package className="w-4 h-4 text-[#0033FF]" />
                <span>Objeto Achado</span>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              
              {/* IMAGEM AMPLIADA */}
              {selectedItem.foto_url && (
                <div className="rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 aspect-video relative">
                  <img src={selectedItem.foto_url} alt="Objeto Ampliado" className="w-full h-full object-contain" />
                </div>
              )}

              {/* DETALHES */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-wider">Local Encontrado</span>
                  <p className="text-zinc-900 dark:text-white font-bold mt-0.5 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-zinc-400 dark:text-zinc-500" />
                    {selectedItem.local}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-wider">Registrado em</span>
                  <p className="text-zinc-900 dark:text-white font-bold mt-0.5">
                    {new Date(selectedItem.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-wider">Unidade Cadastradora</span>
                  <p className="text-zinc-700 dark:text-zinc-350 font-medium mt-0.5">
                    {selectedItem.bloco === 'Portaria' ? 'Portaria (Concierge)' : `Morador ${selectedItem.bloco}-${selectedItem.apartamento}`}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-wider">Status do Objeto</span>
                  <div className="mt-1 flex items-center space-x-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      selectedItem.status === 'encontrado' ? 'bg-amber-500' : selectedItem.status === 'aguardando_retirada' ? 'bg-[#0033FF]' : 'bg-emerald-500'
                    }`}></span>
                    <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[9px]">
                      {selectedItem.status === 'encontrado' ? 'Na Portaria' : selectedItem.status === 'aguardando_retirada' ? 'Retirada' : 'Entregue'}
                    </span>
                  </div>
                </div>
              </div>

              {/* DESCRIÇÃO */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Descrição</span>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-semibold bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  {selectedItem.descricao}
                </p>
              </div>

              {/* CONTROLES DE STATUS */}
              {selectedItem.status !== 'entregue' && (
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Alterar Status do Pertence</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.status === 'encontrado' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedItem.id, 'aguardando_retirada')}
                        className="py-2 px-3 bg-[#0033FF]/10 hover:bg-[#0033FF]/20 text-[#0033FF] border border-[#0033FF]/20 rounded-lg text-xs font-bold transition-all"
                      >
                        Pronto p/ Retirada
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateStatus(selectedItem.id, 'entregue')}
                      className="py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-650 dark:text-emerald-455 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all"
                    >
                      Marcar como Entregue
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
