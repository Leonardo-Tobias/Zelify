'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Save, 
  Copy, 
  Check, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  Building,
  KeyRound,
  Compass,
  QrCode,
  Printer,
  Download,
  CreditCard,
  Layers,
  Calculator,
  Sparkles,
  CheckCircle2,
  Lock,
  RefreshCw
} from 'lucide-react';
import { db, Condominio } from '@/lib/db';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [loading, setLoading] = useState(true);

  // Navegação por abas
  const [activeTab, setActiveTab] = useState<'geral' | 'faturamento'>('geral');

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [codigoAcesso, setCodigoAcesso] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estados da Placa Informativa
  const [posterTitle, setPosterTitle] = useState('Portal do Morador');
  const [posterInstructions, setPosterInstructions] = useState('Escaneie o QR Code abaixo com seu celular para abrir o Portal do Morador, relatar problemas de manutenção ou cadastrar achados e perdidos.');
  const [posterTheme, setPosterTheme] = useState<'blue' | 'zinc' | 'emerald'>('blue');

  // Estados de Faturamento
  const [monthlyChamadosCount, setMonthlyChamadosCount] = useState(0);
  const [numCondos, setNumCondos] = useState(5); // Simulador corporativo
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedUpgrade, setSelectedUpgrade] = useState<'pro' | 'corporate'>('pro');
  const [checkoutTab, setCheckoutTab] = useState<'pix' | 'card'>('pix');
  const [copiedPix, setCopiedPix] = useState(false);

  // Formulário do cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [processingCheckout, setProcessingCheckout] = useState(false);

  useEffect(() => {
    const savedCondo = localStorage.getItem('zelify_condominio_gestao');
    if (!savedCondo) {
      router.push('/login');
      return;
    }
    
    const condo = JSON.parse(savedCondo) as Condominio;
    setCondominio(condo);
    setNome(condo.nome);
    setSlug(condo.slug);
    setCodigoAcesso(condo.codigo_acesso);
    setLoading(false);
  }, [router]);

  // Carrega a aba e o plano a partir da URL se fornecidos (fluxo de signup vindo da LP)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      const tabParam = search.get('tab');
      const planParam = search.get('plan');
      
      if (tabParam === 'faturamento') {
        setActiveTab('faturamento');
        
        if (planParam === 'pro' || planParam === 'corporate') {
          setSelectedUpgrade(planParam);
          setShowCheckoutModal(true);
          
          // Limpa os parâmetros de plano da URL para evitar reabrir ao atualizar
          const newUrl = window.location.pathname + '?tab=faturamento';
          window.history.replaceState({ path: newUrl }, '', newUrl);
        }
      }
    }
  }, []);

  // Carrega contagem de chamados do mês se estiver no plano grátis
  useEffect(() => {
    if (!condominio) return;
    
    async function loadMonthlyCount() {
      try {
        const count = await db.getMonthlyChamadosCount(condominio!.id);
        setMonthlyChamadosCount(count);
      } catch (err) {
        console.error('Erro ao contar chamados mensais:', err);
      }
    }
    loadMonthlyCount();
  }, [condominio]);

  // Limpar e formatar o slug (letras, números, hífen, sem espaços ou acentos)
  const formatSlug = (val: string) => {
    return val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9-]/g, '') // remove caracteres inválidos
      .replace(/\s+/g, '-'); // substitui espaços por hífen
  };

  const handleCopyLink = () => {
    if (!condominio) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/${slug}`;
    
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = async () => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicUrl)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `qrcode-${slug}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Erro ao baixar o QR Code:', err);
      alert('Não foi possível baixar o QR Code diretamente. Clique com o botão direito na imagem do QR Code e escolha "Salvar imagem".');
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!nome.trim() || !slug.trim() || !codigoAcesso.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (codigoAcesso.length !== 4 || !/^\d+$/.test(codigoAcesso)) {
      setError('O código de acesso deve possuir exatamente 4 dígitos numéricos.');
      return;
    }

    setSaving(true);
    try {
      const updated = await db.updateCondominioSettings(
        condominio!.id,
        nome.trim(),
        slug.trim(),
        codigoAcesso.trim()
      );

      if (updated) {
        setCondominio(updated);
        // Atualizar localStorage para refletir na navegação do layout
        localStorage.setItem('zelify_condominio_gestao', JSON.stringify(updated));
        
        // Disparar evento para atualizar outros componentes ouvindo storage
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
        }

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('Não foi possível salvar as configurações.');
      }
    } catch (err) {
      setError('Erro ao salvar no banco de dados. Verifique a unicidade do slug.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');
    
    if (checkoutTab === 'card') {
      if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
        setCheckoutError('Por favor, preencha todos os campos do cartão.');
        return;
      }
      if (cardNumber.replace(/\s/g, '').length < 16) {
        setCheckoutError('Número de cartão de crédito inválido.');
        return;
      }
      if (cardExpiry.length < 5) {
        setCheckoutError('Validade incorreta. Use o formato MM/AA.');
        return;
      }
      if (cardCvv.length < 3) {
        setCheckoutError('Código CVV inválido.');
        return;
      }
    }
    
    setProcessingCheckout(true);
    try {
      // Simula tempo de resposta da API Asaas (2 segundos)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updated = await db.updateCondominioPlan(
        condominio!.id,
        selectedUpgrade,
        'active'
      );
      
      if (updated) {
        setCondominio(updated);
        // Atualiza local storage
        localStorage.setItem('zelify_condominio_gestao', JSON.stringify(updated));
        
        // Disparar evento para atualizar outros componentes
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
        }
        
        setShowCheckoutModal(false);
        // Limpar campos
        setCardNumber('');
        setCardName('');
        setCardExpiry('');
        setCardCvv('');
        
        alert(`Assinatura ativada com sucesso! Seu condomínio agora está no plano ${selectedUpgrade === 'pro' ? 'Zelify Pro' : 'Zelify Corporate'}.`);
      } else {
        setCheckoutError('Não foi possível processar a assinatura.');
      }
    } catch (err) {
      console.error(err);
      setCheckoutError('Erro de processamento da transação. Tente novamente.');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleCopyPix = () => {
    const fakePixKey = '00020126580014br.gov.bcb.pix0136kpgmpwthrnlrikkplrul5204000053039865405149.005802BR5914Zelify%20Condominio6009Sao%20Paulo62070503***6304ABCD';
    navigator.clipboard.writeText(fakePixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-xs font-medium">Carregando configurações...</span>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${origin}/${slug}`;

  return (
    <div className="space-y-6 max-w-2xl relative">
      
      {/* HEADER */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Configurações do Condomínio</h1>
        <p className="text-xs text-zinc-500 font-medium">Personalize a identidade e acesso dos moradores</p>
      </div>

      {/* SUB-ABAS DE NAVEGAÇÃO */}
      <div className="flex border-b border-zinc-250 dark:border-zinc-800/80 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('geral')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'geral'
              ? 'border-[#0033FF] text-[#0033FF] dark:text-[#3b82f6]'
              : 'border-transparent text-zinc-550 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          Geral
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('faturamento')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'faturamento'
              ? 'border-[#0033FF] text-[#0033FF] dark:text-[#3b82f6]'
              : 'border-transparent text-zinc-550 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          Plano & Faturamento
        </button>
      </div>

      {activeTab === 'geral' ? (
        <div className="grid grid-cols-1 gap-6">
        
        {/* BOX DO LINK PÚBLICO */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            <Compass className="w-4 h-4 text-[#0033FF]" />
            <span>Endereço de Acesso Público</span>
          </div>
          
          <p className="text-xs text-zinc-500 leading-relaxed font-medium">
            Os moradores não criam conta ou senha. Eles acessam as manutenções e o mural de achados e perdidos utilizando a URL pública abaixo.
          </p>

          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="bg-transparent flex-1 text-xs text-zinc-800 dark:text-zinc-300 font-mono focus:outline-none select-all"
            />
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-[#0033FF] border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-white rounded-md transition-colors cursor-pointer"
                title="Copiar URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-450 animate-pulse" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={`/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-[#0033FF] border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-white rounded-md transition-colors"
                title="Visualizar Página Pública"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* GERADOR DE PLACA INFORMATIVA E QR CODE */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            <QrCode className="w-4 h-4 text-[#0033FF]" />
            <span>Placa Informativa & QR Code</span>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed font-medium">
            Gere uma placa informativa profissional para imprimir e colar nos elevadores, portarias ou áreas comuns do seu condomínio.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CONTROLES DE CUSTOMIZAÇÃO */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Título da Placa
                </label>
                <input
                  type="text"
                  value={posterTitle}
                  onChange={(e) => setPosterTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#0033FF]/50 font-semibold"
                  placeholder="Ex: Portal do Morador"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Instruções da Placa
                </label>
                <textarea
                  value={posterInstructions}
                  onChange={(e) => setPosterInstructions(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#0033FF]/50 font-medium resize-none leading-relaxed"
                  placeholder="Instruções para os moradores..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Tema Visual da Placa
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPosterTheme('blue')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      posterTheme === 'blue'
                        ? 'bg-[#0033FF]/10 border-[#0033FF] text-[#0033FF]'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0033FF] inline-block mr-1"></span>
                    Azul
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterTheme('zinc')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      posterTheme === 'zinc'
                        ? 'bg-zinc-200/50 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-200'
                        : 'bg-zinc-50 dark:bg-zinc-925 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-zinc-400 inline-block mr-1"></span>
                    Grafite
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterTheme('emerald')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      posterTheme === 'emerald'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'bg-zinc-50 dark:bg-zinc-925 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block mr-1"></span>
                    Verde
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => typeof window !== 'undefined' && window.print()}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Placa</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-white text-zinc-800 dark:text-zinc-200 text-xs font-bold py-2 rounded-lg flex items-center justify-center space-x-1.5 border border-zinc-200 dark:border-zinc-700 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar QR Code</span>
                </button>
              </div>
            </div>

            {/* PREVISÃO DA PLACA */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl pt-10 pb-6 px-4 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden min-h-[380px]">
              <div className="absolute top-3 right-3 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                Pré-visualização
              </div>

              {/* POSTER CARD */}
              <div 
                id="preview-poster" 
                className={`w-full max-w-[240px] bg-white rounded-lg border-2 p-5 shadow-md flex flex-col items-center justify-between text-zinc-800 ${
                  posterTheme === 'blue' 
                    ? 'border-[#0033FF]' 
                    : posterTheme === 'emerald' 
                    ? 'border-emerald-500' 
                    : 'border-zinc-800'
                }`}
              >
                {/* Header do Poster */}
                <div className="flex items-center space-x-1.5 mb-3">
                  <Building className={`w-4 h-4 ${
                    posterTheme === 'blue' 
                      ? 'text-[#0033FF]' 
                      : posterTheme === 'emerald' 
                      ? 'text-emerald-500' 
                      : 'text-zinc-800'
                  }`} />
                  <span className="font-bold text-[10px] tracking-widest uppercase">Zelify</span>
                </div>

                {/* Nome do Condominio */}
                <div className="text-[8px] bg-zinc-200 font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide border border-zinc-200 mb-2 truncate max-w-[180px]">
                  {nome || 'Seu Condomínio'}
                </div>

                {/* Título do Poster */}
                <h3 className="font-extrabold text-sm tracking-tight mb-2 leading-none">
                  {posterTitle || 'Portal do Morador'}
                </h3>

                {/* Instruções */}
                <p className="text-[7px] text-zinc-500 leading-normal mb-3 font-medium px-1">
                  {posterInstructions || 'Aponte seu celular.'}
                </p>

                {/* QR Code Frame */}
                <div className={`p-2 border rounded-lg bg-zinc-50 mb-3 shadow-inner ${
                  posterTheme === 'blue' 
                    ? 'border-[#0033FF]/20' 
                    : posterTheme === 'emerald' 
                    ? 'border-emerald-500/20' 
                    : 'border-zinc-200'
                }`}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`}
                    alt="QR Code de Acesso"
                    className="w-24 h-24 object-contain"
                  />
                </div>

                {/* Rodapé do Poster */}
                <div className="w-full text-center space-y-1 bg-zinc-50 p-2 rounded border border-zinc-100">
                  <div className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest">
                    Código de Acesso
                  </div>
                  <div className={`text-xs font-black tracking-widest ${
                    posterTheme === 'blue' 
                      ? 'text-[#0033FF]' 
                      : posterTheme === 'emerald' 
                      ? 'text-emerald-600' 
                      : 'text-zinc-800'
                  }`}>
                    {codigoAcesso || '----'}
                  </div>
                  <div className="text-[6px] text-zinc-400 font-mono truncate">
                    {slug ? `zelify.app/${slug}` : 'link'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FORMULÁRIO DE EDIÇÃO */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSalvar} className="space-y-5">
            
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-650 dark:text-red-400 flex items-center space-x-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-2 animate-in fade-in duration-200">
                <Check className="w-4 h-4 shrink-0 animate-pulse" />
                <span>Configurações salvas com sucesso!</span>
              </div>
            )}

            <div className="space-y-5 divide-y divide-zinc-200 dark:divide-zinc-800">
              
              <div className="space-y-2 pt-0">
                <label htmlFor="nomeCondo" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Nome do Condomínio
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-400 dark:text-zinc-600">
                    <Building className="w-4 h-4" />
                  </span>
                  <input
                    id="nomeCondo"
                    type="text"
                    placeholder="Ex: Residencial Viver Bem"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#0033FF]/50 focus:ring-4 focus:ring-[#0033FF]/10 font-semibold"
                    required
                  />
                </div>
              </div>

              {/* SLUG DA URL */}
              <div className="space-y-2 pt-5">
                <label htmlFor="slugCondo" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Slug da URL (Endereço Público)
                </label>
                <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-950 focus-within:border-[#0033FF]/50 focus-within:ring-4 focus-within:ring-[#0033FF]/10 transition-all">
                  <span className="flex items-center bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 px-3 text-zinc-500 dark:text-zinc-400 font-mono text-xs font-semibold select-none">
                    zelify.app/
                  </span>
                  <input
                    id="slugCondo"
                    type="text"
                    placeholder="ex: viverbem"
                    value={slug}
                    onChange={(e) => setSlug(formatSlug(e.target.value))}
                    className="flex-1 bg-transparent px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none font-semibold font-mono"
                    required
                  />
                </div>
                <p className="text-[10px] text-zinc-500 leading-tight font-medium">
                  Apenas letras minúsculas, números e hífens. O link final ficará: <span className="font-mono">{origin}/{slug}</span>
                </p>
              </div>

              {/* CODIGO DE ACESSO */}
              <div className="space-y-2 pt-5">
                <label htmlFor="codigoCondo" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Código de Acesso do Condomínio (4 Dígitos)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-400 dark:text-zinc-650">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    id="codigoCondo"
                    type="text"
                    maxLength={4}
                    placeholder="Ex: 1234"
                    value={codigoAcesso}
                    onChange={(e) => setCodigoAcesso(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white text-left tracking-widest focus:outline-none focus:border-[#0033FF]/50 focus:ring-4 focus:ring-[#0033FF]/10 font-bold"
                    required
                  />
                </div>
                <p className="text-[10px] text-zinc-500 leading-tight font-medium">
                  Código de 4 dígitos inserido pelo morador no primeiro acesso à página pública para evitar envios de spam.
                </p>
              </div>

            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0033FF] hover:bg-[#0033FF]/90 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-[0_4px_20px_rgba(0,51,255,0.20)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5 text-zinc-200" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Configurações</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* CARD DE STATUS DO PLANO ATUAL */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#0033FF]/5 blur-[60px] rounded-full pointer-events-none"></div>
            
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  <Layers className="w-3.5 h-3.5 text-[#0033FF]" />
                  <span>Plano Atual</span>
                </div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                  {condominio?.plan_type === 'free' ? 'Zelify Starter (Grátis)' : 
                   condominio?.plan_type === 'pro' ? 'Zelify Pro' : 'Zelify Corporate'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  condominio?.subscription_status === 'active' 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15' 
                    : 'bg-red-500/10 text-red-500 border-red-500/15 animate-pulse'
                }`}>
                  {condominio?.subscription_status === 'active' ? 'Assinatura Ativa' : 'Pendente (Bloqueado)'}
                </span>
                {condominio?.subscription_status !== 'active' && condominio?.plan_type !== 'free' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUpgrade(condominio!.plan_type as 'pro' | 'corporate');
                      setShowCheckoutModal(true);
                    }}
                    className="text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white px-2.5 py-0.5 rounded border border-red-500/20 transition-all active:scale-[0.95] cursor-pointer shadow-sm animate-pulse"
                  >
                    Regularizar Agora
                  </button>
                )}
              </div>
            </div>

            <div className="text-xs text-zinc-500 font-medium">
              {condominio?.plan_type === 'free' ? (
                <span>Seu condomínio possui limites mensais. Faça o upgrade para ter acesso ilimitado.</span>
              ) : (
                <span>
                  Renovação programada para:{' '}
                  <span className="font-bold text-zinc-700 dark:text-zinc-350">
                    {condominio?.current_period_end 
                      ? new Date(condominio.current_period_end).toLocaleDateString('pt-BR') 
                      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                  </span>
                </span>
              )}
            </div>

            {/* TRACKER DE LIMITES PARA PLANO GRÁTIS */}
            {condominio?.plan_type === 'free' && (
              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800/65 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-zinc-550 dark:text-zinc-500">Uso de Chamados (Mês Corrente):</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-extrabold">
                    {monthlyChamadosCount} / 15
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-200 dark:border-zinc-800/80">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      monthlyChamadosCount >= 15 ? 'bg-red-500' : 
                      monthlyChamadosCount >= 12 ? 'bg-amber-550' : 'bg-[#0033FF]'
                    }`}
                    style={{ width: `${Math.min((monthlyChamadosCount / 15) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  No plano Starter, seu condomínio está limitado a 15 chamados por mês (Manutenções e Achados). Ao atingir o limite, os moradores não conseguirão enviar novos chamados até o próximo mês ou até que seja feito o upgrade para o plano Pro.
                </p>
              </div>
            )}
          </div>

          {/* LISTA DE OPÇÕES DE PLANOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* PLANO PRO */}
            <div className={`bg-white dark:bg-zinc-900 border p-6 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl transition-all relative ${
              condominio?.plan_type === 'pro' 
                ? 'border-[#0033FF]' 
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}>
              {condominio?.plan_type === 'pro' && (
                <div className="absolute top-3 right-3 text-[8px] bg-[#0033FF]/10 text-[#0033FF] border border-[#0033FF]/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Plano Ativo
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest">Para Síndicos</span>
                  <h4 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center">
                    Zelify Pro
                    <Sparkles className="w-4 h-4 text-[#0033FF] ml-1.5" />
                  </h4>
                </div>
                
                <div className="flex items-baseline">
                  <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">R$ 149,00</span>
                  <span className="text-zinc-500 text-xs font-semibold ml-1">/mês</span>
                </div>

                <hr className="border-zinc-200 dark:border-zinc-800" />

                <ul className="space-y-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <li className="flex items-center text-zinc-750 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Chamados de Manutenção Ilimitados
                  </li>
                  <li className="flex items-center text-zinc-750 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Achados e Perdidos Ilimitados
                  </li>
                  <li className="flex items-center text-zinc-750 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Mural Kanban Completo
                  </li>
                  <li className="flex items-center text-zinc-750 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Relatórios Operacionais Mensais
                  </li>
                  <li className="flex items-center text-zinc-750 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    QR Code Oficial em Alta Resolução
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  disabled={condominio?.plan_type === 'pro' && condominio?.subscription_status === 'active'}
                  onClick={() => {
                    setSelectedUpgrade('pro');
                    setShowCheckoutModal(true);
                  }}
                  className={`w-full text-xs font-bold py-2.5 rounded-lg transition-all text-center flex items-center justify-center space-x-1.5 ${
                    condominio?.plan_type === 'pro' && condominio?.subscription_status === 'active'
                      ? 'bg-zinc-100 dark:bg-zinc-950 text-zinc-400 border border-zinc-200 dark:border-zinc-800 cursor-not-allowed'
                      : 'bg-[#0033FF] hover:bg-[#0033FF]/90 text-white shadow-[0_4px_15px_rgba(0,51,255,0.2)] active:scale-[0.98] cursor-pointer'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>
                    {condominio?.plan_type === 'pro' 
                      ? (condominio?.subscription_status === 'active' ? 'Plano Ativo' : 'Regularizar Assinatura') 
                      : 'Assinar Plano Pro'}
                  </span>
                </button>
              </div>
            </div>

            {/* PLANO CORPORATIVO (SIMULADOR) */}
            <div className={`bg-white dark:bg-zinc-900 border p-6 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl transition-all relative ${
              condominio?.plan_type === 'corporate' 
                ? 'border-[#0033FF]' 
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}>
              {condominio?.plan_type === 'corporate' && (
                <div className="absolute top-3 right-3 text-[8px] bg-[#0033FF]/10 text-[#0033FF] border border-[#0033FF]/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Plano Ativo
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-555 dark:text-zinc-500 uppercase tracking-widest">Para Administradoras</span>
                  <h4 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center">
                    Zelify Corporate
                    <Building className="w-4 h-4 text-[#0033FF] ml-1.5" />
                  </h4>
                </div>

                {/* SIMULADOR DE PLANO */}
                <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <label htmlFor="condosQty" className="text-[9px] font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-500">
                      Nº de Condomínios
                    </label>
                    <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setNumCondos(prev => Math.max(1, prev - 1))}
                        className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-850 active:scale-[0.92] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center font-bold transition-all border border-zinc-300/40 dark:border-zinc-800/80 cursor-pointer text-xs select-none"
                      >
                        -
                      </button>
                      <input
                        id="condosQty"
                        type="number"
                        min={1}
                        max={500}
                        value={numCondos}
                        onChange={(e) => setNumCondos(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-10 bg-transparent text-center text-xs font-bold font-sans text-zinc-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setNumCondos(prev => Math.min(500, prev + 1))}
                        className="w-6 h-6 rounded bg-[#0033FF] hover:bg-[#0033FF]/90 hover:shadow-[0_0_8px_rgba(0,51,255,0.4)] active:scale-[0.92] text-white flex items-center justify-center font-bold transition-all border border-[#0033FF]/45 cursor-pointer text-xs select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold border-t border-zinc-200 dark:border-zinc-800/60 pt-2">
                    <span>Preço / Prédio:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      R$ {numCondos <= 15 ? '59,00' : numCondos <= 50 ? '49,00' : '39,00'}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-zinc-200 dark:border-zinc-800/60 pt-2">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Mensalidade Total:</span>
                    <div className="flex items-baseline">
                      <span className="text-lg font-black text-[#0033FF]">
                        R$ {(numCondos * (numCondos <= 15 ? 59 : numCondos <= 50 ? 49 : 39)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-zinc-500 text-[10px] font-semibold ml-0.5">/mês</span>
                    </div>
                  </div>
                </div>

                <hr className="border-zinc-200 dark:border-zinc-800" />

                <ul className="space-y-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <li className="flex items-center text-zinc-750 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Painel Multi-Condomínios Unificado
                  </li>
                  <li className="flex items-center text-zinc-750 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Controle de Manutenção Consolidado
                  </li>
                  <li className="flex items-center text-zinc-750 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Relatórios em PDF por Lote
                  </li>
                  <li className="flex items-center text-zinc-750 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Rodapé Customizado com sua Marca
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  disabled={condominio?.plan_type === 'corporate' && condominio?.subscription_status === 'active'}
                  onClick={() => {
                    setSelectedUpgrade('corporate');
                    setShowCheckoutModal(true);
                  }}
                  className={`w-full text-xs font-bold py-2.5 rounded-lg transition-all text-center flex items-center justify-center space-x-1.5 ${
                    condominio?.plan_type === 'corporate' && condominio?.subscription_status === 'active'
                      ? 'bg-zinc-100 dark:bg-zinc-950 text-zinc-400 border border-zinc-200 dark:border-zinc-800 cursor-not-allowed'
                      : 'bg-[#0033FF] hover:bg-[#0033FF]/90 text-white shadow-[0_4px_15px_rgba(0,51,255,0.2)] active:scale-[0.98] cursor-pointer'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>
                    {condominio?.plan_type === 'corporate' 
                      ? (condominio?.subscription_status === 'active' ? 'Plano Ativo' : 'Regularizar Assinatura') 
                      : 'Assinar Plano Corporate'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CHECKOUT SIMULADO */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            {/* Linha superior azul */}
            <div className="h-1 bg-[#0033FF]"></div>
            
            {/* Header do checkout */}
            <div className="p-6 pb-4 border-b border-zinc-800/80 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Finalizar Assinatura</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                  Simulação de pagamento Zelify
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCheckout} className="p-6 space-y-4">
              {checkoutError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Detalhes do resumo */}
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-white uppercase">
                    {selectedUpgrade === 'pro' ? 'Plano Zelify Pro' : 'Plano Zelify Corporate'}
                  </p>
                  <p className="text-[10px] text-zinc-550 mt-0.5">Renovação mensal automática</p>
                </div>
                <div className="text-right font-black text-[#0033FF] text-sm">
                  {selectedUpgrade === 'pro' ? 'R$ 149,00' : 
                   `R$ ${(numCondos * (numCondos <= 15 ? 59 : numCondos <= 50 ? 49 : 39)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </div>
              </div>

              {/* Abas de Pagamento */}
              <div className="flex gap-2 p-1 bg-zinc-950 rounded-lg border border-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => { setCheckoutTab('pix'); setCheckoutError(''); }}
                  className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all cursor-pointer ${
                    checkoutTab === 'pix' 
                      ? 'bg-zinc-900 text-white shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  PIX
                </button>
                <button
                  type="button"
                  onClick={() => { setCheckoutTab('card'); setCheckoutError(''); }}
                  className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all cursor-pointer ${
                    checkoutTab === 'card' 
                      ? 'bg-zinc-900 text-white shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Cartão de Crédito
                </button>
              </div>

              {/* CONTEÚDO PIX */}
              {checkoutTab === 'pix' ? (
                <div className="space-y-4 flex flex-col items-center py-2">
                  {/* SVG QR Code */}
                  <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-inner">
                    <svg className="w-32 h-32 text-zinc-950" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100" height="100" fill="white" />
                      <rect x="5" y="5" width="25" height="25" fill="black" />
                      <rect x="8" y="8" width="19" height="19" fill="white" />
                      <rect x="12" y="12" width="11" height="11" fill="black" />

                      <rect x="70" y="5" width="25" height="25" fill="black" />
                      <rect x="73" y="8" width="19" height="19" fill="white" />
                      <rect x="77" y="12" width="11" height="11" fill="black" />

                      <rect x="5" y="70" width="25" height="25" fill="black" />
                      <rect x="8" y="73" width="19" height="19" fill="white" />
                      <rect x="12" y="77" width="11" height="11" fill="black" />

                      <rect x="35" y="5" width="10" height="5" fill="black" />
                      <rect x="50" y="5" width="5" height="10" fill="black" />
                      <rect x="60" y="10" width="5" height="5" fill="black" />
                      <rect x="35" y="20" width="5" height="5" fill="black" />
                      <rect x="45" y="20" width="10" height="5" fill="black" />
                      <rect x="60" y="20" width="5" height="10" fill="black" />
                      <rect x="35" y="35" width="15" height="5" fill="black" />
                      <rect x="55" y="30" width="5" height="15" fill="black" />
                      <rect x="70" y="35" width="10" height="5" fill="black" />
                      <rect x="5" y="45" width="10" height="5" fill="black" />
                      <rect x="20" y="45" width="5" height="10" fill="black" />
                      <rect x="30" y="50" width="15" height="5" fill="black" />
                      <rect x="50" y="45" width="5" height="15" fill="black" />
                      <rect x="65" y="50" width="10" height="5" fill="black" />
                      <rect x="80" y="45" width="15" height="5" fill="black" />
                      <rect x="35" y="60" width="5" height="10" fill="black" />
                      <rect x="45" y="65" width="15" height="5" fill="black" />
                      <rect x="65" y="60" width="5" height="5" fill="black" />
                      <rect x="35" y="75" width="10" height="5" fill="black" />
                      <rect x="50" y="75" width="5" height="15" fill="black" />
                      <rect x="60" y="80" width="15" height="5" fill="black" />
                      <rect x="80" y="70" width="5" height="15" fill="black" />
                      <rect x="90" y="80" width="5" height="10" fill="black" />
                      <rect x="35" y="90" width="10" height="5" fill="black" />
                      <rect x="55" y="90" width="15" height="5" fill="black" />
                      <rect x="75" y="90" width="5" height="5" fill="black" />
                    </svg>
                  </div>
                  <p className="text-[10px] text-zinc-550 dark:text-zinc-500 font-bold uppercase tracking-wider text-center">
                    Aponte a câmera do celular ou copie o código Pix abaixo
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg border border-zinc-800 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Código Pix Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Código Pix (Copia e Cola)</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* CONTEÚDO CARTÃO DE CRÉDITO */
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Nome no Cartão
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CARLOS S SANTOS"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#0033FF]/50 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Número do Cartão
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                        setCardNumber(v);
                      }}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#0033FF]/50 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        Validade (MM/AA)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length > 2) {
                            v = `${v.substring(0, 2)}/${v.substring(2, 4)}`;
                          }
                          setCardExpiry(v);
                        }}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#0033FF]/50 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        CVV
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={3}
                        placeholder="000"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#0033FF]/50 font-semibold text-center tracking-widest"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botão de Finalizar */}
              <div className="pt-4 border-t border-zinc-800 flex justify-end">
                <button
                  type="submit"
                  disabled={processingCheckout}
                  className="w-full bg-[#0033FF] hover:bg-[#0033FF]/90 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-[0_4px_15px_rgba(0,51,255,0.2)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {processingCheckout ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5 text-zinc-200" />
                      <span>Processando via Asaas...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        {checkoutTab === 'pix' ? 'Confirmar Pix Pago' : 'Finalizar Assinatura'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ELEMENTO DO POSTER IMPRESSO (OCULTO EM TELA, EXIBIDO NO PRINT A4) */}
      <div 
        id="printable-poster" 
        className={`hidden flex-col items-center justify-between text-center p-12 text-black bg-white rounded-none border-[12px] h-[297mm] w-[210mm] border-double ${
          posterTheme === 'blue' 
            ? 'border-[#0033FF]' 
            : posterTheme === 'emerald' 
            ? 'border-emerald-500' 
            : 'border-zinc-900'
        }`}
        style={{ fontFamily: 'sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-center space-x-3 mt-6">
          <Building className={`w-12 h-12 ${
            posterTheme === 'blue' 
              ? 'text-[#0033FF]' 
              : posterTheme === 'emerald' 
              ? 'text-emerald-500' 
              : 'text-zinc-900'
          }`} />
          <span className="font-black text-3xl tracking-widest uppercase">Zelify</span>
        </div>

        <div className="space-y-4">
          <div className="text-sm bg-zinc-200 font-black uppercase px-4 py-2 rounded-lg tracking-widest border border-zinc-300 inline-block">
            {nome || 'Seu Condomínio'}
          </div>
          
          <h1 className="font-black text-4xl tracking-tight leading-tight max-w-xl mx-auto">
            {posterTitle || 'Portal do Morador'}
          </h1>
          
          <p className="text-base text-zinc-650 leading-relaxed font-semibold max-w-lg mx-auto px-6">
            {posterInstructions}
          </p>
        </div>

        {/* QR Code Container */}
        <div className={`p-6 border-4 rounded-3xl bg-zinc-50 shadow-md ${
          posterTheme === 'blue' 
            ? 'border-[#0033FF]/30' 
            : posterTheme === 'emerald' 
            ? 'border-emerald-500/30' 
            : 'border-zinc-300'
        }`}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(publicUrl)}`}
            alt="QR Code de Acesso"
            className="w-64 h-64 object-contain mx-auto"
          />
        </div>

        {/* Instruções de Acesso */}
        <div className="w-full max-w-md mx-auto space-y-3 bg-zinc-50 p-6 rounded-2xl border border-zinc-200 shadow-sm mb-6">
          <div className="text-xs font-black uppercase tracking-widest text-zinc-500">
            Código de Acesso
          </div>
          <div className={`text-4xl font-black tracking-widest ${
            posterTheme === 'blue' 
              ? 'text-[#0033FF]' 
              : posterTheme === 'emerald' 
              ? 'text-emerald-600' 
              : 'text-zinc-900'
            }`}>
            {codigoAcesso || '----'}
          </div>
          <div className="text-sm text-zinc-500 font-mono pt-1">
            Link de Acesso: <span className="font-bold underline">{publicUrl}</span>
          </div>
        </div>

        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-4">
          Gerado automaticamente pelo Zelify
        </div>
      </div>

      {/* FOLHA DE ESTILOS DINAMICA PARA IMPRESSÃO A4 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Ocultar tudo na página */
          body * {
            visibility: hidden;
          }
          /* Mostrar apenas o poster de impressão e seus filhos */
          #printable-poster, #printable-poster * {
            visibility: visible;
          }
          #printable-poster {
            display: flex !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 40px !important;
            box-sizing: border-box !important;
            background: white !important;
            z-index: 9999999 !important;
            align-items: center !important;
            justify-content: space-between !important;
            flex-direction: column !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
}
