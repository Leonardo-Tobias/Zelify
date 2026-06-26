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
  Download
} from 'lucide-react';
import { db, Condominio } from '@/lib/db';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [loading, setLoading] = useState(true);

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
