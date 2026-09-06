'use client';


import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
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
  X
} from 'lucide-react';
import { db, Condominio, Chamado, isSupabaseConfigured } from '@/lib/db';
import { compressImage } from '@/lib/imageCompressor';
import {
  OCCURRENCE_CATEGORIES,
  PRIORITIES,
  REQUESTER_TYPES,
  STATUS_LABELS,
  maskBrazilianPhone,
  isValidBrazilianPhone,
  occurrenceTitle,
  priorityLabel,
} from '@/lib/occurrences';

export default function MoradorPortal() {
  const params = useParams();
  const slug = params.slug as string;

  // Estados de Carregamento e Dados do Condomínio
  const [loading, setLoading] = useState(true);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showDebug] = useState(() => typeof window !== 'undefined' && window.location.search.includes('debug=true'));

  // Capturar erros globais e logs no navegador
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
        const clientWindow = window as Window & { clientLogs?: string[] };
        if (clientWindow.clientLogs) {
          setLogs([...clientWindow.clientLogs]);
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
  const [portalToken, setPortalToken] = useState('');
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [bloco, setBloco] = useState('');
  const [apartamento, setApartamento] = useState('');
  const [validationError, setValidationError] = useState('');
  const [validating, setValidating] = useState(false);

  // Rate limiting: bloquear após 5 tentativas erradas por 60 segundos

  // Estados do Painel do Morador
  const [activeTab, setActiveTab] = useState<'manutencao' | 'achados' | 'historico'>('manutencao');
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loadingChamados, setLoadingChamados] = useState(false);

  // Histórico de chamados relatados nesta sessão
  const [meusChamadosIds, setMeusChamadosIds] = useState<string[]>([]);

  // Limite de chamados no mês
  const [monthlyCount, setMonthlyCount] = useState(0);

  // Modais de Criação e Visualização
  const [showManutencaoModal, setShowManutencaoModal] = useState(false);
  const [showAchadoModal, setShowAchadoModal] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);

  // Formulário: Relatar Problema
  const [localProblema, setLocalProblema] = useState('Garagem');
  const [outroLocal, setOutroLocal] = useState('');
  const [descricaoProblema, setDescricaoProblema] = useState('');
  const [tituloProblema, setTituloProblema] = useState('');
  const [categoriaProblema, setCategoriaProblema] = useState('Manutenção');
  const [categoriaOutro, setCategoriaOutro] = useState('');
  const [prioridadeProblema, setPrioridadeProblema] = useState<Chamado['prioridade']>('normal');
  const [solicitanteTipo, setSolicitanteTipo] = useState<NonNullable<Chamado['solicitante_tipo']>>('morador');
  const [solicitanteTipoOutro, setSolicitanteTipoOutro] = useState('');
  const [solicitanteNome, setSolicitanteNome] = useState('');
  const [solicitanteWhatsapp, setSolicitanteWhatsapp] = useState('');
  const [anonimo, setAnonimo] = useState(true);
  const [mostrarContato, setMostrarContato] = useState(false);
  const [historicoPublico, setHistoricoPublico] = useState<Array<{ chamado_id: string; descricao: string; created_at: string }>>([]);
  const [comentariosPublicos, setComentariosPublicos] = useState<Array<{ chamado_id: string; conteudo: string; created_at: string }>>([]);
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
          // Carregar contagem mensal se for plano grátis
          // Verificar se já está autenticado para este condomínio no localStorage
          const savedAuth = localStorage.getItem(`zelcon_auth_${condo.id}`);
          if (savedAuth) {
            try {
              const authData = JSON.parse(savedAuth);
              // Validar schema: bloco, apartamento e expiração
              if (
                authData.expira > Date.now() &&
                typeof authData?.bloco === 'string' && authData.bloco.trim() !== '' &&
                typeof authData?.apartamento === 'string' && authData.apartamento.trim() !== '' &&
                (!isSupabaseConfigured || (typeof authData?.token === 'string' && authData.token.length > 20))
              ) {
                setBloco(authData.bloco);
                setApartamento(authData.apartamento);
                setPortalToken(authData.token || 'mock');
                setValidated(true);
              } else {
                // Dado inválido, adulterado ou expirado — limpar e forçar nova validação
                localStorage.removeItem(`zelcon_auth_${condo.id}`);
              }
            } catch {
              localStorage.removeItem(`zelcon_auth_${condo.id}`);
            }
          }
          
          // Carregar IDs de chamados criados localmente
          const savedIds = localStorage.getItem(`zelcon_meus_chamados_${condo.id}`);
          if (savedIds) {
            try {
              const parsedIds = JSON.parse(savedIds);
              // Validar schema: deve ser um array de strings
              if (Array.isArray(parsedIds) && parsedIds.every(id => typeof id === 'string')) {
                setMeusChamadosIds(parsedIds);
              } else {
                localStorage.removeItem(`zelcon_meus_chamados_${condo.id}`);
              }
            } catch {
              localStorage.removeItem(`zelcon_meus_chamados_${condo.id}`);
            }
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

  useEffect(() => {
    if (condominio?.identificacao_ocorrencias === 'obrigatoria') setAnonimo(false);
    if (condominio?.identificacao_ocorrencias === 'anonima') setAnonimo(true);
  }, [condominio?.identificacao_ocorrencias]);

  // Carregar chamados sempre que validação ou aba mudar
  useEffect(() => {
    if (!condominio || !validated || !portalToken) return;

    async function loadData() {
      setLoadingChamados(true);
      try {
        if (isSupabaseConfigured) {
          const data = await db.getPortalChamados(portalToken);
          setChamados(data.chamados);
          setMonthlyCount(data.monthlyCount);
          setHistoricoPublico(data.historico || []);
          setComentariosPublicos(data.comentarios || []);
        } else {
          const data = await db.getChamados(condominio!.id);
          setChamados(data);
          setMonthlyCount(await db.getMonthlyChamadosCount(condominio!.id));
        }
      } catch (err) {
        console.error('Erro ao carregar chamados:', err);
      } finally {
        setLoadingChamados(false);
      }
    }
    loadData();
  }, [condominio, validated, portalToken, problemaSuccess, achadoSuccess]);

  // Validar acesso do morador
  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!codigoAcesso || !bloco || !apartamento) {
      setValidationError('Por favor, preencha todos os campos.');
      return;
    }

    if (codigoAcesso.length < 4 || codigoAcesso.length > 8) {
      setValidationError('O código de acesso deve ter entre 4 e 8 dígitos.');
      return;
    }

    setValidating(true);
    try {
      const res = await fetch('/api/validate-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condominioId: condominio!.id,
          codigo: codigoAcesso,
          bloco: bloco.trim(),
          apartamento: apartamento.trim(),
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setValidationError(data.error || 'Muitas tentativas. Aguarde e tente novamente.');
        return;
      }

      if (data.valid) {
        // Login bem-sucedido: resetar contadores e salvar sessão
        const authData = {
          bloco,
          apartamento,
          token: data.token || 'mock',
          expira: Date.now() + 8 * 60 * 60 * 1000, // 8 horas
        };
        localStorage.setItem(`zelcon_auth_${condominio!.id}`, JSON.stringify(authData));
        setPortalToken(data.token || 'mock');
        setValidated(true);
      } else {
        setValidationError(data.error || 'Código de acesso incorreto.');
      }
    } catch {
      setValidationError('Ocorreu um erro ao validar. Tente novamente.');
    } finally {
      setValidating(false);
    }
  };

  // Logout do morador
  const handleLogout = () => {
    if (confirm('Deseja sair do portal do condomínio?')) {
      localStorage.removeItem(`zelcon_auth_${condominio!.id}`);
      setPortalToken('');
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
    if (isLimitReached) return;

    if (!tituloProblema.trim() || !descricaoProblema.trim() || !categoriaProblema) {
      alert('Preencha o título, a categoria e a descrição da ocorrência.');
      return;
    }
    if (categoriaProblema === 'Outro' && !categoriaOutro.trim()) {
      alert('Descreva a categoria da ocorrência.');
      return;
    }
    if (condominio?.identificacao_ocorrencias === 'obrigatoria' && (anonimo || !solicitanteNome.trim())) {
      alert('Este condomínio exige a identificação do solicitante.');
      return;
    }
    if (!isValidBrazilianPhone(solicitanteWhatsapp)) {
      alert('Informe um WhatsApp válido com DDD ou deixe o campo vazio.');
      return;
    }

    setSubmittingProblema(true);
    try {
      const localReal = localProblema === 'Outro' ? outroLocal : localProblema;
      
      // Upload da foto (em modo mock retorna base64, em supabase envia para storage)
      let finalFotoUrl = '';
      if (fotoProblema) {
        finalFotoUrl = isSupabaseConfigured
          ? await db.uploadPortalImagem(portalToken, fotoProblema)
          : await db.uploadImagem(fotoProblema, condominio!.id);
      }

      const novoChamado = isSupabaseConfigured
        ? await db.createPortalChamado(portalToken, {
            tipo: 'manutencao',
            local: localReal || 'Outro',
            titulo: tituloProblema,
            descricao: descricaoProblema,
            foto_url: finalFotoUrl,
            categoria: categoriaProblema,
            categoria_outro: categoriaOutro || null,
            prioridade: prioridadeProblema,
            solicitante_tipo: solicitanteTipo,
            solicitante_tipo_outro: solicitanteTipoOutro || null,
            solicitante_nome: solicitanteNome || null,
            solicitante_whatsapp: anonimo ? null : solicitanteWhatsapp || null,
            anonimo,
          })
        : await db.createChamado({
            condominio_id: condominio!.id,
            tipo: 'manutencao',
            local: localReal || 'Outro',
            bloco,
            apartamento,
            titulo: tituloProblema,
            descricao: descricaoProblema,
            foto_url: finalFotoUrl,
            status: 'pendente',
            categoria: categoriaProblema,
            categoria_outro: categoriaOutro || null,
            prioridade: prioridadeProblema,
            solicitante_tipo: solicitanteTipo,
            solicitante_tipo_outro: solicitanteTipoOutro || null,
            solicitante_nome: anonimo ? null : solicitanteNome || null,
            solicitante_whatsapp: solicitanteWhatsapp || null,
            anonimo,
          });

      // Re-fetch contagem mensal após envio bem-sucedido
      if (!isSupabaseConfigured && condominio!.plan_type === 'free') {
        const count = await db.getMonthlyChamadosCount(condominio!.id);
        setMonthlyCount(count);
      }

      // Salvar ID localmente para rastrear que foi criado por este morador
      const novosIds = [...meusChamadosIds, novoChamado.id];
      setMeusChamadosIds(novosIds);
      localStorage.setItem(`zelcon_meus_chamados_${condominio!.id}`, JSON.stringify(novosIds));

      setProblemaSuccess(true);
      setTimeout(() => {
        setShowManutencaoModal(false);
        setProblemaSuccess(false);
        // Resetar form
        setLocalProblema('Garagem');
        setOutroLocal('');
        setDescricaoProblema('');
        setTituloProblema('');
        setCategoriaProblema('Manutenção');
        setCategoriaOutro('');
        setPrioridadeProblema('normal');
        setSolicitanteTipo('morador');
        setSolicitanteTipoOutro('');
        setSolicitanteNome('');
        setSolicitanteWhatsapp('');
        setAnonimo(condominio?.identificacao_ocorrencias !== 'obrigatoria');
        setMostrarContato(false);
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
    if (isLimitReached) return;

    if (!descricaoAchado.trim() || !localAchado.trim()) {
      alert('Por favor, preencha descrição e local onde encontrou.');
      return;
    }

    setSubmittingAchado(true);
    try {
      let finalFotoUrl = '';
      if (fotoAchado) {
        finalFotoUrl = isSupabaseConfigured
          ? await db.uploadPortalImagem(portalToken, fotoAchado)
          : await db.uploadImagem(fotoAchado, condominio!.id);
      }

      if (isSupabaseConfigured) {
        await db.createPortalChamado(portalToken, {
          tipo: 'achado_perdido',
          local: localAchado,
          descricao: descricaoAchado,
          foto_url: finalFotoUrl,
        });
      } else {
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
      }

      // Re-fetch contagem mensal após envio bem-sucedido
      if (!isSupabaseConfigured && condominio!.plan_type === 'free') {
        const count = await db.getMonthlyChamadosCount(condominio!.id);
        setMonthlyCount(count);
      }

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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-brand/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
        
        <div className="flex flex-col items-center max-w-sm w-full p-8 text-center relative z-10">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-2xl mb-6 backdrop-blur-sm animate-pulse">
            <div className="absolute inset-0 bg-brand/5 rounded-2xl animate-ping" />
            <Building className="h-8 w-8 text-brand relative z-10" />
          </div>
          
          <h2 className="text-xl font-bold text-white tracking-tight">Zelcon</h2>
          <p className="mt-2 text-zinc-400 text-sm font-medium flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-brand animate-spin" />
            Carregando o condomínio...
          </p>
        </div>
        
        {/* PAINEL DE DIAGNÓSTICO PARA DEBUG (Apenas com ?debug=true na URL) */}
        {showDebug && (
          <div className="mt-4 p-4 bg-[#0c0c0e]/60 border border-white/[0.05] rounded-xl text-left max-w-xs w-full text-xs font-mono space-y-2 text-zinc-400 shadow-2xl backdrop-blur-md relative z-10">
            <div className="font-bold text-white border-b border-white/[0.05] pb-1">Diagnóstico Zelcon</div>
            <div>Slug da URL: <span className="text-white font-bold">&quot;{slug || 'Aguardando router...'}&quot;</span></div>
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

  if (condominio.subscription_status === 'past_due' || condominio.subscription_status === 'canceled') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-center antialiased text-zinc-300 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="w-full max-w-sm bg-[#0c0c0e]/60 border border-white/[0.05] rounded-2xl p-6 shadow-2xl backdrop-blur-md relative z-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-bold text-white mb-2">Portal Suspenso</h1>
          <p className="text-zinc-400 text-xs max-w-sm leading-relaxed">
            O portal de moradores deste condomínio foi temporariamente suspenso devido a pendências de faturamento.
          </p>
          <p className="text-zinc-550 text-[10px] mt-4 font-semibold">
            Se você é o síndico ou administrador, acesse o painel de gestão para regularizar a assinatura.
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-brand/5 blur-[140px] rounded-full pointer-events-none z-0"></div>
        
        <div className="w-full max-w-sm mx-auto bg-[#0c0c0e]/60 border border-white/[0.05] rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-md relative z-10 overflow-hidden">
          {/* Top glow line */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent"></div>
          
          <div className="flex items-center space-x-2 mb-6">
            <span className="text-2xl font-black tracking-tight text-white">Zelcon<span className="text-brand">.</span></span>
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
                Código de Acesso do Condomínio (4 a 8 dígitos)
              </label>
              <input
                id="codigo"
                type="password"
                maxLength={8}
                pattern="\d{4,8}"
                placeholder="••••••••"
                value={codigoAcesso}
                onChange={(e) => setCodigoAcesso(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-center tracking-widest text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-brand/60 focus:border-brand/60 transition-all font-medium text-center"
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
                  className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white placeholder-zinc-655 focus:outline-none focus:ring-1 focus:ring-brand/60 focus:border-brand/60 transition-all font-medium"
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
                  className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white placeholder-zinc-655 focus:outline-none focus:ring-1 focus:ring-brand/60 focus:border-brand/60 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={validating}
              className="w-full mt-2 bg-brand hover:bg-brand/90 text-white text-sm font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
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

  const isLimitReached = condominio.subscription_status !== 'active' || (condominio.plan_type === 'free' && monthlyCount >= 15);

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 font-sans antialiased text-zinc-300 relative">
      {/* Glow de fundo */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[250px] bg-brand/4 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* HEADER MOBILE-FIRST */}
      <header className="sticky top-0 bg-[#09090b]/85 backdrop-blur-md border-b border-white/[0.04] z-30 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-lg font-black tracking-tight text-white">Zelcon<span className="text-brand">.</span></span>
              <span className="text-zinc-700 text-xs">|</span>
              <span className="text-xs font-semibold text-zinc-400 truncate max-w-[140px]">{condominio.nome}</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
              Unidade: {bloco} - Apto {apartamento}
            </p>
            {condominio.plan_type === 'free' && (
              <p className="text-[9px] text-zinc-600 font-semibold mt-0.5">
                Ocorrências este mês: {monthlyCount}/15
              </p>
            )}
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
              <h2 className="text-xs font-bold text-zinc-450 uppercase tracking-widest">Minhas Ocorrências</h2>
              <button
                onClick={() => setShowManutencaoModal(true)}
                className="bg-brand hover:bg-brand/90 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors"
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
                <h3 className="text-sm font-bold text-zinc-200 mb-1">Nenhuma ocorrência registrada</h3>
                <p className="text-xs text-zinc-500 max-w-[240px] mx-auto mb-4 font-medium leading-relaxed">
                  Se você encontrou algum problema nas áreas comuns do condomínio, relate-o clicando abaixo.
                </p>
                <button
                  onClick={() => setShowManutencaoModal(true)}
                  className="text-xs font-bold text-brand bg-brand/10 hover:bg-brand/20 px-3.5 py-1.5 rounded-lg transition-colors inline-block"
                >
                  Registrar ocorrência
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
                              ? 'bg-brand/10 text-blue-400 border-blue-500/15' 
                              : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/15'
                        }`}>
                          {item.status === 'pendente' ? 'Recebida' : item.status === 'em_execucao' ? 'Em andamento' : 'Concluída'}
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
                className="bg-brand hover:bg-brand/90 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors"
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
                  className="text-xs font-bold text-brand bg-brand/10 hover:bg-brand/20 px-3.5 py-1.5 rounded-lg transition-colors inline-block"
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
                              ? 'bg-brand/10 text-blue-400 border-blue-500/15' 
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
            <h2 className="text-xs font-bold text-zinc-450 uppercase tracking-widest">Concluídas recentemente</h2>

            {loadingChamados ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 text-zinc-555 animate-spin" />
              </div>
            ) : resolvidosRecentes.length === 0 ? (
              <div className="bg-[#0c0c0e]/40 border border-white/[0.04] rounded-xl p-8 text-center shadow-xl backdrop-blur-sm">
                <CheckCircle2 className="w-8 h-8 text-zinc-650 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-zinc-200 mb-1">Nenhuma ocorrência concluída</h3>
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mb-0.5">
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="M9 12h6" />
              <path d="M9 16h6" />
              <path d="M9 8h6" />
            </svg>
            <span className="text-[9px] uppercase tracking-wider font-bold">Ocorrências</span>
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
            <span className="text-[9px] uppercase tracking-wider font-bold">Concluídas</span>
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
                <h4 className="text-sm font-bold text-white">Ocorrência enviada com sucesso!</h4>
                <p className="text-xs text-zinc-400">A administração já pode acompanhar e atualizar o andamento.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmeteProblema} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">O que aconteceu?</label>
                  <input type="text" maxLength={120} placeholder="Ex: Balanço do playground quebrado" value={tituloProblema} onChange={(e) => setTituloProblema(e.target.value)} className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white focus:ring-1 focus:ring-brand focus:border-brand outline-none font-medium placeholder-zinc-650" required />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Categoria</label>
                  <select value={categoriaProblema} onChange={(e) => setCategoriaProblema(e.target.value)} className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-zinc-950 focus:ring-1 focus:ring-brand focus:border-brand outline-none font-medium text-white appearance-none" required>
                    {OCCURRENCE_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>

                {categoriaProblema === 'Outro' && (
                  <input type="text" maxLength={100} placeholder="Qual categoria?" value={categoriaOutro} onChange={(e) => setCategoriaOutro(e.target.value)} className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white focus:ring-1 focus:ring-brand outline-none" required />
                )}

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Prioridade</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PRIORITIES.map(([value, label]) => (
                      <button key={value} type="button" onClick={() => setPrioridadeProblema(value)} className={`py-2 rounded-lg border text-[10px] font-bold transition-colors ${prioridadeProblema === value ? 'bg-brand/15 border-brand/40 text-white' : 'bg-zinc-950 border-white/[0.06] text-zinc-500'}`}>{label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Local do Ocorrido</label>
                  <select
                    value={localProblema}
                    onChange={(e) => setLocalProblema(e.target.value)}
                    className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-zinc-950 focus:ring-1 focus:ring-brand focus:border-brand outline-none font-medium text-white appearance-none"
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
                      className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white focus:ring-1 focus:ring-brand focus:border-brand outline-none font-medium placeholder-zinc-650"
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white focus:ring-1 focus:ring-brand focus:border-brand outline-none font-medium placeholder-zinc-650"
                    required
                  ></textarea>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
                  <button type="button" onClick={() => setMostrarContato(value => !value)} className="w-full px-3 py-3 flex items-center justify-between text-left">
                    <span>
                      <strong className="block text-[11px] text-zinc-300">Identificação e contato</strong>
                      <span className="text-[10px] text-zinc-500">Opcional, conforme a regra do condomínio</span>
                    </span>
                    <span className="text-brand text-xs font-bold">{mostrarContato ? 'Ocultar' : 'Adicionar'}</span>
                  </button>
                  {(mostrarContato || condominio.identificacao_ocorrencias === 'obrigatoria') && (
                    <div className="p-3 pt-0 space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1.5">Quem está registrando esta ocorrência?</label>
                        <select value={solicitanteTipo} onChange={(e) => setSolicitanteTipo(e.target.value as NonNullable<Chamado['solicitante_tipo']>)} className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-zinc-950 text-white outline-none">
                          {REQUESTER_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                      {solicitanteTipo === 'outro' && (
                        <input value={solicitanteTipoOutro} onChange={(e) => setSolicitanteTipoOutro(e.target.value)} maxLength={80} placeholder="Perfil (opcional)" className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white outline-none" />
                      )}
                      {condominio.identificacao_ocorrencias !== 'anonima' && (
                        <>
                          {condominio.identificacao_ocorrencias !== 'obrigatoria' && (
                            <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={anonimo} onChange={(e) => setAnonimo(e.target.checked)} className="accent-blue-600" /> Registrar como anônimo</label>
                          )}
                          {!anonimo && <input value={solicitanteNome} onChange={(e) => setSolicitanteNome(e.target.value)} maxLength={120} placeholder="Seu nome" required={condominio.identificacao_ocorrencias === 'obrigatoria'} className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white outline-none" />}
                        </>
                      )}
                      <div>
                        <input inputMode="tel" value={solicitanteWhatsapp} onChange={(e) => setSolicitanteWhatsapp(maskBrazilianPhone(e.target.value))} placeholder="WhatsApp para contato" className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white outline-none" />
                        <p className="text-[9px] text-zinc-550 mt-1.5 leading-relaxed">Opcional. Informe seu WhatsApp caso a administração precise entrar em contato sobre esta ocorrência.</p>
                      </div>
                    </div>
                  )}
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
                          <Loader2 className="w-5 h-5 animate-spin mb-1 text-brand" />
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
                  {isLimitReached ? (
                    <div className="space-y-3">
                      <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-405 rounded-lg text-xs font-semibold leading-relaxed flex items-start space-x-2 animate-in fade-in duration-200 text-left">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                        <span>
                          {condominio.subscription_status !== 'active' ? (
                            'O portal deste condomínio está temporariamente suspenso devido a pendências financeiras na assinatura. Se você for o síndico, acesse o seu painel do Zelcon para regularizar o pagamento.'
                          ) : (
                            'Limite de alertas mensais atingido para este condomínio. A administração do prédio já foi notificada para realizar a atualização do plano. Se você for o síndico, acesse o seu painel do Zelcon para liberar novos chamados.'
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center cursor-not-allowed"
                      >
                        Envio Bloqueado
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={submittingProblema || compressingImage}
                      className="w-full bg-brand hover:bg-brand/90 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {submittingProblema ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Registrando ocorrência...
                        </>
                      ) : (
                        'Enviar ocorrência'
                      )}
                    </button>
                  )}
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white focus:ring-1 focus:ring-brand focus:border-brand outline-none font-medium placeholder-zinc-650"
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/[0.06] rounded-lg text-sm text-white focus:ring-1 focus:ring-brand focus:border-brand outline-none font-medium placeholder-zinc-650"
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
                          <Loader2 className="w-5 h-5 animate-spin mb-1 text-brand" />
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
                  {isLimitReached ? (
                    <div className="space-y-3">
                      <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-405 rounded-lg text-xs font-semibold leading-relaxed flex items-start space-x-2 animate-in fade-in duration-200 text-left">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                        <span>
                          {condominio.subscription_status !== 'active' ? (
                            'O portal deste condomínio está temporariamente suspenso devido a pendências financeiras na assinatura. Se você for o síndico, acesse o seu painel do Zelcon para regularizar o pagamento.'
                          ) : (
                            'Limite de alertas mensais atingido para este condomínio. A administração do prédio já foi notificada para realizar a atualização do plano. Se você for o síndico, acesse o seu painel do Zelcon para liberar novos chamados.'
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center cursor-not-allowed"
                      >
                        Envio Bloqueado
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={submittingAchado || compressingImage}
                      className="w-full bg-brand hover:bg-brand/90 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
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
                  )}
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
                  <Wrench className="w-4 h-4 text-brand" />
                ) : (
                  <Package className="w-4 h-4 text-brand" />
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
            {selectedChamado.tipo === 'manutencao' && (
              <div>
                <h3 className="text-base font-bold text-white">{occurrenceTitle(selectedChamado)}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[9px] font-bold px-2 py-1 rounded border border-white/[0.08] bg-white/[0.03] text-zinc-300">{selectedChamado.categoria || 'Manutenção'}</span>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded border ${selectedChamado.prioridade === 'urgente' ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-white/[0.03] text-zinc-400 border-white/[0.08]'}`}>{priorityLabel(selectedChamado.prioridade)}</span>
                </div>
              </div>
            )}
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
                        ? 'bg-brand' 
                        : 'bg-emerald-500'
                  }`}></span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    selectedChamado.status === 'pendente' || selectedChamado.status === 'encontrado'
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/15'
                      : selectedChamado.status === 'em_execucao' || selectedChamado.status === 'aguardando_retirada'
                        ? 'bg-brand/10 text-blue-400 border-blue-500/15'
                        : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/15'
                  }`}>
                    {STATUS_LABELS[selectedChamado.status]}
                  </span>
                </div>
              </div>
            </div>

            {historicoPublico.some(item => item.chamado_id === selectedChamado.id) && (
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Acompanhamento</span>
                <div className="border-l border-brand/30 pl-3 space-y-3">
                  {historicoPublico.filter(item => item.chamado_id === selectedChamado.id).map((item, index) => (
                    <div key={`${item.created_at}-${index}`}><p className="text-xs text-zinc-300 font-semibold">{item.descricao}</p><p className="text-[9px] text-zinc-550 mt-0.5">{new Date(item.created_at).toLocaleString('pt-BR')}</p></div>
                  ))}
                  {comentariosPublicos.filter(item => item.chamado_id === selectedChamado.id).map((item, index) => (
                    <div key={`${item.created_at}-comment-${index}`} className="bg-brand/5 border border-brand/10 rounded-lg p-2.5"><p className="text-xs text-zinc-300">{item.conteudo}</p><p className="text-[9px] text-zinc-550 mt-1">Atualização da administração · {new Date(item.created_at).toLocaleString('pt-BR')}</p></div>
                  ))}
                </div>
              </div>
            )}

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
