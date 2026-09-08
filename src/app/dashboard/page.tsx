'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Wrench, 
  Package, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Building2,
  Activity,
  Loader2,
  FileText,
  FileSpreadsheet,
  X,
  Sparkles,
  Crown
} from 'lucide-react';
import { db, Chamado, Condominio, UsuarioGestor, safeCondoForStorage } from '@/lib/db';
import { useCondominio } from '@/contexts/CondominioContext';
import { OCCURRENCE_CATEGORIES, PRIORITIES, averageResolutionTime, formatDuration, occurrenceTitle } from '@/lib/occurrences';

function DashboardHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  const isPortfolioView = view === 'portfolio';

  const { condominio, isCorporate } = useCondominio();

  const [gestor, setGestor] = useState<UsuarioGestor | null>(null);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolioCondos, setPortfolioCondos] = useState<Array<{
    id: string;
    nome: string;
    slug: string | null;
    plan_type: 'free' | 'pro' | 'corporate';
    subscription_status: 'active' | 'past_due' | 'canceled';
    totalChamados: number;
    pendentes: number;
    emExecucao: number;
    urgentes: number;
    antigas: number;
    tempoMedio: number;
    tickets: Chamado[];
    health: 'Estável' | 'Atenção' | 'Crítico';
  }>>([]);
  const [toastMsg, setToastMsg] = useState<{ type: 'upgrade' | 'error'; title: string; text: string } | null>(null);
  const [portfolioFilters, setPortfolioFilters] = useState({ condominio: 'todos', categoria: 'todas', prioridade: 'todas', status: 'todos', periodo: 'todos', responsavel: '' });

  // Verificar sessão do gestor e condomínio ativo
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  useEffect(() => {
    const savedGestor = localStorage.getItem('zelcon_gestor');
    if (!savedGestor) {
      router.push('/login');
      return;
    }

    // Verificar se tem plano pendente (vindo do cadastro mas sem finalizar pagamento)
    if (typeof window !== 'undefined') {
      const selectedPlan = localStorage.getItem('zelcon_selected_plan_on_signup');
      if (selectedPlan && condominio?.plan_type === 'free') {
        const alreadyRedirected = localStorage.getItem('zelcon_redirected_to_checkout');
        if (!alreadyRedirected) {
          // Primeira vez: redireciona direto pro checkout
          localStorage.setItem('zelcon_redirected_to_checkout', 'true');
          router.push(`/dashboard/configuracoes?tab=faturamento&plan=${selectedPlan}`);
          return;
        }
        // Já foi redirecionado antes: mostra banner
        setPendingPlan(selectedPlan);
      }
    }
    
    const parsedGestor = JSON.parse(savedGestor) as UsuarioGestor;
    setGestor(parsedGestor);

    async function loadConfig() {
      try {
        const list = await db.getCondominiosByGestorUser(parsedGestor.user_id);
        const currentId = condominio?.id;

        const hasCorporate = list.some(c => c.plan_type === 'corporate');
        const isCorp = hasCorporate || list.length > 1;

        if (isCorp && (isPortfolioView || !currentId)) {
          // Carregar dados do portfólio
          const containerIdDrop = list.find(c => c.plan_type === 'corporate' && !c.parent_condominio_id && !c.slug)?.id
          const listItems = list.filter(c => c.id !== containerIdDrop)
          const data = await Promise.all(listItems.map(async (condo) => {
            const tickets = await db.getChamados(condo.id);
            const total = tickets.length;
            const pending = tickets.filter(t => t.tipo === 'manutencao' && t.status === 'pendente').length;
            const running = tickets.filter(t => t.tipo === 'manutencao' && t.status === 'em_execucao').length;
            const urgentes = tickets.filter(t => t.tipo === 'manutencao' && t.prioridade === 'urgente' && t.status !== 'resolvido').length;
            const antigas = tickets.filter(t => t.tipo === 'manutencao' && t.status !== 'resolvido' && Date.now() - new Date(t.created_at).getTime() > 7 * 86400000).length;
            
            let healthState: 'Estável' | 'Atenção' | 'Crítico' = 'Estável';
            if (pending >= 4) {
              healthState = 'Crítico';
            } else if (pending >= 1) {
              healthState = 'Atenção';
            }
            
            return {
              id: condo.id,
              nome: condo.nome,
              slug: condo.slug || null,
              plan_type: condo.plan_type,
              subscription_status: condo.subscription_status,
              totalChamados: total,
              pendentes: pending,
              emExecucao: running,
              urgentes,
              antigas,
              tempoMedio: averageResolutionTime(tickets.filter(t => t.tipo === 'manutencao')),
              tickets,
              health: healthState
            };
          }));
          setPortfolioCondos(data);
        } else if (currentId) {
          const chamadosData = await db.getChamados(currentId);
          setChamados(chamadosData);
        }
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setLoading(false);
      }
    }
    
    loadConfig();
  }, [router, isPortfolioView, condominio?.id, condominio?.plan_type]);

  // Sincronizar dados quando o condominio mudar no localStorage (ex: switch via dropdown)
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('zelcon_condominio_gestao');
      if (!saved) return;
      const updated = JSON.parse(saved) as Condominio;
      if (updated.id !== condominio?.id) {
        window.location.reload();
      }
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [condominio?.id]);

  const handleManageCondo = async (condoId: string) => {
    if (!gestor) return;
    try {
      const list = await db.getCondominiosByGestorUser(gestor.user_id);
      const target = list.find(c => c.id === condoId);
      if (target) {
        localStorage.setItem('zelcon_condominio_gestao', JSON.stringify(safeCondoForStorage(target)));
        window.dispatchEvent(new Event('storage'));
        router.push('/dashboard');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    if (!condominio) return;
    if (condominio.subscription_status !== 'active') {
      setToastMsg({ type: 'error', title: 'Assinatura Inativa', text: 'A exportação de relatórios não está disponível enquanto houver pendências de pagamento. Regularize sua assinatura para liberar esta funcionalidade.' });
      return;
    }
    if (condominio.plan_type === 'free') {
      setToastMsg({ type: 'upgrade', title: 'Funcionalidade Premium', text: 'A exportação de relatórios em CSV é exclusiva dos planos Pro e Corporate.' });
      return;
    }

    const headers = ['Data', 'Tipo', 'Local', 'Unidade', 'Descrição', 'Status'];
    const rows = chamados.map(c => [
      new Date(c.created_at).toLocaleDateString('pt-BR'),
      c.tipo === 'manutencao' ? 'Manutenção' : 'Achado e Perdido',
      c.local,
      c.bloco === 'Portaria' ? 'Portaria' : `${c.bloco} - Apto ${c.apartamento}`,
      `"${c.descricao.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
      c.status === 'pendente' ? 'Recebida'
        : c.status === 'em_execucao' ? 'Em andamento' 
        : c.status === 'resolvido' ? 'Concluída'
        : c.status === 'encontrado' ? 'Na Portaria'
        : c.status === 'aguardando_retirada' ? 'Aguardando Retirada'
        : 'Entregue'
    ]);
    
    const csvString = "\uFEFF" + [headers.join(";")].concat(rows.map(e => e.join(";"))).join("\r\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_Ocorrencias_${condominio.slug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!condominio) return;
    if (condominio.subscription_status !== 'active') {
      setToastMsg({ type: 'error', title: 'Assinatura Inativa', text: 'A exportação de relatórios não está disponível enquanto houver pendências de pagamento. Regularize sua assinatura para liberar esta funcionalidade.' });
      return;
    }
    if (condominio.plan_type === 'free') {
      setToastMsg({ type: 'upgrade', title: 'Funcionalidade Premium', text: 'A exportação de relatórios em PDF é exclusiva dos planos Pro e Corporate.' });
      return;
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const primaryColor = [0, 80, 255]; // #0050FF Zelcon Blue
      const darkColor = [39, 39, 42];    // zinc-800
      const lightGray = [228, 228, 231]; // zinc-200
      
      // Calcs
      const manutencoesList = chamados.filter(c => c.tipo === 'manutencao');
      const pCount = manutencoesList.filter(c => c.status === 'pendente').length;
      const eCount = manutencoesList.filter(c => c.status === 'em_execucao').length;
      const rCount = manutencoesList.filter(c => c.status === 'resolvido').length;
      
      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Zelcon', 20, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(115, 115, 115);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 145, 17);
      doc.text(`Período: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 145, 22);

      // Line
      doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setLineWidth(0.5);
      doc.line(20, 26, 190, 26);
      
      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('Relatório Operacional Mensal', 20, 36);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Condomínio: ${condominio.nome}`, 20, 42);
      doc.text(`Plano: ${condominio.plan_type.toUpperCase()}`, 20, 47);
      
      // Cards
      doc.setFillColor(244, 244, 245);
      doc.roundedRect(20, 53, 38, 20, 2, 2, 'F');
      doc.roundedRect(62, 53, 38, 20, 2, 2, 'F');
      doc.roundedRect(104, 53, 38, 20, 2, 2, 'F');
      doc.roundedRect(146, 53, 44, 20, 2, 2, 'F');
      
      // Pendentes
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(217, 119, 6);
      doc.text(`${pCount}`, 25, 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(82, 82, 91);
      doc.text('Recebidas', 25, 67);
      
      // Em Execução
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${eCount}`, 67, 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(82, 82, 91);
      doc.text('Em andamento', 67, 67);
      
      // Resolvidos
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(5, 150, 105);
      doc.text(`${rCount}`, 109, 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(82, 82, 91);
      doc.text('Concluídos', 109, 67);

      // Total
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`${chamados.length}`, 151, 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(82, 82, 91);
      doc.text('Ocorrências Totais', 151, 67);
      
      // Table
      const tableHeaders = [['Data', 'Tipo', 'Local', 'Unidade', 'Descrição', 'Status']];
      const tableRows = chamados.map(c => [
        new Date(c.created_at).toLocaleDateString('pt-BR'),
        c.tipo === 'manutencao' ? 'Manutenção' : 'Achado/Perdido',
        c.local,
        c.bloco === 'Portaria' ? 'Portaria' : `${c.bloco} - Apto ${c.apartamento}`,
        c.descricao,
        c.status === 'pendente' ? 'Recebida'
          : c.status === 'em_execucao' ? 'Em andamento' 
          : c.status === 'resolvido' ? 'Concluída'
          : c.status === 'encontrado' ? 'Na Portaria'
          : c.status === 'aguardando_retirada' ? 'Aguardando Retirada'
          : 'Entregue'
      ]);
      
      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 82,
        margin: { left: 20, right: 20 },
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor as [number, number, number],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [39, 39, 42]
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 25 },
          4: { cellWidth: 55 },
          5: { cellWidth: 25 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(115, 115, 115);
          doc.text(`Zelcon - Gestão Inteligente de Condomínios`, 20, doc.internal.pageSize.height - 10);
          
          const str = `Página ${data.pageNumber}`;
          doc.text(str, doc.internal.pageSize.width - 20 - doc.getTextWidth(str), doc.internal.pageSize.height - 10);
        }
      });
      
      doc.save(`Relatorio_Mensal_${condominio.slug}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setToastMsg({ type: 'error', title: 'Erro na Exportação', text: 'Não foi possível gerar o relatório em PDF. Tente novamente.' });
    }
  };

  const handleExportPortfolioCSV = () => {
    const headers = ['Condomínio', 'Plano', 'Status Assinatura', 'Total Ocorrências', 'Ocorrências Recebidas', 'Ocorrências Em Andamento', 'Saúde Operacional'];
    const rows = portfolioCondos.map(item => [
      item.nome,
      item.plan_type.toUpperCase(),
      item.subscription_status === 'active' ? 'Ativo' : item.subscription_status === 'past_due' ? 'Bloqueado' : 'Cancelado',
      item.totalChamados,
      item.pendentes,
      item.emExecucao,
      item.health
    ]);
    const csvString = "\uFEFF" + [headers.join(";")].concat(rows.map(e => e.join(";"))).join("\r\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Carteira_Condominios_${gestor?.nome.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPortfolioPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const primaryColor = [0, 51, 255];
      const darkColor = [39, 39, 42];
      const lightGray = [228, 228, 231];
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Zelcon', 20, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(115, 115, 115);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 225, 17);
      
      doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setLineWidth(0.5);
      doc.line(20, 26, 277, 26);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('Relatório Consolidado de Carteira - Zelcon Corporate', 20, 36);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Administradora / Gestor: ${gestor?.nome}`, 20, 42);
      doc.text(`Total de Prédios na Carteira: ${portfolioCondos.length}`, 20, 47);
      
      const tableHeaders = [['Condomínio', 'Plano', 'Status Assinatura', 'Total Ocorrências', 'Recebidas', 'Em andamento', 'Saúde Operacional']];
      const tableRows = portfolioCondos.map(item => [
        item.nome,
        item.plan_type.toUpperCase(),
        item.subscription_status === 'active' ? 'Ativo' : item.subscription_status === 'past_due' ? 'Inadimplente (Bloqueado)' : 'Cancelado',
        item.totalChamados,
        item.pendentes,
        item.emExecucao,
        item.health
      ]);
      
      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 55,
        margin: { left: 20, right: 20 },
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor as [number, number, number],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [39, 39, 42]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(115, 115, 115);
          doc.text(`Zelcon - Painel Consolidado Multi-Condomínios`, 20, doc.internal.pageSize.height - 10);
          
          const str = `Página ${data.pageNumber}`;
          doc.text(str, doc.internal.pageSize.width - 20 - doc.getTextWidth(str), doc.internal.pageSize.height - 10);
        }
      });
      
      doc.save(`Relatorio_Consolidado_Carteira_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      setToastMsg({ type: 'error', title: 'Erro na Exportação', text: 'Não foi possível gerar o PDF da carteira. Tente novamente.' });
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const renderToast = () => {
    if (!toastMsg) return null;
    const isUpgrade = toastMsg.type === 'upgrade';
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-sm w-full">
        <div className={`relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${
          isUpgrade 
            ? 'bg-gradient-to-br from-brand/15 via-zinc-950/95 to-zinc-950/95 border-brand/25 shadow-[0_8px_40px_rgba(0,80,255,0.15)]'
            : 'bg-gradient-to-br from-red-500/10 via-zinc-950/95 to-zinc-950/95 border-red-500/25 shadow-[0_8px_40px_rgba(239,68,68,0.1)]'
        }`}>
          {/* Glow */}
          <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl pointer-events-none ${
            isUpgrade ? 'bg-brand/20' : 'bg-red-500/15'
          }`} />
          
          <div className="relative p-4">
            {/* Close */}
            <button
              onClick={() => setToastMsg(null)}
              className="absolute top-3 right-3 p-1 text-zinc-500 hover:text-white rounded-md hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Icon + Title */}
            <div className="flex items-start space-x-3 pr-6">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                isUpgrade 
                  ? 'bg-brand/15 border-brand/30 text-brand' 
                  : 'bg-red-500/15 border-red-500/30 text-red-400'
              }`}>
                {isUpgrade ? <Crown className="w-4.5 h-4.5" /> : <AlertTriangle className="w-4.5 h-4.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight">{toastMsg.title}</p>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed font-medium">{toastMsg.text}</p>
              </div>
            </div>

            {/* CTA for upgrade */}
            {isUpgrade && (
              <button
                onClick={() => {
                  setToastMsg(null);
                  router.push('/dashboard/configuracoes?tab=faturamento');
                }}
                className="w-full mt-3.5 py-2 bg-brand hover:bg-brand/90 text-white text-[11px] font-bold rounded-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1.5 shadow-[0_4px_15px_rgba(0,80,255,0.25)]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fazer Upgrade Agora</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20 text-zinc-500">
        <Loader2 className="w-8 h-8 text-brand animate-spin mb-4" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando dados...</span>
      </div>
    );
  }

  // --- MODO PORTFÓLIO ---
  if (isPortfolioView || (isCorporate && !condominio)) {
    const now = Date.now();
    const filteredPortfolio = portfolioCondos.filter(item => portfolioFilters.condominio === 'todos' || item.id === portfolioFilters.condominio).map(item => {
      const tickets = item.tickets.filter(ticket => {
        if (portfolioFilters.categoria !== 'todas' && (ticket.categoria || 'Manutenção') !== portfolioFilters.categoria) return false;
        if (portfolioFilters.prioridade !== 'todas' && (ticket.prioridade || 'normal') !== portfolioFilters.prioridade) return false;
        if (portfolioFilters.status !== 'todos' && ticket.status !== portfolioFilters.status) return false;
        if (portfolioFilters.periodo !== 'todos' && now - new Date(ticket.created_at).getTime() > Number(portfolioFilters.periodo) * 86400000) return false;
        if (portfolioFilters.responsavel && !(ticket.responsavel || '').toLowerCase().includes(portfolioFilters.responsavel.toLowerCase())) return false;
        return ticket.tipo === 'manutencao';
      });
      return { ...item, totalChamados: tickets.length, pendentes: tickets.filter(t => t.status === 'pendente').length, emExecucao: tickets.filter(t => t.status === 'em_execucao').length, urgentes: tickets.filter(t => t.prioridade === 'urgente' && t.status !== 'resolvido').length, antigas: tickets.filter(t => t.status !== 'resolvido' && now - new Date(t.created_at).getTime() > 7 * 86400000).length, tempoMedio: averageResolutionTime(tickets) };
    });
    const totalPrédios = filteredPortfolio.length;
    const totalChamadosTodos = filteredPortfolio.reduce((acc, c) => acc + c.pendentes + c.emExecucao, 0);
    const totalUrgentes = filteredPortfolio.reduce((acc, c) => acc + c.urgentes, 0);
    const totalAntigas = filteredPortfolio.reduce((acc, c) => acc + c.antigas, 0);
    const resolutionValues = filteredPortfolio.filter(c => c.tempoMedio > 0);
    const tempoMedioCarteira = resolutionValues.length ? resolutionValues.reduce((sum, c) => sum + c.tempoMedio, 0) / resolutionValues.length : 0;

    return (
      <div className="space-y-6 relative">
        {/* CABEÇALHO PORTFÓLIO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Visão da Administradora</h1>
            <p className="text-xs text-zinc-500 font-medium">Visão consolidada da operação de todos os condomínios</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleExportPortfolioPDF}
              className="bg-white dark:bg-zinc-925 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Exportar PDF</span>
            </button>
            <button 
              onClick={handleExportPortfolioCSV}
              className="bg-white dark:bg-zinc-925 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 bg-white dark:bg-zinc-925/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
          <select value={portfolioFilters.condominio} onChange={e => setPortfolioFilters(value => ({ ...value, condominio: e.target.value }))} className="filter-field"><option value="todos">Todos os condomínios</option>{portfolioCondos.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>
          <select value={portfolioFilters.categoria} onChange={e => setPortfolioFilters(value => ({ ...value, categoria: e.target.value }))} className="filter-field"><option value="todas">Todas as categorias</option>{OCCURRENCE_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select>
          <select value={portfolioFilters.prioridade} onChange={e => setPortfolioFilters(value => ({ ...value, prioridade: e.target.value }))} className="filter-field"><option value="todas">Todas as prioridades</option>{PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={portfolioFilters.status} onChange={e => setPortfolioFilters(value => ({ ...value, status: e.target.value }))} className="filter-field"><option value="todos">Todos os status</option><option value="pendente">Recebidas</option><option value="em_execucao">Em andamento</option><option value="resolvido">Concluídas</option></select>
          <select value={portfolioFilters.periodo} onChange={e => setPortfolioFilters(value => ({ ...value, periodo: e.target.value }))} className="filter-field"><option value="todos">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select>
          <input value={portfolioFilters.responsavel} onChange={e => setPortfolioFilters(value => ({ ...value, responsavel: e.target.value }))} placeholder="Responsável" className="filter-field" />
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
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ocorrências abertas</span>
              <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/15 flex items-center justify-center text-brand group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="pt-4">
              <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{totalChamadosTodos}</span>
              <p className="text-[10px] text-zinc-550 mt-1 font-semibold">Recebidas e em andamento</p>
            </div>
          </div>

          {/* CARD 3: PRÉDIOS SAUDÁVEIS */}
          <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Urgentes</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="pt-4">
              <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{totalUrgentes}</span>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">Exigem atenção imediata</p>
            </div>
          </div>

          {/* CARD 4: MANUTENÇÕES PENDENTES */}
          <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Abertas há mais de 7 dias</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="pt-4">
              <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{totalAntigas}</span>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">Tempo médio: {formatDuration(tempoMedioCarteira)}</p>
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
                {filteredPortfolio.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-55/20 dark:hover:bg-white/[0.01] transition-all">
                    {/* NOME / SLUG */}
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-black text-xs shrink-0">
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
                              ? 'bg-brand/10 text-brand border-brand/20'
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
                          {item.pendentes + item.emExecucao} abertas
                        </span>
                        <div className="text-[10px] text-zinc-500 mt-0.5 flex space-x-1.5">
                          <span>{item.urgentes} urgentes</span>
                          <span>•</span>
                          <span>{item.emExecucao} em andamento · média {formatDuration(item.tempoMedio)}</span>
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
                        className="bg-brand/10 hover:bg-brand hover:text-white text-brand text-[10px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center space-x-1 transition-all border border-brand/20 active:scale-[0.98] cursor-pointer"
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
        {renderToast()}
      </div>
    );
  }

  // --- MODO CONDOMÍNIO ÚNICO ---
  const manutencoes = chamados.filter(c => c.tipo === 'manutencao');
  const pendentes = manutencoes.filter(c => c.status === 'pendente').length;
  const emExecucao = manutencoes.filter(c => c.status === 'em_execucao').length;
  const urgentes = manutencoes.filter(c => c.prioridade === 'urgente' && c.status !== 'resolvido').length;
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const concluidasNoMes = manutencoes.filter(c => c.completed_at && new Date(c.completed_at).getTime() >= startOfMonth).length;
  const tempoMedioResolucao = averageResolutionTime(manutencoes);


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
      {/* BANNER DE UPGRADE PENDENTE */}
      {pendingPlan && (
        <div className="p-4 bg-brand/10 border border-brand/20 rounded-xl text-xs font-semibold leading-relaxed flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 shrink-0 text-brand mt-0.5" />
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">
                Assinatura {pendingPlan === 'pro' ? 'Zelcon Pro' : 'Zelcon Corporate'} pendente
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                Você iniciou a contratação do plano {pendingPlan === 'pro' ? 'Pro' : 'Corporate'} mas ainda não finalizou o pagamento. Clique abaixo para continuar.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                localStorage.removeItem('zelcon_selected_plan_on_signup');
                localStorage.removeItem('zelcon_redirected_to_checkout');
                setPendingPlan(null);
              }}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-[11px] px-2 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Dispensar
            </button>
            <button
              onClick={() => router.push(`/dashboard/configuracoes?tab=faturamento&plan=${pendingPlan}`)}
              className="bg-brand hover:bg-brand/90 text-white text-[11px] font-semibold px-3 py-2 rounded-md transition-colors cursor-pointer"
            >
              Finalizar Pagamento
            </button>
          </div>
        </div>
      )}
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Visão geral</h1>
          <p className="text-xs text-zinc-500 font-medium">Resumo de atividades e métricas do {condominio?.nome}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleExportPDF}
            className="bg-white dark:bg-zinc-925 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-white dark:bg-zinc-925 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
          <button 
            onClick={() => router.push('/dashboard/kanban')}
            className="bg-brand hover:bg-brand/90 text-white text-xs font-semibold px-4 py-2.5 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <span>Gestão de Ocorrências</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* GRID DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: PENDENTES */}
        <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl flex flex-col justify-between transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 group">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-500">Ocorrências abertas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-4">
            <span className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">{pendentes + emExecucao}</span>
            <p className="text-xs text-zinc-500 mt-1">Recebidas e em andamento</p>
          </div>
        </div>

        {/* CARD 2: EM EXECUÇÃO */}
        <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl flex flex-col justify-between transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 group">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-500">Em andamento</span>
            <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/15 flex items-center justify-center text-brand group-hover:scale-105 transition-transform">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-4">
            <span className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">{emExecucao}</span>
            <p className="text-xs text-zinc-500 mt-1">Em andamento pelas equipes</p>
          </div>
        </div>

        {/* CARD 3: URGENTES */}
        <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl flex flex-col justify-between transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 group">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-500">Urgentes</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-450 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-4">
            <span className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">{urgentes}</span>
            <p className="text-xs text-zinc-500 mt-1">Exigem atenção imediata</p>
          </div>
        </div>

        {/* CARD 4: RESOLVIDOS */}
        <div className="bg-white dark:bg-zinc-925/80 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl flex flex-col justify-between transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 group">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-500">Concluídas no mês</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-450 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-4">
            <span className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">{concluidasNoMes}</span>
            <p className="text-xs text-zinc-500 mt-1">Tempo médio: {formatDuration(tempoMedioResolucao)}</p>
          </div>
        </div>
      </div>

      {/* FEED DE OCORRÊNCIAS */}
      <div className="bg-white dark:bg-zinc-925/60 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/30">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Ocorrências recentes</h3>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Atualizações mais recentes</span>
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
                      : 'bg-brand/10 text-brand border-brand/15'
                  }`}>
                    {item.tipo === 'manutencao' ? <Wrench className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {item.tipo === 'manutencao' ? occurrenceTitle(item) : 'Achado e Perdido'}
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
                        ? 'bg-brand/10 text-brand border-brand/15'
                        : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/15'
                  }`}>
                    {item.status === 'pendente' ? 'Recebida'
                      : item.status === 'em_execucao' ? 'Em andamento' 
                      : item.status === 'resolvido' ? 'Concluída'
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
      {renderToast()}
    </div>
  );
}

export default function DashboardHome() {
  return (
    <React.Suspense fallback={
      <div className="h-full flex flex-col items-center justify-center py-20 text-zinc-500">
        <Loader2 className="w-8 h-8 text-brand animate-spin mb-4" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando painel...</span>
      </div>
    }>
      <DashboardHomeContent />
    </React.Suspense>
  );
}
