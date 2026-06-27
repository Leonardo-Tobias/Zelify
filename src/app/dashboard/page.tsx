'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Wrench, 
  Package, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Plus, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Building2,
  Activity,
  ArrowUpRight,
  Loader2,
  Lock,
  Layers
} from 'lucide-react';
import { db, Chamado, Condominio, UsuarioGestor } from '@/lib/db';

function DashboardHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  const isPortfolioView = view === 'portfolio';

  const [gestor, setGestor] = useState<UsuarioGestor | null>(null);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCorporate, setIsCorporate] = useState(false);
  const [portfolioCondos, setPortfolioCondos] = useState<Array<{
    id: string;
    nome: string;
    slug: string;
    plan_type: 'free' | 'pro' | 'corporate';
    subscription_status: 'active' | 'past_due' | 'canceled';
    totalChamados: number;
    pendentes: number;
    emExecucao: number;
    health: 'Estável' | 'Atenção' | 'Crítico';
  }>>([]);

  // Verificar sessão do gestor e condomínio ativo
  useEffect(() => {
    const savedGestor = localStorage.getItem('zelify_gestor');
    if (!savedGestor) {
      router.push('/login');
      return;
    }

    // Se o usuário selecionou um plano no cadastro (vindo da LP), redireciona direto para faturamento
    if (typeof window !== 'undefined') {
      const selectedPlan = localStorage.getItem('zelify_selected_plan_on_signup');
      if (selectedPlan) {
        localStorage.removeItem('zelify_selected_plan_on_signup');
        router.push(`/dashboard/configuracoes?tab=faturamento&plan=${selectedPlan}`);
        return;
      }
    }
    
    const parsedGestor = JSON.parse(savedGestor) as UsuarioGestor;
    setGestor(parsedGestor);

    const savedCondo = localStorage.getItem('zelify_condominio_gestao');
    let currentCondo = savedCondo ? (JSON.parse(savedCondo) as Condominio) : null;
    setCondominio(currentCondo);

    async function loadConfig() {
      try {
        const list = await db.getCondominiosByGestorUser(parsedGestor.user_id);
        
        // Atualiza a sessão local com as informações mais recentes do banco de dados (plano, status, etc)
        if (currentCondo) {
          const freshCondo = list.find(c => c.id === currentCondo!.id);
          if (freshCondo) {
            currentCondo = freshCondo;
            setCondominio(freshCondo);
            localStorage.setItem('zelify_condominio_gestao', JSON.stringify(freshCondo));
          }
        }

        const hasCorporate = list.some(c => c.plan_type === 'corporate');
        const isCorp = hasCorporate || list.length > 1;
        setIsCorporate(isCorp);

        if (isCorp && (isPortfolioView || !currentCondo)) {
          // Carregar dados do portfólio
          const data = await Promise.all(list.map(async (condo) => {
            const tickets = await db.getChamados(condo.id);
            const total = tickets.length;
            const pending = tickets.filter(t => t.tipo === 'manutencao' && t.status === 'pendente').length;
            const running = tickets.filter(t => t.tipo === 'manutencao' && t.status === 'em_execucao').length;
            
            let healthState: 'Estável' | 'Atenção' | 'Crítico' = 'Estável';
            if (pending >= 4) {
              healthState = 'Crítico';
            } else if (pending >= 1) {
              healthState = 'Atenção';
            }
            
            return {
              id: condo.id,
              nome: condo.nome,
              slug: condo.slug,
              plan_type: condo.plan_type,
              subscription_status: condo.subscription_status,
              totalChamados: total,
              pendentes: pending,
              emExecucao: running,
              health: healthState
            };
          }));
          setPortfolioCondos(data);
        } else if (currentCondo) {
          // Carregar dados de um único condomínio
          const data = await db.getChamados(currentCondo.id);
          setChamados(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadConfig();
  }, [router, isPortfolioView]);

  const handleManageCondo = async (condoId: string) => {
    if (!gestor) return;
    try {
      const list = await db.getCondominiosByGestorUser(gestor.user_id);
      const target = list.find(c => c.id === condoId);
      if (target) {
        localStorage.setItem('zelify_condominio_gestao', JSON.stringify(target));
        window.dispatchEvent(new Event('storage'));
        router.push('/dashboard');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20 text-zinc-500">
        <Loader2 className="w-8 h-8 text-[#0033FF] animate-spin mb-4" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando dados...</span>
      </div>
    );
  }

  // --- MODO PORTFÓLIO ---
  if (isPortfolioView || (isCorporate && !condominio)) {
    const totalPrédios = portfolioCondos.length;
    const totalChamadosTodos = portfolioCondos.reduce((acc, c) => acc + c.totalChamados, 0);
    const prediosSaudaveis = portfolioCondos.filter(c => c.health === 'Estável').length;
    const totalPendencias = portfolioCondos.reduce((acc, c) => acc + c.pendentes, 0);

    return (
      <div className="space-y-6 relative">
        {/* CABEÇALHO PORTFÓLIO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Carteira de Condomínios</h1>
            <p className="text-xs text-zinc-500 font-medium">Visão de gerenciamento multi-condomínio e saúde operacional</p>
          </div>
        </div>

        {/* GRID DE MÉTRICAS PORTFÓLIO */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: TOTAL DE PRÉDIOS */}
          <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total de Prédios</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-550 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="pt-4">
              <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{totalPrédios}</span>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">Prédios sob sua gestão</p>
            </div>
          </div>

          {/* CARD 2: OCORRÊNCIAS TOTAIS */}
          <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Chamados Totais</span>
              <div className="w-8 h-8 rounded-lg bg-[#0033FF]/10 border border-[#0033FF]/15 flex items-center justify-center text-[#0033FF] group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="pt-4">
              <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{totalChamadosTodos}</span>
              <p className="text-[10px] text-zinc-550 mt-1 font-semibold">Ocorrências registradas na carteira</p>
            </div>
          </div>

          {/* CARD 3: PRÉDIOS SAUDÁVEIS */}
          <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Prédios Saudáveis</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="pt-4">
              <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{prediosSaudaveis}</span>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">Nenhuma pendência ativa</p>
            </div>
          </div>

          {/* CARD 4: MANUTENÇÕES PENDENTES */}
          <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pendências Críticas</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="pt-4">
              <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{totalPendencias}</span>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">Chamados aguardando revisão</p>
            </div>
          </div>
        </div>

        {/* TABELA DE PRÉDIOS */}
        <div className="bg-white dark:bg-zinc-925/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/30">
            <h3 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Carteira de Prédios</h3>
            <span className="text-[9px] bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Visão Consolidada</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/10">
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Condomínio</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Plano</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ocorrências Ativas</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status Operacional</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {portfolioCondos.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-55/20 dark:hover:bg-white/[0.01] transition-all">
                    {/* NOME / SLUG */}
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0033FF]/10 border border-[#0033FF]/20 flex items-center justify-center text-[#0033FF] font-black text-xs shrink-0">
                          {item.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">{item.nome}</p>
                          <p className="text-[10px] text-zinc-550 font-mono mt-0.5 leading-none">/{item.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* PLANO BADGE */}
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                          item.plan_type === 'corporate'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : item.plan_type === 'pro'
                              ? 'bg-[#0033FF]/10 text-[#0033FF] border-[#0033FF]/20'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-550 border-zinc-200 dark:border-zinc-800'
                        }`}>
                          {item.plan_type}
                        </span>
                        {item.subscription_status === 'past_due' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/25 uppercase tracking-wider animate-pulse">
                            Atrasado
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CHAMADOS ATIVOS */}
                    <td className="px-5 py-4">
                      <div>
                        <span className="text-xs font-semibold text-zinc-850 dark:text-zinc-200">
                          {item.totalChamados} chamados
                        </span>
                        <div className="text-[10px] text-zinc-500 mt-0.5 flex space-x-1.5">
                          <span>{item.pendentes} pendentes</span>
                          <span>•</span>
                          <span>{item.emExecucao} em andamento</span>
                        </div>
                      </div>
                    </td>

                    {/* HEALTH STATUS */}
                    <td className="px-5 py-4">
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider inline-flex items-center space-x-1 ${
                        item.health === 'Estável'
                          ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/15'
                          : item.health === 'Atenção'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/15'
                            : 'bg-red-500/10 text-red-450 border-red-500/15 font-extrabold shadow-[0_0_12px_rgba(239,68,68,0.1)]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 shrink-0 ${
                          item.health === 'Estável' ? 'bg-emerald-500' : item.health === 'Atenção' ? 'bg-amber-500' : 'bg-red-500'
                        }`}></span>
                        {item.health}
                      </span>
                    </td>

                    {/* GERENCIAR BUTTON */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleManageCondo(item.id)}
                        className="bg-[#0033FF]/10 hover:bg-[#0033FF] hover:text-white text-[#0033FF] text-[10px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center space-x-1 transition-all border border-[#0033FF]/20 active:scale-[0.98] cursor-pointer"
                      >
                        <span>Gerenciar</span>
                        <ArrowRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- MODO CONDOMÍNIO ÚNICO ---
  const manutencoes = chamados.filter(c => c.tipo === 'manutencao');
  const pendentes = manutencoes.filter(c => c.status === 'pendente').length;
  const emExecucao = manutencoes.filter(c => c.status === 'em_execucao').length;
  const resolvidos = manutencoes.filter(c => c.status === 'resolvido').length;

  const achados = chamados.filter(c => c.tipo === 'achado_perdido');
  const achadosAtivos = achados.filter(c => c.status === 'encontrado' || c.status === 'aguardando_retirada').length;

  const ultimasAtividades = chamados.slice(0, 5);

  return (
    <div className="space-y-6 relative">
      {/* BANNER DE ASSINATURA PENDENTE/BLOQUEADA */}
      {condominio?.subscription_status !== 'active' && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-semibold leading-relaxed flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">Assinatura Suspensa (Bloqueada)</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                Seu portal de moradores está bloqueado para novos chamados devido a pendências de pagamento. Regularize para reestabelecer o serviço.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/configuracoes?tab=faturamento')}
            className="bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 transition-all active:scale-[0.97] cursor-pointer"
          >
            Regularizar Assinatura
          </button>
        </div>
      )}
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
            <p className="text-[10px] text-zinc-550 mt-1 font-semibold">Chamados aguardando revisão</p>
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
            <p className="text-[10px] text-zinc-550 mt-1 font-semibold">Em andamento pelas equipes</p>
          </div>
        </div>

        {/* CARD 3: ACHADOS ATIVOS */}
        <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl transition-all hover:border-zinc-300 dark:hover:border-zinc-700 group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Achados Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-450 group-hover:scale-105 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-4">
            <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{achadosAtivos}</span>
            <p className="text-[10px] text-zinc-550 mt-1 font-semibold">Pertences retidos na portaria</p>
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
            <p className="text-[10px] text-zinc-550 mt-1 font-semibold">Manutenções finalizadas</p>
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
              <div key={item.id} className="px-5 py-4 hover:bg-zinc-55/20 dark:hover:bg-white/[0.02] transition-all flex justify-between items-center gap-4">
                <div className="flex space-x-3 items-start min-w-0">
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
                        <MapPin className="w-3 text-zinc-500 mr-1 shrink-0" />
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

export default function DashboardHome() {
  return (
    <React.Suspense fallback={
      <div className="h-full flex flex-col items-center justify-center py-20 text-zinc-500">
        <Loader2 className="w-8 h-8 text-[#0033FF] animate-spin mb-4" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando painel...</span>
      </div>
    }>
      <DashboardHomeContent />
    </React.Suspense>
  );
}
