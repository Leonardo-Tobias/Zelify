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
  RefreshCw,
  Shield,
  X
} from 'lucide-react';
import { db, Condominio } from '@/lib/db';
import { BillingSwitch } from '@/components/ui/switch';

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
  const [isAnnual, setIsAnnual] = useState(false);
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
  const [cardEmail, setCardEmail] = useState('');
  const [cardCpf, setCardCpf] = useState('');
  const [cardPhone, setCardPhone] = useState('');
  const [cardCep, setCardCep] = useState('');
  const [cardAddressNumber, setCardAddressNumber] = useState('');
  const [cardAddressComplement, setCardAddressComplement] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [processingCheckout, setProcessingCheckout] = useState(false);

  // Estados do PIX real
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixCopyPaste, setPixCopyPaste] = useState<string | null>(null);
  const [checkoutSubscriptionId, setCheckoutSubscriptionId] = useState<string | null>(null);
  const [pixPaid, setPixPaid] = useState(false);

  // Toast de sucesso
  const [toast, setToast] = useState<{ message: string } | null>(null);

  useEffect(() => {
    const savedCondo = localStorage.getItem('zelcore_condominio_gestao');
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

    // Carrega dados frescos do banco de dados (Supabase ou LocalDB) para refletir atualizações
    async function fetchFreshCondo() {
      try {
        const fresh = await db.getCondominioBySlug(condo.slug);
        if (fresh) {
          setCondominio(fresh);
          localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(fresh));
        }
      } catch (err) {
        console.error('Erro ao atualizar condomínio com dados do banco:', err);
      }
    }
    fetchFreshCondo();
  }, [router]);

  // Carrega a aba e o plano a partir da URL se fornecidos (fluxo de signup vindo da LP)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      const tabParam = search.get('tab');
      const planParam = search.get('plan');
      const intervalParam = search.get('interval');
      
      if (tabParam === 'faturamento') {
        setActiveTab('faturamento');
        
        if (intervalParam === 'yearly') {
          setIsAnnual(true);
        }
        
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

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
    const fullUrl = `https://zelify.vercel.app/${condominio.slug}`;
    
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = async () => {
    try {
      if (!condominio) return;
      const targetUrl = `https://zelify.vercel.app/${condominio.slug}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `qrcode-${condominio.slug}.png`;
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
        localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(updated));
        
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
      if (!cardNumber || !cardName || !cardExpiry || !cardCvv || !cardEmail || !cardCpf) {
        setCheckoutError('Preencha todos os campos do cartão (nome, e-mail, CPF, número, validade e CVV).');
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

    if (cardCpf.replace(/\D/g, '').length !== 11) {
      setCheckoutError('CPF inválido. Digite 11 dígitos.');
      return;
    }
    if (cardPhone.replace(/\D/g, '').length < 10) {
      setCheckoutError('Telefone inválido. Informe DDD + número (ex: 11999999999).');
      return;
    }
    if (cardCep.replace(/\D/g, '').length !== 8) {
      setCheckoutError('CEP inválido. Digite 8 dígitos.');
      return;
    }
    if (!cardAddressNumber.trim()) {
      setCheckoutError('Informe o número do endereço.');
      return;
    }

    setProcessingCheckout(true);

    try {
      const price = selectedUpgrade === 'pro'
        ? (isAnnual ? 124 : 149)
        : Math.round(totalCorporatePrice * 100) / 100;

      let cpfClean = cardCpf.replace(/\D/g, '')
      let phoneClean = cardPhone.replace(/\D/g, '')

      const body: Record<string, unknown> = {
        condominioId: condominio!.id,
        nome: condominio!.nome,
        email: localStorage.getItem('zelcore_user_email') || '',
        planType: selectedUpgrade,
        billingType: checkoutTab === 'pix' ? 'PIX' : 'CREDIT_CARD',
        cycle: isAnnual ? 'YEARLY' : 'MONTHLY',
        value: price,
        cpfCnpj: cpfClean || undefined,
        phone: phoneClean.length >= 10 ? phoneClean : undefined,
      };

      if (checkoutTab === 'card') {
        const [expMonth, expYear] = cardExpiry.split('/');
        body.creditCard = {
          holderName: cardName,
          number: cardNumber.replace(/\s/g, ''),
          expiryMonth: expMonth,
          expiryYear: `20${expYear}`,
          ccv: cardCvv,
        };
        body.holderInfo = {
          name: cardName,
          email: cardEmail,
          cpfCnpj: cpfClean,
          phone: phoneClean.length >= 10 ? phoneClean : '11912345678',
          postalCode: cardCep.replace(/\D/g, ''),
          addressNumber: cardAddressNumber,
          addressComplement: cardAddressComplement || undefined,
        };
      }

      const res = await fetch('/api/asaas/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar checkout');
      }

      if (checkoutTab === 'pix' && data.pix) {
        setPixQrCode(data.pix.qrCode || null);
        setPixCopyPaste(data.pix.copyPaste || null);
        setCheckoutSubscriptionId(data.subscriptionId);
        setProcessingCheckout(false);
        // Não fecha o modal — aguarda pagamento PIX
        return;
      }

      // Cartão: já confirmado, atualiza local
      const updated: Condominio = {
        ...condominio!,
        plan_type: selectedUpgrade,
        subscription_status: 'active',
        billing_type: 'CREDIT_CARD' as const,
        current_period_end: new Date(Date.now() + (isAnnual ? 365 : 30) * 86400000).toISOString(),
      };
      setCondominio(updated);
      localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      setShowCheckoutModal(false);
      setCardNumber(''); setCardName(''); setCardExpiry(''); setCardCvv(''); setCardEmail(''); setCardCpf(''); setCardPhone('');
      setToast({ message: `Assinatura ativada com sucesso! Seu condomínio agora está no plano ${selectedUpgrade === 'pro' ? 'Zelcore Pro' : 'Zelcore Corporate'}.` });
    } catch (err) {
      console.error(err);
      setCheckoutError(err instanceof Error ? err.message : 'Erro de processamento da transação. Tente novamente.');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleCopyPix = () => {
    const key = pixCopyPaste || '00020126580014br.gov.bcb.pix0136kpgmpwthrnlrikkplrul5204000053039865405149.005802BR5914Zelcore%20Condominio6009Sao%20Paulo62070503***6304ABCD';
    navigator.clipboard.writeText(key);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handlePixPaid = async () => {
    if (!checkoutSubscriptionId) return;
    try {
      const updated = await db.updateCondominioPlan(
        condominio!.id,
        selectedUpgrade,
        'active',
        isAnnual ? 'yearly' : 'monthly',
        'PIX'
      );
      if (updated) {
        setCondominio(updated);
        localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        setShowCheckoutModal(false);
        setPixQrCode(null);
        setPixCopyPaste(null);
        setCheckoutSubscriptionId(null);
        setPixPaid(true);
        setTimeout(() => setPixPaid(false), 4000);
      }
    } catch {
      // fallback: mesmo sem confirmação do webhook, ativa localmente
      setShowCheckoutModal(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!condominio) return;

    const confirmed = window.confirm('Tem certeza que deseja cancelar a assinatura? Seu condomínio voltará para o plano gratuito.');

    if (!confirmed) return;

    setProcessingCheckout(true);
    try {
      const res = await fetch('/api/asaas/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condominioId: condominio.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cancelar assinatura');
      }

      const updated = await db.resetToFreePlan(condominio.id);
      if (updated) {
        setCondominio(updated);
        localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        setToast({ message: 'Assinatura cancelada. Seu condomínio agora está no plano gratuito.' });
      }
    } catch (err) {
      console.error(err);
      setCheckoutError(err instanceof Error ? err.message : 'Erro ao cancelar assinatura');
    } finally {
      setProcessingCheckout(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-xs font-medium">Carregando configurações...</span>
      </div>
    );
  }



  // Preços dinâmicos baseados no Toggle Mensal / Anual
  const pricePro = isAnnual ? 124 : 149;
  
  let priceCorporatePerCondo = isAnnual ? 49 : 59;
  if (numCondos >= 16 && numCondos <= 50) {
    priceCorporatePerCondo = isAnnual ? 39 : 49;
  } else if (numCondos > 50) {
    priceCorporatePerCondo = isAnnual ? 29 : 39;
  }
  const totalCorporatePrice = numCondos * priceCorporatePerCondo;

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
              ? 'border-[#001CFF] text-[#001CFF] dark:text-[#3b82f6]'
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
              ? 'border-[#001CFF] text-[#001CFF] dark:text-[#3b82f6]'
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
            <Compass className="w-4 h-4 text-[#001CFF]" />
            <span>Endereço de Acesso Público</span>
          </div>
          
          <p className="text-xs text-zinc-500 leading-relaxed font-medium">
            Os moradores não criam conta ou senha. Eles acessam as manutenções e o mural de achados e perdidos utilizando a URL pública abaixo.
          </p>

          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <input
              type="text"
              readOnly
              value={condominio ? `https://zelify.vercel.app/${condominio.slug}` : ''}
              className="bg-transparent flex-1 text-xs text-zinc-800 dark:text-zinc-300 font-mono focus:outline-none select-all"
            />
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-[#001CFF] border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-white rounded-md transition-colors cursor-pointer"
                title="Copiar URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-450 animate-pulse" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={condominio ? `https://zelify.vercel.app/${condominio.slug}` : '#'}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-[#001CFF] border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-white rounded-md transition-colors"
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
            <QrCode className="w-4 h-4 text-[#001CFF]" />
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
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#001CFF]/50 font-semibold"
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
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#001CFF]/50 font-medium resize-none leading-relaxed"
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
                        ? 'bg-[#001CFF]/10 border-[#001CFF] text-[#001CFF]'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#001CFF] inline-block mr-1"></span>
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
                    ? 'border-[#001CFF]' 
                    : posterTheme === 'emerald' 
                    ? 'border-emerald-500' 
                    : 'border-zinc-800'
                }`}
              >
                {/* Header do Poster */}
                <div className="flex items-center space-x-1.5 mb-3">
                  <Building className={`w-4 h-4 ${
                    posterTheme === 'blue' 
                      ? 'text-[#001CFF]' 
                      : posterTheme === 'emerald' 
                      ? 'text-emerald-500' 
                      : 'text-zinc-800'
                  }`} />
                  <span className="font-bold text-[10px] tracking-widest uppercase">Zelcore</span>
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
                    ? 'border-[#001CFF]/20' 
                    : posterTheme === 'emerald' 
                    ? 'border-emerald-500/20' 
                    : 'border-zinc-200'
                }`}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(condominio ? `https://zelify.vercel.app/${condominio.slug}` : '')}`}
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
                      ? 'text-[#001CFF]' 
                      : posterTheme === 'emerald' 
                      ? 'text-emerald-600' 
                      : 'text-zinc-800'
                  }`}>
                    {codigoAcesso || '----'}
                  </div>
                  <div className="text-[6px] text-zinc-400 font-mono truncate">
                    {condominio?.slug ? `zelify.vercel.app/${condominio.slug}` : 'link'}
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
                    className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#001CFF]/50 focus:ring-4 focus:ring-[#001CFF]/10 font-semibold"
                    required
                  />
                </div>
              </div>

              {/* SLUG DA URL */}
              <div className="space-y-2 pt-5">
                <label htmlFor="slugCondo" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Slug da URL (Endereço Público)
                </label>
                <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-950 focus-within:border-[#001CFF]/50 focus-within:ring-4 focus-within:ring-[#001CFF]/10 transition-all">
                  <span className="flex items-center bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 px-3 text-zinc-500 dark:text-zinc-400 font-mono text-xs font-semibold select-none">
                    zelify.vercel.app/
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
                  Apenas letras minúsculas, números e hífens. O link final ficará: <span className="font-mono">https://zelify.vercel.app/{slug}</span>
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
                    className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white text-left tracking-widest focus:outline-none focus:border-[#001CFF]/50 focus:ring-4 focus:ring-[#001CFF]/10 font-bold"
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
                className="bg-[#001CFF] hover:bg-[#001CFF]/90 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-[0_4px_20px_rgba(0,51,255,0.20)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#001CFF]/5 blur-[60px] rounded-full pointer-events-none"></div>
            
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  <Layers className="w-3.5 h-3.5 text-[#001CFF]" />
                  <span>Plano Atual</span>
                </div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                  {condominio?.plan_type === 'free' ? 'Zelcore Starter (Grátis)' : 
                   condominio?.plan_type === 'pro' ? 'Zelcore Pro' : 'Zelcore Corporate'}
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
                      monthlyChamadosCount >= 12 ? 'bg-amber-550' : 'bg-[#001CFF]'
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

          {/* Toggle Switch */}
          <BillingSwitch isAnnual={isAnnual} onChange={setIsAnnual} />

          {/* LISTA DE OPÇÕES DE PLANOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* PLANO PRO */}
            <div className={`bg-white dark:bg-zinc-900 border p-6 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-xl transition-all relative ${
              condominio?.plan_type === 'pro' 
                ? 'border-[#001CFF]' 
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}>
              {condominio?.plan_type === 'pro' && (
                <div className="absolute top-3 right-3 text-[8px] bg-[#001CFF]/10 text-[#001CFF] border border-[#001CFF]/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Plano Ativo
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest">Para Síndicos</span>
                  <h4 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center">
                    Zelcore Pro
                    <Sparkles className="w-4 h-4 text-[#001CFF] ml-1.5" />
                  </h4>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-baseline">
                    <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">R$ {pricePro},00</span>
                    <span className="text-zinc-500 text-xs font-semibold ml-1">/mês</span>
                  </div>
                  {isAnnual && (
                    <span className="text-[10px] text-zinc-400 font-bold mt-1 text-left">
                      Cobrado anualmente R$ 1.488/ano
                    </span>
                  )}
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
                      : 'bg-[#001CFF] hover:bg-[#001CFF]/90 text-white shadow-[0_4px_15px_rgba(0,51,255,0.2)] active:scale-[0.98] cursor-pointer'
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
                ? 'border-[#001CFF]' 
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}>
              {condominio?.plan_type === 'corporate' && (
                <div className="absolute top-3 right-3 text-[8px] bg-[#001CFF]/10 text-[#001CFF] border border-[#001CFF]/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Plano Ativo
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-555 dark:text-zinc-500 uppercase tracking-widest">Para Administradoras</span>
                  <h4 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center">
                    Zelcore Corporate
                    <Building className="w-4 h-4 text-[#001CFF] ml-1.5" />
                  </h4>
                </div>

                {/* SIMULADOR DE PLANO */}
                <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <label htmlFor="condosQty" className="text-[9px] font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-500">
                      Nº de Condomínios
                    </label>
                    <div className="flex flex-col items-end space-y-1">
                      <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 shadow-inner">
                        <button
                          type="button"
                          onClick={() => setNumCondos(prev => Math.max(5, prev - 1))}
                          className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-850 active:scale-[0.92] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center font-bold transition-all border border-zinc-300/40 dark:border-zinc-800/80 cursor-pointer text-xs select-none"
                        >
                          -
                        </button>
                        <input
                          id="condosQty"
                          type="number"
                          min={5}
                          max={500}
                          value={numCondos}
                          onChange={(e) => setNumCondos(Math.max(5, parseInt(e.target.value) || 5))}
                          className="w-10 bg-transparent text-center text-xs font-bold font-sans text-zinc-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => setNumCondos(prev => Math.min(500, prev + 1))}
                          className="w-6 h-6 rounded bg-[#001CFF] hover:bg-[#001CFF]/90 hover:shadow-[0_0_8px_rgba(0,51,255,0.4)] active:scale-[0.92] text-white flex items-center justify-center font-bold transition-all border border-[#001CFF]/45 cursor-pointer text-xs select-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[8px] text-zinc-555 dark:text-zinc-500 text-right mt-1.5 font-semibold">
                    *Condição exclusiva para o plano Corporate (mínimo de 5 condomínios ativos).
                  </p>

                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold border-t border-zinc-200 dark:border-zinc-800/60 pt-2">
                    <span>Preço / Prédio:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      R$ {priceCorporatePerCondo},00
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-zinc-200 dark:border-zinc-800/60 pt-2">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Mensalidade Total:</span>
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline">
                        <span className="text-lg font-black text-[#001CFF]">
                          R$ {totalCorporatePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-zinc-500 text-[10px] font-semibold ml-0.5">/mês</span>
                      </div>
                      {isAnnual && (
                        <span className="text-[9.5px] text-zinc-450 dark:text-zinc-550 font-bold mt-0.5">
                          Cobrado anualmente (R$ {(totalCorporatePrice * 12).toLocaleString('pt-BR')}/ano)
                        </span>
                      )}
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
                      : 'bg-[#001CFF] hover:bg-[#001CFF]/90 text-white shadow-[0_4px_15px_rgba(0,51,255,0.2)] active:scale-[0.98] cursor-pointer'
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

      {/* Banner PIX pago com sucesso */}
      {pixPaid && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Pagamento PIX confirmado! Seu plano foi ativado com sucesso.</span>
        </div>
      )}

      {/* MODAL DE CHECKOUT */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh]">
            {/* Linha superior azul */}
            <div className="h-1 bg-[#001CFF] shrink-0"></div>
            
            {/* Header do checkout */}
            <div className="p-6 pb-4 border-b border-zinc-800/80 flex justify-between items-center sticky top-0 bg-[#0c0c0e] z-10">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Finalizar Assinatura</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                  Simulação de pagamento Zelcore
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

            <form onSubmit={handleCheckout} className="overflow-y-auto flex-1 p-6 space-y-4">
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
                    {selectedUpgrade === 'pro' ? 'Plano Zelcore Pro' : 'Plano Zelcore Corporate'}
                  </p>
                  <p className="text-[10px] text-zinc-550 mt-0.5">
                    {isAnnual ? 'Renovação anual automática' : 'Renovação mensal automática'}
                  </p>
                </div>
                <div className="text-right font-black text-[#001CFF] text-sm flex flex-col items-end">
                  <span>
                    {selectedUpgrade === 'pro' 
                      ? `R$ ${pricePro},00` 
                      : `R$ ${totalCorporatePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </span>
                  <span className="text-[8px] text-zinc-500 font-bold uppercase">
                    {isAnnual ? '/mês (cobrado anualmente)' : '/mês'}
                  </span>
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
                <div className="space-y-4 flex flex-col py-2">
                  {pixQrCode ? (
                    <>
                      {/* QR Code real do Asaas */}
                      <div className="flex flex-col items-center space-y-4">
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-inner">
                          <img src={`data:image/png;base64,${pixQrCode}`} alt="QR Code PIX" className="w-32 h-32" />
                        </div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-center">
                          Aponte a câmera do celular ou copie o código Pix abaixo
                        </p>

                        <button
                          type="button"
                          onClick={handleCopyPix}
                          className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg border border-zinc-800 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          {copiedPix ? (
                            <><Check className="w-3.5 h-3.5 text-emerald-500" /><span>Código Pix Copiado!</span></>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /><span>Copiar Código Pix (Copia e Cola)</span></>
                          )}
                        </button>

                        <span className="text-[9px] text-zinc-600 text-center leading-relaxed block">
                          Após pagar, clique no botão abaixo para ativar seu plano.<br />
                          O sistema também será atualizado automaticamente quando o pagamento for confirmado.
                        </span>

                        <button
                          type="button"
                          onClick={handlePixPaid}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg border border-emerald-700 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Já paguei! Ativar Plano</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {processingCheckout ? (
                        <>
                          <div className="flex flex-col items-center space-y-4">
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-inner">
                              <div className="w-32 h-32 flex items-center justify-center text-zinc-300">
                                <Loader2 className="w-8 h-8 animate-spin" />
                              </div>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-center">
                              Gerando QR Code PIX...
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                              CPF do Titular
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={14}
                              placeholder="000.000.000-00"
                              value={cardCpf}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').substring(0, 14);
                                setCardCpf(v);
                              }}
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                              Telefone (com DDD)
                            </label>
                            <input
                              type="tel"
                              maxLength={15}
                              placeholder="(11) 99999-9999"
                              value={cardPhone}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').substring(0, 15);
                                setCardPhone(v);
                              }}
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                CEP
                              </label>
                              <input
                                type="text"
                                required
                                maxLength={9}
                                placeholder="00000-000"
                                value={cardCep}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2').substring(0, 9);
                                  setCardCep(v);
                                }}
                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Número
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Ex: 100"
                                value={cardAddressNumber}
                                onChange={(e) => setCardAddressNumber(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                              Complemento <span className="text-zinc-600">(opcional)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Apt 42, Bloco B"
                              value={cardAddressComplement}
                              onChange={(e) => setCardAddressComplement(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
                            />
          </div>

          {/* CANCELAR ASSINATURA */}
          {condominio?.plan_type !== 'free' && (
            <div className="bg-white dark:bg-zinc-900 border border-red-500/20 p-6 rounded-xl shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                    Cancelar Assinatura
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed max-w-md">
                    Ao cancelar, sua assinatura será encerrada e seu condomínio voltará para o plano gratuito (Zelcore Starter). Os dados serão mantidos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  className="text-[11px] font-bold bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-all active:scale-[0.97] cursor-pointer shrink-0"
                >
                  Cancelar Assinatura
                </button>
              </div>
            </div>
          )}
        </div>
      )}
                    </>
                  )}
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
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      E-mail do Titular
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="email@condominio.com"
                      value={cardEmail}
                      onChange={(e) => setCardEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      CPF do Titular
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={14}
                      placeholder="000.000.000-00"
                      value={cardCpf}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').substring(0, 14);
                        setCardCpf(v);
                      }}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Telefone (com DDD)
                    </label>
                    <input
                      type="tel"
                      maxLength={15}
                      placeholder="(11) 99999-9999"
                      value={cardPhone}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').substring(0, 15);
                        setCardPhone(v);
                      }}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        CEP
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={9}
                        placeholder="00000-000"
                        value={cardCep}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2').substring(0, 9);
                          setCardCep(v);
                        }}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        Número
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 100"
                        value={cardAddressNumber}
                        onChange={(e) => setCardAddressNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Complemento <span className="text-zinc-600">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Apt 42, Bloco B"
                      value={cardAddressComplement}
                      onChange={(e) => setCardAddressComplement(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
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
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
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
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold"
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
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-[#001CFF]/50 font-semibold text-center tracking-widest"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Rodapé fixo: badges + CTA */}
              <div className="sticky bottom-0 bg-[#0c0c0e] border-t border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
                <div className="px-6 pt-4 pb-2 space-y-1.5">
                  <div className="flex items-center space-x-2 text-[9.5px] text-zinc-500">
                    <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Pagamento processado pelo <strong className="text-zinc-400">Asaas</strong></span>
                  </div>
                  <div className="flex items-center space-x-2 text-[9.5px] text-zinc-500">
                    <Shield className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Dados criptografados via <strong className="text-zinc-400">SSL/TLS</strong></span>
                  </div>
                  <div className="flex items-center space-x-2 text-[9.5px] text-zinc-500">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Não armazenamos dados do seu cartão</span>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-2">
                  <button
                    type="submit"
                    disabled={processingCheckout}
                    className="w-full bg-[#001CFF] hover:bg-[#001CFF]/90 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-[0_4px_15px_rgba(0,51,255,0.2)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
                          {checkoutTab === 'pix' ? (pixQrCode ? 'Confirmar Pix Pago' : 'Gerar QR Code PIX') : 'Finalizar Assinatura'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast de sucesso */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-sm w-full">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 shadow-2xl bg-gradient-to-br from-emerald-500/10 via-zinc-950/95 to-zinc-950/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(16,185,129,0.1)]">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl pointer-events-none bg-emerald-500/15" />
            <div className="relative p-4">
              <button
                onClick={() => setToast(null)}
                className="absolute top-3 right-3 p-1 text-zinc-500 hover:text-white rounded-md hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-start space-x-3 pr-6">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-emerald-500/15 border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">Assinatura Ativada</p>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed font-medium">{toast.message}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ELEMENTO DO POSTER IMPRESSO (OCULTO EM TELA, EXIBIDO NO PRINT A4) */}
      <div 
        id="printable-poster" 
        className={`hidden flex-col items-center justify-between text-center p-12 text-black bg-white rounded-none border-[12px] h-[297mm] w-[210mm] border-double ${
          posterTheme === 'blue' 
            ? 'border-[#001CFF]' 
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
              ? 'text-[#001CFF]' 
              : posterTheme === 'emerald' 
              ? 'text-emerald-500' 
              : 'text-zinc-900'
          }`} />
          <span className="font-black text-3xl tracking-widest uppercase">Zelcore</span>
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
            ? 'border-[#001CFF]/30' 
            : posterTheme === 'emerald' 
            ? 'border-emerald-500/30' 
            : 'border-zinc-300'
        }`}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(condominio ? `https://zelify.vercel.app/${condominio.slug}` : '')}`}
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
              ? 'text-[#001CFF]' 
              : posterTheme === 'emerald' 
              ? 'text-emerald-600' 
              : 'text-zinc-900'
            }`}>
            {codigoAcesso || '----'}
          </div>
          <div className="text-sm text-zinc-500 font-mono pt-1">
            Link de Acesso: <span className="font-bold underline">https://zelify.vercel.app/{condominio?.slug || ''}</span>
          </div>
        </div>

        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-4">
          Gerado automaticamente pelo Zelcore
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
