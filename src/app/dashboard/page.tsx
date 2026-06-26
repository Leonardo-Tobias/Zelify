'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wrench, 
  Package, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Plus, 
  ArrowRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { db, Chamado, Condominio } from '@/lib/db';

export default function DashboardHome() {
  const router = useRouter();
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedCondo = localStorage.getItem('zelify_condominio_gestao');
    if (!savedCondo) {
      router.push('/login');
      return;
    }
    
    const condo = JSON.parse(savedCondo) as Condominio;
    setCondominio(condo);

    async function loadData() {
      try {
        const data = await db.getChamados(condo.id);
        setChamados(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20 text-zinc-500">
        <Clock className="w-5 h-5 animate-spin mr-2" />
        <span className="text-xs font-medium">Carregando métricas...</span>
      </div>
    );
  }

  // Estatísticas de Manutenção
  const manutencoes = chamados.filter(c => c.tipo === 'manutencao');
  const pendentes = manutencoes.filter(c => c.status === 'pendente').length;
  const emExecucao = manutencoes.filter(c => c.status === 'em_execucao').length;
  const resolvidos = manutencoes.filter(c => c.status === 'resolvido').length;

  // Estatísticas de Achados e Perdidos
  const achados = chamados.filter(c => c.tipo === 'achado_perdido');
  const achadosAtivos = achados.filter(c => c.status === 'encontrado' || c.status === 'aguardando_retirada').length;

  const ultimasAtividades = chamados.slice(0, 5);

  return (
    <div className="space-y-6 relative">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Painel Operacional</h1>
          <p className="text-xs text-zinc-500 font-medium">Resumo de atividades e métricas do {condominio?.nome}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/dashboard/kanban')}
            className="bg-[#0033FF] hover:bg-[#0033FF]/90 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-[0_4px_20px_rgba(0,51,255,0.25)] active:scale-[0.98]"
          >
            <span>Ver Kanban</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* GRID DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: PENDENTES */}
        <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl transition-all hover:border-zinc-300 dark:hover:border-zinc-700 group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pendentes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-4">
            <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{pendentes}</span>
            <p className="text-[10px] text-zinc-500 mt-1 font-semibold">Chamados aguardando revisão</p>
          </div>
        </div>

        {/* CARD 2: EM EXECUÇÃO */}
        <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl transition-all hover:border-zinc-300 dark:hover:border-zinc-700 group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Em Execução</span>
            <div className="w-8 h-8 rounded-lg bg-[#0033FF]/10 border border-[#0033FF]/15 flex items-center justify-center text-[#0033FF] group-hover:scale-105 transition-transform">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-4">
            <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{emExecucao}</span>
            <p className="text-[10px] text-zinc-500 mt-1 font-semibold">Em andamento pelas equipes</p>
          </div>
        </div>

        {/* CARD 3: ACHADOS ATIVOS */}
        <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl transition-all hover:border-zinc-300 dark:hover:border-zinc-700 group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Achados Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-4">
            <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{achadosAtivos}</span>
            <p className="text-[10px] text-zinc-500 mt-1 font-semibold">Pertences retidos na portaria</p>
          </div>
        </div>

        {/* CARD 4: RESOLVIDOS */}
        <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl transition-all hover:border-zinc-300 dark:hover:border-zinc-700 group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Concluídos</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-450 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-4">
            <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{resolvidos}</span>
            <p className="text-[10px] text-zinc-500 mt-1 font-semibold">Manutenções finalizadas</p>
          </div>
        </div>

      </div>

      {/* FEED DE OCORRÊNCIAS */}
      <div className="bg-white dark:bg-zinc-925/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/30">
          <h3 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Ocorrências Recentes</h3>
          <span className="text-[9px] bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Feed de Atividades</span>
        </div>

        {ultimasAtividades.length === 0 ? (
          <div className="p-16 text-center text-zinc-500 space-y-2">
            <TrendingUp className="w-6 h-6 mx-auto text-zinc-700" />
            <p className="text-xs font-semibold text-zinc-400">Tudo calmo no condomínio.</p>
            <p className="text-[10px] text-zinc-550">Nenhum chamado foi aberto até o momento.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {ultimasAtividades.map((item) => (
              <div key={item.id} className="px-5 py-4 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-all flex justify-between items-center gap-4">
                
                <div className="flex space-x-3 items-start min-w-0">
                  {/* ÍCONE COM CONTAINER SUTIL */}
                  <span className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center ${
                    item.tipo === 'manutencao' 
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/15' 
                      : 'bg-[#0033FF]/10 text-[#0033FF] border-[#0033FF]/15'
                  }`}>
                    {item.tipo === 'manutencao' ? <Wrench className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {item.tipo === 'manutencao' ? 'Manutenção' : 'Achado e Perdido'}
                      </span>
                      <span className="text-zinc-700 text-[10px]">•</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold flex items-center bg-zinc-100 dark:bg-zinc-950/50 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                        <MapPin className="w-3 h-3 text-zinc-500 mr-1 shrink-0" />
                        {item.local}
                      </span>
                      <span className="text-zinc-700 text-[10px]">•</span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        Unidade: {item.bloco === 'Portaria' ? 'Portaria' : `${item.bloco} - Apto ${item.apartamento}`}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-450 font-medium mt-1.5 line-clamp-1 leading-relaxed">
                      {item.descricao}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 space-y-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    item.status === 'pendente' || item.status === 'encontrado'
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/15' 
                      : item.status === 'em_execucao' || item.status === 'aguardando_retirada'
                        ? 'bg-[#0033FF]/10 text-[#0033FF] border-[#0033FF]/15'
                        : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/15'
                  }`}>
                    {item.status === 'pendente' ? 'Pendente' 
                      : item.status === 'em_execucao' ? 'Em andamento' 
                      : item.status === 'resolvido' ? 'Resolvido'
                      : item.status === 'encontrado' ? 'Na Portaria'
                      : item.status === 'aguardando_retirada' ? 'Aguardando Retirada'
                      : 'Entregue'}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-bold font-mono">
                    {new Date(item.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
