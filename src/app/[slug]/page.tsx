'use client';

if (typeof window !== 'undefined') {
  window.onerror = function(msg, url, line, col, error) {
    alert(`CRITICAL CLIENT ERROR: ${msg}\nUrl: ${url}\nLine: ${line}\nStack: ${error?.stack}`);
    return false;
  };
}

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Wrench, 
  Package, 
  CheckCircle2, 
  Plus, 
  Camera, 
  LogOut, 
  AlertCircle, 
  Loader2, 
  Check, 
  MapPin, 
  Building,
  Image as ImageIcon,
  ChevronRight,
  ArrowLeft,
  X
} from 'lucide-react';
import { db, Condominio, Chamado, isSupabaseConfigured } from '@/lib/db';
import { compressImage } from '@/lib/imageCompressor';

export default function MoradorPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Estados de Carregamento e Dados do Condomínio
  const [loading, setLoading] = useState(true);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // Capturar erros globais e logs no navegador
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShowDebug(window.location.search.includes('debug=true'));
      const handleError = (e: ErrorEvent) => {
        setDebugError(`Erro Runtime: ${e.message} em ${e.filename}:${e.lineno}`);
      };
      const handleRejection = (e: PromiseRejectionEvent) => {
        setDebugError(`Promessa Rejeitada: ${e.reason?.message || String(e.reason)}`);
      };
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleRejection);

      // Polling para os logs de execução interna
      const interval = setInterval(() => {
        const w = window as any;
        if (w.clientLogs) {
          setLogs([...w.clientLogs]);
        }
      }, 300);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleRejection);
        clearInterval(interval);
      };
    }
  }, []);

  // Estados de Validação do Morador
  const [validated, setValidated] = useState(false);
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [bloco, setBloco] = useState('');
  const [apartamento, setApartamento] = useState('');
  const [validationError, setValidationError] = useState('');
  const [validating, setValidating] = useState(false);

  // Estados do Painel do Morador
  const [activeTab, setActiveTab] = useState<'manutencao' | 'achados' | 'historico'>('manutencao');
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loadingChamados, setLoadingChamados] = useState(false);

  // Histórico de chamados relatados nesta sessão
  const [meusChamadosIds, setMeusChamadosIds] = useState<string[]>([]);

  // Modais de Criação e Visualização
  const [showManutencaoModal, setShowManutencaoModal] = useState(false);
  const [showAchadoModal, setShowAchadoModal] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<any | null>(null);

  // Formulário: Relatar Problema
  const [localProblema, setLocalProblema] = useState('Garagem');
  const [outroLocal, setOutroLocal] = useState('');
  const [descricaoProblema, setDescricaoProblema] = useState('');
  const [fotoProblema, setFotoProblema] = useState<string>('');
  const [compressingImage, setCompressingImage] = useState(false);
  const [submittingProblema, setSubmittingProblema] = useState(false);
  const [problemaSuccess, setProblemaSuccess] = useState(false);

  // Formulário: Cadastrar Achado
  const [descricaoAchado, setDescricaoAchado] = useState('');
  const [localAchado, setLocalAchado] = useState('');
  const [fotoAchado, setFotoAchado] = useState<string>('');
  const [submittingAchado, setSubmittingAchado] = useState(false);
  const [achadoSuccess, setAchadoSuccess] = useState(false);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Carregar condomínio no início
  useEffect(() => {
    if (!slug) {
      // Se não há slug (router não resolveu), apenas aguarda
      return;
    }

    async function loadCondo() {
      try {
        setLoading(true);
        const condo = await db.getCondominioBySlug(slug);
        setCondominio(condo);
        
        if (condo) {
          // Verificar se já está autenticado para este condomínio no localStorage
          const savedAuth = localStorage.getItem(`zelify_auth_${condo.id}`);
          if (savedAuth) {
            try {
              const authData = JSON.parse(savedAuth);
              setBloco(authData.bloco);
              setApartamento(authData.apartamento);
              setValidated(true);
            } catch (e) {
              localStorage.removeItem(`zelify_auth_${condo.id}`);
            }
          }
          
          // Carregar IDs de chamados criados localmente
          const savedIds = localStorage.getItem(`zelify_meus_chamados_${condo.id}`);
          if (savedIds) {
            setMeusChamadosIds(JSON.parse(savedIds));
          }
        }
      } catch (err) {
        console.error('Erro ao carregar condomínio:', err);
        setDebugError(`Erro loadCondo: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    }
    loadCondo();
  }, [slug]);

  // Carregar chamados sempre que validação ou aba mudar
  useEffect(() => {
    if (!condominio || !validated) return;

    async function loadData() {
      setLoadingChamados(true);
      try {
        const data = await db.getChamados(condominio!.id);
        setChamados(data);
      } catch (err) {
        console.error('Erro ao carregar chamados:', err);
      } finally {
        setLoadingChamados(false);
      }
    }
    loadData();
  }, [condominio, validated, problemaSuccess, achadoSuccess]);

  // Validar acesso do morador
  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!codigoAcesso || !bloco || !apartamento) {
      setValidationError('Por favor, preencha todos os campos.');
      return;
    }

    setValidating(true);
    try {
      const isValid = await db.validateAcesso(condominio!.id, codigoAcesso);
      if (isValid) {
        // Salvar autenticação
        const authData = { bloco, apartamento };
        localStorage.setItem(`zelify_auth_${condominio!.id}`, JSON.stringify(authData));
        setValidated(true);
      } else {
        setValidationError('Código de acesso incorreto. Tente novamente.');
      }
    } catch (err) {
      setValidationError('Ocorreu um erro ao validar. Tente novamente.');
    } finally {
      setValidating(false);
    }
  };

  // Logout do morador
  const handleLogout = () => {
    if (confirm('Deseja sair do portal do condomínio?')) {
      localStorage.removeItem(`zelify_auth_${condominio!.id}`);
      setValidated(false);
      setCodigoAcesso('');
    }
  };

  // Processamento e compressão de foto
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'problema' | 'achado') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingImage(true);
    try {
      const base64 = await compressImage(file, 800, 800, 0.7);
      if (type === 'problema') {
        setFotoProblema(base64);
      } else {
        setFotoAchado(base64);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao processar imagem.');
    } finally {
      setCompressingImage(false);
    }
  };

  // Criar Chamado de Manutenção
  const handleSubmeteProblema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricaoProblema.trim()) {
      alert('Por favor, descreva o problema.');
      return;
    }

    setSubmittingProblema(true);
    try {
      const localReal = localProblema === 'Outro' ? outroLocal : localProblema;
      
      // Upload da foto (em modo mock retorna base64, em supabase envia para storage)
      let finalFotoUrl = '';
      if (fotoProblema) {
        finalFotoUrl = await db.uploadImagem(fotoProblema, condominio!.id);
      }

      const novoChamado = await db.createChamado({
        condominio_id: condominio!.id,
        tipo: 'manutencao',
        local: localReal || 'Outro',
        bloco,
        apartamento,
        descricao: descricaoProblema,
        foto_url: finalFotoUrl,
        status: 'pendente'
      });

      // Salvar ID localmente para rastrear que foi criado por este morador
      const novosIds = [...meusChamadosIds, novoChamado.id];
      setMeusChamadosIds(novosIds);
      localStorage.setItem(`zelify_meus_chamados_${condominio!.id}`, JSON.stringify(novosIds));

      setProblemaSuccess(true);
      setTimeout(() => {
        setShowManutencaoModal(false);
        setProblemaSuccess(false);
        // Resetar form
        setLocalProblema('Garagem');
        setOutroLocal('');
        setDescricaoProblema('');
        setFotoProblema('');
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar chamado.');
    } finally {
      setSubmittingProblema(false);
    }
  };

  // Criar Achado
  const handleSubmeteAchado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricaoAchado.trim() || !localAchado.trim()) {
      alert('Por favor, preencha descrição e local onde encontrou.');
      return;
    }

    setSubmittingAchado(true);
    try {
      let finalFotoUrl = '';
      if (fotoAchado) {
        finalFotoUrl = await db.uploadImagem(fotoAchado, condominio!.id);
      }

      await db.createChamado({
        condominio_id: condominio!.id,
        tipo: 'achado_perdido',
        local: localAchado,
        bloco,
        apartamento,
        descricao: descricaoAchado,
        foto_url: finalFotoUrl,
        status: 'encontrado'
      });

      setAchadoSuccess(true);
      setTimeout(() => {
        setShowAchadoModal(false);
        setAchadoSuccess(false);
        setDescricaoAchado('');
        setLocalAchado('');
        setFotoAchado('');
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar objeto.');
    } finally {
      setSubmittingAchado(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-4 antialiased text-zinc-300 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#0033FF]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
        
        <div className="flex flex-col items-center max-w-sm w-full p-8 text-center relative z-10">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-2xl mb-6 backdrop-blur-sm animate-pulse">
            <div className="absolute inset-0 bg-[#0033FF]/5 rounded-2xl animate-ping" />
            <Building className="h-8 w-8 text-[#0033FF] relative z-10" />
          </div>
          
          <h2 className="text-xl font-bold text-white tracking-tight">Zelify</h2>
          <p className="mt-2 text-zinc-400 text-sm font-medium flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-[#0033FF] animate-spin" />
            Carregando o condomínio...
          </p>
        </div>
        
        {/* PAINEL DE DIAGNÓSTICO PARA DEBUG (Apenas com ?debug=true na URL) */}
        {showDebug && (
          <div className="mt-4 p-4 bg-[#0c0c0e]/60 border border-white/[0.05] rounded-xl text-left max-w-xs w-full text-xs font-mono space-y-2 text-zinc-400 shadow-2xl backdrop-blur-md relative z-10">
            <div className="font-bold text-white border-b border-white/[0.05] pb-1">Diagnóstico Zelify</div>
            <div>Slug da URL: <span className="text-white font-bold">"{slug || 'Aguardando router...'}"</span></div>
            <div>Params Router: {JSON.stringify(params)}</div>
            <div>Supabase Ativo: <span className="text-white font-bold">{String(isSupabaseConfigured)}</span></div>
            <div>Condomínio: {condominio ? 'Carregado' : 'Nulo'}</div>
            <div>Validado: {validated ? 'Sim' : 'Não'}</div>
            {debugError && (
              <div className="text-red-400 bg-red-950/20 p-2 rounded border border-red-900/30 mt-2 whitespace-pre-wrap font-sans font-semibold">
                {debugError}
              </div>
            )}
            
            {logs.length > 0 && (
              <div className="mt-2 border-t border-white/[0.05] pt-2 space-y-1 max-h-[140px] overflow-y-auto font-mono text-[9px] text-zinc-550">
                <div className="font-bold text-zinc-400 mb-0.5">Logs de Execução:</div>
                {logs.map((log, idx) => (
                  <div key={idx} className="truncate" title={log}>{log}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!condominio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-center antialiased text-zinc-300 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="w-full max-w-sm bg-[#0c0c0e]/60 border border-white/[0.05] rounded-2xl p-6 shadow-2xl backdrop-blur-md relative z-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-bold text-white mb-2">Condomínio Não Encontrado</h1>
          <p className="text-zinc-400 text-xs max-w-sm leading-relaxed">
            Não conseguimos encontrar um condomínio ativo com o slug correspondente. Verifique a URL informada.
          </p>
        </div>
      </div>
    );
  }

  // --- 1. TELA DE VALIDAÇÃO (SE NÃO ESTIVER VALIDADO) ---
  if (!validated) {
    return (
      <div className="flex flex-col justify-center min-h-screen bg-zinc-950 p-4 md:p-6 antialiased text-zinc-300 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-[#0033FF]/5 blur-[140px] rounded-full pointer-events-none z-0"></div>
        
        <div className="w-full max-w-sm mx-auto bg-[#0c0c0e]/60 border border-white/[0.05] rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-md relative z-10 overflow-hidden">
          {/* Top glow line */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#0033FF]/40 to-transparent"></div>
          
          <div className="flex items-center space-x-2 mb-6">
            <span className="text-2xl font-black tracking-tight text-white">Zelify<span className="text-[#0033FF]">.</span></span>
          </div>
          
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white mb-1">{condominio.nome}</h1>
            <p className="text-xs text-zinc-400 font-medium">Insira os dados da sua unidade para acessar o portal de moradores.</p>
          </div>

          <form onSubmit={handleValidate} className="space-y-4">
            {validationError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{validationError}</span>
              </div>
            )}

            <div>
              <label htmlFor="codigo" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Código de Acesso do Condomínio (4 dígitos)
              </label>
              <input
                id="codigo"
                type="password"
                maxLength={4}
                pattern="\d{4}"
                placeholder="••••"
                value={codigoAcesso}
                onChange={(e) => setCodigoAcesso(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-center tracking-widest text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-[#0033FF]/60 focus:border-[#0033FF]/60 transition-all font-medium text-center"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="bloco" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Bloco / Torre
                </label>
                <input
                  id="bloco"
                  type="text"
                  placeholder="Ex: Bloco A"
                  value={bloco}
                  onChange={(e) => setBloco(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white placeholder-zinc-655 focus:outline-none focus:ring-1 focus:ring-[#0033FF]/60 focus:border-[#0033FF]/60 transition-all font-medium"
                  required
                />
              </div>
              <div>
                <label htmlFor="apto" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Apto / Casa
                </label>
                <input
                  id="apto"
                  type="text"
                  placeholder="Ex: 302"
                  value={apartamento}
                  onChange={(e) => setApartamento(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white placeholder-zinc-655 focus:outline-none focus:ring-1 focus:ring-[#0033FF]/60 focus:border-[#0033FF]/60 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={validating}
              className="w-full mt-2 bg-gradient-to-r from-[#0033FF] to-blue-600 hover:opacity-95 active:scale-[0.98] text-white text-sm font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(0,51,255,0.25)] disabled:opacity-50 cursor-pointer"
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Validando...
                </>
              ) : (
                'Acessar Portal'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- FILTRAR CHAMADOS ---
  const meusChamados = chamados.filter(c => 
    c.tipo === 'manutencao' && 
    (c.bloco.toLowerCase() === bloco.toLowerCase() && c.apartamento.toLowerCase() === apartamento.toLowerCase())
  );
  
  const achadosMural = chamados.filter(c => c.tipo === 'achado_perdido' && c.status !== 'entregue');
  
  const resolvidosRecentes = chamados.filter(c => c.tipo === 'manutencao' && c.status === 'resolvido');

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 font-sans antialiased text-zinc-300 relative">
      {/* Glow de fundo */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[250px] bg-[#0033FF]/4 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* HEADER MOBILE-FIRST */}
      <header className="sticky top-0 bg-[#09090b]/85 backdrop-blur-md border-b border-white/[0.04] z-10 px-4 py-3 relative">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-lg font-black tracking-tight text-white">Zelify<span className="text-[#0033FF]">.</span></span>
              <span className="text-zinc-700 text-xs">|</span>
              <span className="text-xs font-semibold text-zinc-400 truncate max-w-[140px]">{condominio.nome}</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
              Unidade: {bloco} - Apto {apartamento}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-900/30 rounded-lg transition-colors"
            title="Sair do Portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL - LIMITADO PARA LARGURA MOBILE */}
      <main className="max-w-md mx-auto px-4 mt-4 relative z-10">
        
        {/* --- ABA 1: MANUTENÇÃO --- */}
        {activeTab === 'manutencao' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-zinc-450 uppercase tracking-widest">Meus Chamados</h2>
              <button
                onClick={() => setShowManutencaoModal(true)}
                className="bg-[#0033FF] hover:bg-[#0033FF]/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-[0_4px_15px_rgba(0,51,255,0.2)] active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Relatar Problema</span>
              </button>
            </div>

            {loadingChamados ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            ) : meusChamados.length === 0 ? (
              <div className="bg-[#0c0c0e]/40 border border-white/[0.04] rounded-xl p-8 text-center shadow-xl backdrop-blur-sm">
                <Wrench className="w-8 h-8 text-zinc-650 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-zinc-200 mb-1">Nenhum chamado de manutenção</h3>
                <p className="text-xs text-zinc-500 max-w-[240px] mx-auto mb-4 font-medium leading-relaxed">
                  Se você encontrou algum problema nas áreas comuns do condomínio, relate-o clicando abaixo.
                </p>
                <button
                  onClick={() => setShowManutencaoModal(true)}
                  className="text-xs font-bold text-[#0033FF] bg-[#0033FF]/10 hover:bg-[#0033FF]/20 px-3.5 py-1.5 rounded-lg transition-colors inline-block"
                >
                  Relatar Novo Chamado
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {meusChamados.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedChamado(item)}
                    className="bg-[#0c0c0e]/60 border border-white/[0.04] p-3 flex space-x-3 items-start cursor-pointer hover:border-white/[0.1] hover:bg-white/[0.01] active:scale-[0.99] transition-all rounded-xl shadow-sm"
                  >
                    {item.foto_url ? (
                      <img 
                        src={item.foto_url} 
                        alt="Problema" 
                        className="w-14 h-14 rounded-lg object-cover bg-zinc-950 shrink-0 border border-white/[0.04]" 
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-zinc-925 border border-white/[0.04] flex items-center justify-center shrink-0">
                        <Wrench className="w-5 h-5 text-zinc-550" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 flex items-center">
                          <MapPin className="w-3 h-3 text-zinc-500 mr-1" />
                          {item.local}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          item.status === 'pendente' 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/15' 
                            : item.status === 'em_execucao' 
                              ? 'bg-[#0033FF]/10 text-blue-400 border-blue-500/15' 
                              : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/15'
                        }`}>
                          {item.status === 'pendente' ? 'Pendente' : item.status === 'em_execucao' ? 'Em execução' : 'Resolvido'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 font-semibold line-clamp-2 leading-relaxed">{item.descricao}</p>
                      <p className="text-[9px] text-zinc-500 font-bold mt-1.5 font-mono">
                        {new Date(item.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- ABA 2: ACHADOS E PERDIDOS --- */}
        {activeTab === 'achados' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-zinc-450 uppercase tracking-widest">Mural de Achados</h2>
              <button
                onClick={() => setShowAchadoModal(true)}
                className="bg-[#0033FF] hover:bg-[#0033FF]/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-[0_4px_15px_rgba(0,51,255,0.2)] active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Achado</span>
              </button>
            </div>

            {loadingChamados ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            ) : achadosMural.length === 0 ? (
              <div className="bg-[#0c0c0e]/40 border border-white/[0.04] rounded-xl p-8 text-center shadow-xl backdrop-blur-sm">
                <Package className="w-8 h-8 text-zinc-650 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-zinc-200 mb-1">Mural Vazio</h3>
                <p className="text-xs text-zinc-500 max-w-[240px] mx-auto mb-4 font-medium leading-relaxed">
                  Nenhum objeto perdido registrado na portaria atualmente.
                </p>
                <button
                  onClick={() => setShowAchadoModal(true)}
                  className="text-xs font-bold text-[#0033FF] bg-[#0033FF]/10 hover:bg-[#0033FF]/20 px-3.5 py-1.5 rounded-lg transition-colors inline-block"
                >
                  Registrar Algo Encontrado
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {achadosMural.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedChamado(item)}
                    className="bg-[#0c0c0e]/60 border border-white/[0.04] overflow-hidden flex flex-col cursor-pointer hover:border-white/[0.1] hover:bg-white/[0.01] active:scale-[0.99] transition-all rounded-xl text-left shadow-sm"
                  >
                    <div className="relative aspect-square w-full bg-zinc-950 border-b border-white/[0.04] flex items-center justify-center">
                      {item.foto_url ? (
                        <img 
                          src={item.foto_url} 
                          alt={item.descricao} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Package className="w-8 h-8 text-zinc-650" />
                      )}
                      <div className="absolute bottom-2 left-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shadow-sm ${
                          item.status === 'encontrado' 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/15' 
                            : item.status === 'aguardando_retirada' 
                              ? 'bg-[#0033FF]/10 text-blue-400 border-blue-500/15' 
                              : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/15'
                        }`}>
                          {item.status === 'encontrado' ? 'Na Portaria' : item.status === 'aguardando_retirada' ? 'Retirar' : 'Entregue'}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <p className="text-xs text-zinc-300 font-semibold line-clamp-2 leading-relaxed">{item.descricao}</p>
                      <div className="pt-2 border-t border-white/[0.03] flex justify-between items-center text-[9px] font-bold text-zinc-550 font-mono">
                        <span className="flex items-center truncate max-w-[70px]">
                          <MapPin className="w-3 h-3 text-zinc-600 mr-0.5 shrink-0" />
                          {item.local}
                        </span>
                        <span>
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- ABA 3: RESOLVIDOS --- */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-zinc-450 uppercase tracking-widest">Resolvidos Recentes</h2>

            {loadingChamados ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 text-zinc-555 animate-spin" />
              </div>
            ) : resolvidosRecentes.length === 0 ? (
              <div className="bg-[#0c0c0e]/40 border border-white/[0.04] rounded-xl p-8 text-center shadow-xl backdrop-blur-sm">
                <CheckCircle2 className="w-8 h-8 text-zinc-650 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-zinc-200 mb-1">Nenhum chamado concluído</h3>
                <p className="text-xs text-zinc-500 max-w-[240px] mx-auto font-medium leading-relaxed">
                  Chamados finalizados pela gestão operacional do condomínio aparecerão listados aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {resolvidosRecentes.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedChamado(item)}
                    className="bg-[#0c0c0e]/40 border border-white/[0.04] p-3 flex space-x-3 items-start cursor-pointer hover:border-white/[0.08] hover:bg-white/[0.01] active:scale-[0.99] transition-all rounded-xl shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 mt-1">
                      <Check className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 flex items-center">
                          <MapPin className="w-3 h-3 text-zinc-555 mr-1" />
                          {item.local}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-500">
                          Apto {item.bloco}-{item.apartamento}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-350 font-semibold leading-relaxed">{item.descricao}</p>
                      <p className="text-[9px] text-zinc-500 font-bold mt-1.5 font-mono">
                        Concluído em: {new Date(item.updated_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- NAVEGAÇÃO DE ABAS FIXA EMBAIXO --- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#09090b]/90 backdrop-blur-md border-t border-white/[0.04] z-10 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2 px-4">
          <button
            onClick={() => setActiveTab('manutencao')}
            className={`flex flex-col items-center py-2.5 rounded-xl transition-all ${
              activeTab === 'manutencao' 
                ? 'text-white bg-white/[0.04] border border-white/[0.05] font-bold' 
                : 'text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <Wrench className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] uppercase tracking-wider font-bold">Manutenção</span>
          </button>

          <button
            onClick={() => setActiveTab('achados')}
            className={`flex flex-col items-center py-2.5 rounded-xl transition-all ${
              activeTab === 'achados' 
                ? 'text-white bg-white/[0.04] border border-white/[0.05] font-bold' 
                : 'text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <Package className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] uppercase tracking-wider font-bold">Achados</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`flex flex-col items-center py-2.5 rounded-xl transition-all ${
              activeTab === 'historico' 
                ? 'text-white bg-white/[0.04] border border-white/[0.05] font-bold' 
                : 'text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] uppercase tracking-wider font-bold">Resolvidos</span>
          </button>
        </div>
      </nav>

      {/* --- MODAL 1: RELATAR MANUTENÇÃO --- */}
      {showManutencaoModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-[#0d0d0f]/95 backdrop-blur-lg w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-white/[0.08] max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in slide-in-from-bottom duration-250">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Relatar Problema</h3>
              <button 
                onClick={() => setShowManutencaoModal(false)}
                className="text-zinc-400 hover:text-white text-xs font-semibold px-2.5 py-1 bg-white/[0.02] border border-white/[0.04] rounded-md transition-colors"
              >
                Fechar
              </button>
            </div>

            {problemaSuccess ? (
              <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center animate-bounce">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Chamado Enviado com Sucesso!</h4>
                <p className="text-xs text-zinc-400">O zelador e o síndico foram notificados.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmeteProblema} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Local do Ocorrido</label>
                  <select
                    value={localProblema}
                    onChange={(e) => setLocalProblema(e.target.value)}
                    className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-zinc-950 focus:ring-1 focus:ring-[#0033FF] focus:border-[#0033FF] outline-none font-medium text-white appearance-none"
                  >
                    <option value="Garagem">Garagem</option>
                    <option value="Hall">Hall Social</option>
                    <option value="Elevador">Elevadores</option>
                    <option value="Piscina">Piscina / Lazer</option>
                    <option value="Playground">Playground</option>
                    <option value="Corredor">Corredores / Escadas</option>
                    <option value="Outro">Outro Local</option>
                  </select>
                </div>

                {localProblema === 'Outro' && (
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Especificar Local</label>
                    <input
                      type="text"
                      placeholder="Ex: Salão de Festas"
                      value={outroLocal}
                      onChange={(e) => setOutroLocal(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white focus:ring-1 focus:ring-[#0033FF] focus:border-[#0033FF] outline-none font-medium placeholder-zinc-650"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Descrição do Problema</label>
                  <textarea
                    rows={3}
                    placeholder="Descreva o que está quebrado ou precisa de reparo..."
                    value={descricaoProblema}
                    onChange={(e) => setDescricaoProblema(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white focus:ring-1 focus:ring-[#0033FF] focus:border-[#0033FF] outline-none font-medium placeholder-zinc-650"
                    required
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Foto do Problema</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef1}
                    onChange={(e) => handlePhotoUpload(e, 'problema')}
                    className="hidden"
                  />
                  
                  {fotoProblema ? (
                    <div className="relative rounded-lg overflow-hidden border border-white/[0.06] aspect-video bg-zinc-950">
                      <img src={fotoProblema} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFotoProblema('')}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded-md"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef1.current?.click()}
                      disabled={compressingImage}
                      className="w-full border border-dashed border-white/[0.08] hover:border-white/[0.15] bg-white/[0.01] hover:bg-white/[0.02] rounded-lg py-6 flex flex-col items-center justify-center transition-colors text-zinc-400 cursor-pointer"
                    >
                      {compressingImage ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mb-1 text-[#0033FF]" />
                          <span className="text-xs font-medium text-zinc-550">Otimizando foto...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mb-1.5 text-zinc-500" />
                          <span className="text-xs font-semibold text-zinc-300">Tirar Foto / Enviar Arquivo</span>
                          <span className="text-[10px] text-zinc-500 mt-0.5">Capturar imagem pelo celular</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingProblema || compressingImage}
                    className="w-full bg-[#0033FF] hover:bg-[#0033FF]/90 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center transition-all shadow-[0_4px_15px_rgba(0,51,255,0.2)] disabled:opacity-50 cursor-pointer"
                  >
                    {submittingProblema ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Registrando chamado...
                      </>
                    ) : (
                      'Enviar Chamado'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 2: CADASTRAR ACHADO --- */}
      {showAchadoModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-[#0d0d0f]/95 backdrop-blur-lg w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-white/[0.08] max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in slide-in-from-bottom duration-250">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cadastrar Objeto Achado</h3>
              <button 
                onClick={() => setShowAchadoModal(false)}
                className="text-zinc-400 hover:text-white text-xs font-semibold px-2.5 py-1 bg-white/[0.02] border border-white/[0.04] rounded-md transition-colors"
              >
                Fechar
              </button>
            </div>

            {achadoSuccess ? (
              <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 rounded-full flex items-center justify-center animate-bounce">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Objeto Cadastrado!</h4>
                <p className="text-xs text-zinc-400">Por favor, entregue o objeto na portaria.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmeteAchado} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">O que foi encontrado?</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Chaveiro com controle de garagem, Urso de pelúcia..."
                    value={descricaoAchado}
                    onChange={(e) => setDescricaoAchado(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white focus:ring-1 focus:ring-[#0033FF] focus:border-[#0033FF] outline-none font-medium placeholder-zinc-650"
                    required
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Onde foi encontrado?</label>
                  <input
                    type="text"
                    placeholder="Ex: Bancos ao lado da churrasqueira"
                    value={localAchado}
                    onChange={(e) => setLocalAchado(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white focus:ring-1 focus:ring-[#0033FF] focus:border-[#0033FF] outline-none font-medium placeholder-zinc-650"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Foto do Objeto (Opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef2}
                    onChange={(e) => handlePhotoUpload(e, 'achado')}
                    className="hidden"
                  />
                  
                  {fotoAchado ? (
                    <div className="relative rounded-lg overflow-hidden border border-white/[0.06] aspect-video bg-zinc-950">
                      <img src={fotoAchado} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFotoAchado('')}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded-md"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef2.current?.click()}
                      disabled={compressingImage}
                      className="w-full border border-dashed border-white/[0.08] hover:border-white/[0.15] bg-white/[0.01] hover:bg-white/[0.02] rounded-lg py-6 flex flex-col items-center justify-center transition-colors text-zinc-400 cursor-pointer"
                    >
                      {compressingImage ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mb-1 text-[#0033FF]" />
                          <span className="text-xs font-medium text-zinc-550">Otimizando foto...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mb-1.5 text-zinc-500" />
                          <span className="text-xs font-semibold text-zinc-300">Tirar Foto / Enviar Arquivo</span>
                          <span className="text-[10px] text-zinc-500 mt-0.5">Capturar imagem do objeto</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingAchado || compressingImage}
                    className="w-full bg-[#0033FF] hover:bg-[#0033FF]/90 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center transition-all shadow-[0_4px_15px_rgba(0,51,255,0.2)] disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAchado ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Cadastrando objeto...
                      </>
                    ) : (
                      'Publicar Objeto Achado'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 3: DETALHES DA OCORRÊNCIA --- */}
      {selectedChamado && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-[#0d0d0f]/95 backdrop-blur-lg w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-white/[0.08] max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in slide-in-from-bottom duration-250 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
              <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-450 uppercase tracking-widest">
                {selectedChamado.tipo === 'manutencao' ? (
                  <Wrench className="w-4 h-4 text-[#0033FF]" />
                ) : (
                  <Package className="w-4 h-4 text-[#0033FF]" />
                )}
                <span>
                  Detalhes da Ocorrência #
                  {(() => {
                    const cleanId = selectedChamado.id?.replace('chamado-', '') || '';
                    return cleanId.length > 8 ? cleanId.substring(0, 8).toUpperCase() : cleanId;
                  })()}
                </span>
              </div>
              <button 
                onClick={() => setSelectedChamado(null)}
                className="text-zinc-400 hover:text-white bg-white/[0.02] border border-white/[0.04] p-1.5 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* FOTO SE EXISTIR */}
            {selectedChamado.foto_url && (
              <div className="rounded-xl overflow-hidden bg-zinc-950 border border-white/[0.06] aspect-video relative">
                <img 
                  src={selectedChamado.foto_url} 
                  alt="Foto do Ocorrido" 
                  className="w-full h-full object-contain bg-black/40" 
                />
              </div>
            )}

            {/* GRID DE INFORMAÇÕES */}
            <div className="grid grid-cols-2 gap-4 bg-zinc-950/50 p-4 rounded-xl border border-white/[0.04] text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Local</span>
                <p className="text-zinc-200 font-bold mt-1 flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-zinc-500 shrink-0" />
                  {selectedChamado.local}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Unidade</span>
                <p className="text-zinc-200 font-bold mt-1">
                  {selectedChamado.bloco === 'Portaria' ? 'Portaria' : `${selectedChamado.bloco} - Apto ${selectedChamado.apartamento}`}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Data</span>
                <p className="text-zinc-400 font-semibold mt-1 font-mono">
                  {new Date(selectedChamado.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Status</span>
                <div className="mt-1 flex items-center space-x-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    selectedChamado.status === 'pendente' || selectedChamado.status === 'encontrado' 
                      ? 'bg-amber-500 animate-pulse' 
                      : selectedChamado.status === 'em_execucao' || selectedChamado.status === 'aguardando_retirada' 
                        ? 'bg-[#0033FF]' 
                        : 'bg-emerald-500'
                  }`}></span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    selectedChamado.status === 'pendente' || selectedChamado.status === 'encontrado'
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/15'
                      : selectedChamado.status === 'em_execucao' || selectedChamado.status === 'aguardando_retirada'
                        ? 'bg-[#0033FF]/10 text-blue-400 border-blue-500/15'
                        : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/15'
                  }`}>
                    {selectedChamado.status === 'pendente' ? 'Pendente' 
                      : selectedChamado.status === 'em_execucao' ? 'Em execução' 
                      : selectedChamado.status === 'resolvido' ? 'Resolvido'
                      : selectedChamado.status === 'encontrado' ? 'Na Portaria'
                      : selectedChamado.status === 'aguardando_retirada' ? 'Retirar'
                      : 'Entregue'}
                  </span>
                </div>
              </div>
            </div>

            {/* DESCRIÇÃO */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Descrição</span>
              <p className="text-zinc-350 font-semibold bg-zinc-950/50 p-3.5 rounded-lg border border-white/[0.04] leading-relaxed">
                {selectedChamado.descricao}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedChamado(null)}
                className="w-full bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] text-zinc-300 text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center transition-colors shadow-sm cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
