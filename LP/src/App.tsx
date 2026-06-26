import React, { useState } from 'react';
import { 
  Building2, 
  QrCode, 
  CheckCircle2, 
  ArrowRight, 
  Wrench, 
  Package, 
  ArrowUpRight, 
  ChevronDown, 
  User, 
  Mail, 
  Sparkles,
  Check,
  Send,
  MessageSquare
} from 'lucide-react';

export default function App() {
  const [mockupTheme, setMockupTheme] = useState<'dark' | 'light'>('dark');
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [b2bModalOpen, setB2bModalOpen] = useState(false);
  const [b2bSubmitted, setB2bSubmitted] = useState(false);
  const [b2bName, setB2bName] = useState('');
  const [b2bEmail, setB2bEmail] = useState('');
  const [b2bCompany, setB2bCompany] = useState('');
  const [b2bPhone, setB2bPhone] = useState('');

  const toggleFaq = (index: number) => {
    setFaqOpen(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleB2bSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (b2bName && b2bEmail && b2bCompany) {
      setB2bSubmitted(true);
      setTimeout(() => {
        setB2bSubmitted(false);
        setB2bModalOpen(false);
        setB2bName('');
        setB2bEmail('');
        setB2bCompany('');
        setB2bPhone('');
      }, 3000);
    }
  };

  const faqItems = [
    {
      q: "O morador realmente não precisa baixar nada para usar?",
      a: "Não. O morador apenas aponta a câmera do celular para o QR Code fixado no prédio. O Zelify abre instantaneamente no navegador do smartphone (como uma página web leve), permitindo registrar a ocorrência com foto em menos de 20 segundos. Sem downloads, sem criação de contas, sem senhas."
    },
    {
      q: "Como o síndico ou o zelador ficam sabendo das novas ocorrências?",
      a: "O sistema centraliza tudo no Painel do Gestor em tempo real. Além disso, o Zelify envia alertas automáticos por e-mail e notificações configuráveis assim que um morador envia um novo relato, garantindo que nenhum vazamento ou lâmpada queimada passe despercebida."
    },
    {
      q: "Qualquer pessoa de fora do condomínio pode escanear o QR Code e enviar falsos chamados?",
      a: "Não. Para a segurança do prédio, cada condomínio possui um link exclusivo atrelado a um código de acesso rápido de 4 dígitos impresso no próprio adesivo do QR Code. Apenas quem tem acesso físico às áreas internas do prédio consegue visualizar e enviar o chamado."
    },
    {
      q: "Como funciona a cobrança em lote para as Administradoras de Condomínio?",
      a: "Oferecemos uma tabela progressiva extremamente vantajosa para administradoras que desejam incluir o Zelify em sua carteira de clientes, reduzindo o custo unitário por prédio à medida que o volume aumenta (variando de R$ 59 a R$ 39 mensais por condomínio ativo). A gestão financeira é unificada em uma única fatura mensal."
    },
    {
      q: "O Plano Starter Gratuito tem pegadinhas ou exige cartão de crédito?",
      a: "Não. O Plano Starter é 100% gratuito para 1 condomínio e serve para você validar o sistema na prática. Você pode usar todos os meses até atingir o teto de 15 chamados mensais. Não pedimos cartão de crédito no cadastro e você só faz o upgrade para o Plano Pro se e quando quiser liberar chamados ilimitados."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#001CFF]/10 selection:text-[#001CFF] scroll-smooth antialiased">
      
      {/* 2. NAVBAR */}
      <nav className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              Zelify<span className="text-[#001CFF]">.</span>
            </span>
            <span className="text-[10px] bg-slate-200/60 text-slate-650 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Zeladoria
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <a 
              href="https://app.zelify.com.br/login"
              target="_blank"
              rel="noreferrer"
              className="border border-slate-900 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 active:scale-[0.98] cursor-pointer"
            >
              Entrar no Painel
            </a>
          </div>
        </div>
      </nav>

      {/* 3. A. HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-36 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Lado Esquerdo: Textos e CTAs */}
          <div className="lg:col-span-7 space-y-8 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-slate-200/50 border border-slate-250/60 px-3 py-1 rounded-full text-[11px] font-bold text-slate-700 uppercase tracking-widest animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-[#001CFF]" />
              <span>O Futuro da Zeladoria Condominial</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.05]">
              A gestão de manutenção do seu condomínio, <span className="text-[#001CFF] underline decoration-wavy decoration-2">direto no QR Code</span>.
            </h1>

            <p className="text-slate-600 text-sm sm:text-base md:text-lg font-medium leading-relaxed">
              Elimine os relatos perdidos no WhatsApp. Moradores notificam problemas de zeladoria e achados em 20 segundos, direto do navegador e sem precisar baixar nenhum aplicativo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a 
                href="https://app.zelify.com.br/signup"
                target="_blank"
                rel="noreferrer"
                className="bg-[#001CFF] hover:bg-[#0014CC] text-white text-xs font-extrabold uppercase tracking-widest px-8 py-4 rounded-xl shadow-[0_8px_30px_rgba(0,28,255,0.22)] hover:shadow-[0_8px_30px_rgba(0,28,255,0.35)] transition-all text-center flex items-center justify-center space-x-2 active:scale-[0.98] cursor-pointer"
              >
                <span>Começar Teste Grátis</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <button 
                onClick={() => setB2bModalOpen(true)}
                className="border border-slate-300 hover:border-slate-800 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-extrabold uppercase tracking-widest px-8 py-4 rounded-xl transition-all text-center flex items-center justify-center active:scale-[0.98] cursor-pointer"
              >
                Demonstração Corporativa
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-200/60 max-w-lg">
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">20s</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Tempo de relato</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">Zero</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">App p/ baixar</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">100%</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Transparência</p>
              </div>
            </div>
          </div>

          {/* Lado Direito: Elemento Visual (Mockup Elevador + QR Code) */}
          <div className="lg:col-span-5 relative w-full flex justify-center">
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#001CFF]/5 to-transparent blur-3xl rounded-full opacity-60"></div>
            
            {/* Mockup Ilustrativo do Elevador Inox e Escaneamento */}
            <div className="relative w-full max-w-[360px] bg-gradient-to-b from-slate-900 via-slate-955 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden aspect-[4/5] flex flex-col justify-between group hover:border-slate-700 transition-all duration-500">
              
              {/* Efeito de Reflexo Metálico Diagonal */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-white/[0.05] to-transparent pointer-events-none z-10"></div>
              
              {/* Textura Aço Inox (Linhas Verticais) */}
              <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(90deg,rgba(255,255,255,0.1)_50%,transparent_50%)] bg-[size:4px_100%] pointer-events-none"></div>

              {/* Painel de Botões Inox Realista */}
              <div className="absolute right-6 top-8 w-16 bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/60 rounded-2xl p-2.5 flex flex-col items-center space-y-4 shadow-xl z-0">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]"></div>
                
                <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-bold shadow-inner">12</div>
                <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-bold shadow-inner">11</div>
                
                {/* Botão Ativo com LED Azul */}
                <div className="w-9 h-9 rounded-full bg-zinc-900 border-2 border-[#001CFF] flex items-center justify-center text-[10px] text-[#001CFF] font-black shadow-[0_0_12px_rgba(0,28,255,0.6)] animate-pulse">10</div>
                
                <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-bold shadow-inner">9</div>
              </div>

              {/* Adesivo QR Code Vinílico Premium */}
              <div className="relative z-10 w-48 bg-white border border-slate-200 p-4.5 rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.15)] transform -rotate-4 hover:rotate-0 transition-transform duration-500 self-start mt-6 flex flex-col items-center">
                {/* Cabeçalho do Adesivo */}
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5 mb-2.5 w-full">
                  <div className="w-5 h-5 rounded bg-[#001CFF] flex items-center justify-center text-white text-[10px] font-black">
                    Z
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-900 tracking-wider">
                    Zelify<span className="text-[#001CFF]">.</span>
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 relative">
                  {/* Corner Targets */}
                  <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t-2 border-l-2 border-[#001CFF]/40 rounded-tl"></div>
                  <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t-2 border-r-2 border-[#001CFF]/40 rounded-tr"></div>
                  <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b-2 border-l-2 border-[#001CFF]/40 rounded-bl"></div>
                  <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b-2 border-r-2 border-[#001CFF]/40 rounded-br"></div>
                  
                  <QrCode className="w-20 h-20 text-slate-900" />
                </div>

                {/* Info Text */}
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center mt-3 leading-none">
                  Aponte a câmera
                </p>
                <p className="text-[7px] text-slate-500 font-semibold text-center mt-1 uppercase tracking-wider">
                  para relatar problemas
                </p>

                {/* ID Tag */}
                <div className="text-[8.5px] font-mono font-black text-[#001CFF] border border-[#001CFF]/20 bg-[#001CFF]/5 px-3 py-1 rounded-lg mt-3 tracking-widest select-none uppercase">
                  CÓDIGO: 4002
                </div>
              </div>

              {/* Smartphone Sem Bezel de Alta Fidelidade */}
              <div className="absolute bottom-6 right-6 z-20 w-[170px] bg-slate-950 border-[5px] border-zinc-800 rounded-[30px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] transform rotate-8 hover:rotate-3 transition-transform duration-500 overflow-hidden aspect-[9/16]">
                {/* Dynamic Island */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-3.5 bg-black rounded-full z-30 flex items-center justify-end px-1.5">
                  <div className="w-1 h-1 bg-[#001CFF]/40 rounded-full"></div>
                </div>

                {/* Camera Viewfinder (Scanning Effect) */}
                <div className="relative h-full bg-slate-950 flex flex-col justify-between p-2 pt-6">
                  {/* Blur Simulado atrás da câmera */}
                  <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950/85 z-0"></div>

                  {/* QR Code detectado no Viewfinder com Brackets */}
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none opacity-40">
                    <div className="relative p-3 border-2 border-[#001CFF]/50 rounded-xl">
                      <QrCode className="w-12 h-12 text-white" />
                      {/* Corner guides */}
                      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#001CFF]"></div>
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#001CFF]"></div>
                      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#001CFF]"></div>
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#001CFF]"></div>
                    </div>
                  </div>

                  {/* Linha de Scanner Laser Animada */}
                  <div className="absolute inset-x-0 top-1/3 h-[2px] bg-gradient-to-r from-transparent via-[#001CFF] to-transparent shadow-[0_0_8px_#001CFF] z-10 animate-pulse"></div>

                  {/* Glassmorphic iOS Notification Banner */}
                  <div className="relative z-20 w-full bg-white/90 backdrop-blur-md border border-white/20 rounded-xl p-2 shadow-lg flex items-center justify-between transition-all">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-[#001CFF]/10 flex items-center justify-center text-[#001CFF]">
                        <QrCode className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[7.5px] font-black text-slate-900 leading-none">Abrir zelify.app</p>
                        <p className="text-[6.5px] text-[#001CFF] font-bold leading-none mt-1 truncate">/residenciaharmony</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-[#001CFF] shrink-0" />
                  </div>

                  {/* iOS Shutter Button (Representativo) */}
                  <div className="relative z-20 pb-1 flex justify-center w-full">
                    <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center p-0.5">
                      <div className="w-full h-full bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. B. SEÇÃO DE DEMONSTRAÇÃO DO PRODUTO (MOCKUPS INTERATIVOS) */}
      <section className="py-20 md:py-28 bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Header da Seção */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16 md:mb-20">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#001CFF] uppercase tracking-widest bg-[#001CFF]/10 border border-[#001CFF]/15 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Experiência Integrada
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Sincronia perfeita entre quem mora e quem resolve.
            </h2>
            <p className="text-slate-550 text-xs sm:text-sm font-semibold max-w-xl mx-auto leading-relaxed">
              De um lado, a simplicidade de um QR Code sem fricção para o morador. Do outro, um painel administrativo robusto e centralizado para o gestor.
            </p>
          </div>

          {/* Grid Principal dos Mockups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
            
            {/* CARD 1: PAINEL DO GESTOR (DESKTOP WEB VIEW) */}
            <div className="bg-slate-100/50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between min-h-[660px] shadow-sm hover:shadow-md transition-all">
              {/* Header Info */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#001CFF] animate-pulse"></span>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#001CFF]">Painel Administrativo</span>
                  </div>
                  
                  {/* Seletor Interativo de Tema */}
                  <div className="bg-slate-200/60 p-0.5 rounded-lg border border-slate-250/50 flex items-center space-x-0.5 z-10">
                    <button 
                      onClick={() => setMockupTheme('dark')}
                      className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${mockupTheme === 'dark' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Dark
                    </button>
                    <button 
                      onClick={() => setMockupTheme('light')}
                      className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${mockupTheme === 'light' ? 'bg-white text-slate-950 shadow-sm border border-slate-200/80' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Light
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight text-left">1. O Painel do Gestor (Desktop Web)</h3>
                  <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed text-left">
                    Mural Kanban inteligente, controle de ocorrências ativas, relatórios e métricas de desempenho em tempo real.
                  </p>
                </div>
              </div>

              {/* Monitor/Navegador Mockup (Com Sidebar Realista) */}
              <div className={`flex-1 w-full border rounded-2xl shadow-xl overflow-hidden flex flex-col transition-all duration-300 ${
                mockupTheme === 'dark' 
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-300' 
                  : 'bg-white border-slate-200 text-slate-700'
              }`}>
                {/* Top Browser Bar */}
                <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${mockupTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-850' : 'bg-slate-55 border-slate-200/80'}`}>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  </div>
                  <div className={`px-6 py-1 rounded-md text-[9px] font-mono select-none tracking-tight flex items-center justify-center space-x-1 w-64 max-w-full ${mockupTheme === 'dark' ? 'bg-zinc-950 text-zinc-600 border border-zinc-900' : 'bg-white text-slate-400 border border-slate-200'}`}>
                    <span className="text-[#001CFF] font-bold">https://</span>
                    <span>app.zelify.com.br/dashboard</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-200/40 flex items-center justify-center text-[9px] font-bold text-slate-500">
                    H
                  </div>
                </div>

                {/* Dashboard Inner App Shell */}
                <div className="flex-1 flex overflow-hidden min-h-[360px]">
                  
                  {/* APP SIDEBAR */}
                  <div className={`w-16 border-r flex flex-col items-center py-4 justify-between shrink-0 ${
                    mockupTheme === 'dark' ? 'bg-zinc-900/30 border-zinc-850' : 'bg-slate-55/40 border-slate-150'
                  }`}>
                    <div className="space-y-6 w-full flex flex-col items-center">
                      {/* Mini Logo */}
                      <div className="w-7 h-7 rounded-lg bg-[#001CFF] flex items-center justify-center text-white text-xs font-black shadow-md shadow-[#001CFF]/20">
                        Z
                      </div>
                      
                      {/* Navigation Icons */}
                      <div className="space-y-3.5 w-full px-2">
                        <div className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                          mockupTheme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-[#001CFF]/10 text-[#001CFF]'
                        }`}>
                          <Building2 className="w-4 h-4" />
                          <span className="text-[6px] font-extrabold mt-0.5 uppercase tracking-wide">Painel</span>
                        </div>
                        <div className="w-full aspect-square rounded-lg flex flex-col items-center justify-center text-slate-400 hover:text-slate-655 dark:hover:text-zinc-200 cursor-pointer">
                          <Wrench className="w-4 h-4" />
                          <span className="text-[6px] font-extrabold mt-0.5 uppercase tracking-wide">Serviço</span>
                        </div>
                        <div className="w-full aspect-square rounded-lg flex flex-col items-center justify-center text-slate-400 hover:text-slate-655 dark:hover:text-zinc-200 cursor-pointer">
                          <Package className="w-4 h-4" />
                          <span className="text-[6px] font-extrabold mt-0.5 uppercase tracking-wide">Achados</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom User Avatar */}
                    <div className="w-7 h-7 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-500">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* MAIN PANEL CONTENT */}
                  <div className="flex-1 p-5 space-y-4 overflow-hidden flex flex-col text-left">
                    {/* Top Operational Status */}
                    <div className="flex justify-between items-center shrink-0">
                      <div>
                        <h4 className={`text-[8px] font-black uppercase tracking-widest ${mockupTheme === 'dark' ? 'text-zinc-400' : 'text-slate-400'}`}>Mural Operacional</h4>
                        <p className={`text-xs font-black tracking-tight ${mockupTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>RESIDENCIAL HARMONY</p>
                      </div>
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Estável
                      </span>
                    </div>

                    {/* Top Stats Bar */}
                    <div className="grid grid-cols-3 gap-3 shrink-0">
                      <div className={`p-3 rounded-xl border flex flex-col justify-between shadow-sm transition-all ${mockupTheme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200/60'}`}>
                        <div className="flex justify-between items-center text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                          <span>Pendentes</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        </div>
                        <span className={`text-lg font-black tracking-tight mt-1 ${mockupTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>3</span>
                      </div>
                      <div className={`p-3 rounded-xl border flex flex-col justify-between shadow-sm transition-all ${mockupTheme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200/60'}`}>
                        <div className="flex justify-between items-center text-[7px] font-bold text-[#001CFF] uppercase tracking-widest">
                          <span>Em Ação</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#001CFF]"></span>
                        </div>
                        <span className={`text-lg font-black tracking-tight mt-1 ${mockupTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>2</span>
                      </div>
                      <div className={`p-3 rounded-xl border flex flex-col justify-between shadow-sm transition-all ${mockupTheme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200/60'}`}>
                        <div className="flex justify-between items-center text-[7px] font-bold text-emerald-500 uppercase tracking-widest">
                          <span>Concluídos</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        </div>
                        <span className={`text-lg font-black tracking-tight mt-1 ${mockupTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>15</span>
                      </div>
                    </div>

                    {/* Kanban Columns */}
                    <div className="flex-1 grid grid-cols-3 gap-3 overflow-hidden min-h-0 pt-1">
                      
                      {/* Col 1: Aguardando */}
                      <div className="flex flex-col space-y-2 overflow-hidden">
                        <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400 px-1">
                          <span>Aguardando</span>
                          <span className={`px-1.5 py-0.5 rounded text-[7px] font-extrabold ${mockupTheme === 'dark' ? 'bg-zinc-900' : 'bg-slate-200'}`}>2</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                          {/* Ticket 1 */}
                          <div className={`p-2.5 rounded-xl border space-y-2 transition-all hover:scale-[1.02] ${
                            mockupTheme === 'dark' ? 'bg-zinc-900/80 border-zinc-800 shadow-md' : 'bg-white border-slate-200 shadow-sm'
                          }`}>
                            <div className="flex justify-between items-center text-[6px]">
                              <span className="font-extrabold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded">Manutenção</span>
                              <span className="text-slate-400 font-bold uppercase">Garagem • 10m</span>
                            </div>
                            <p className={`text-[9px] font-black leading-snug tracking-tight ${mockupTheme === 'dark' ? 'text-zinc-200' : 'text-slate-900'}`}>Infiltração parede vaga 102</p>
                            <p className="text-[7.5px] text-slate-400 font-semibold leading-none">Apto 102 Bloco A</p>
                          </div>

                          {/* Ticket 2 */}
                          <div className={`p-2.5 rounded-xl border space-y-2 transition-all hover:scale-[1.02] ${
                            mockupTheme === 'dark' ? 'bg-zinc-900/80 border-zinc-800 shadow-md' : 'bg-white border-slate-200 shadow-sm'
                          }`}>
                            <div className="flex justify-between items-center text-[6px]">
                              <span className="font-extrabold uppercase bg-purple-500/10 text-purple-500 border border-purple-500/20 px-1.5 py-0.5 rounded">Zeladoria</span>
                              <span className="text-slate-400 font-bold uppercase">Portaria • 1h</span>
                            </div>
                            <p className={`text-[9px] font-black leading-snug tracking-tight ${mockupTheme === 'dark' ? 'text-zinc-200' : 'text-slate-900'}`}>Portão pedestre batendo forte</p>
                            <p className="text-[7.5px] text-slate-400 font-semibold leading-none">Portaria principal</p>
                          </div>
                        </div>
                      </div>

                      {/* Col 2: Em Ação */}
                      <div className="flex flex-col space-y-2 overflow-hidden">
                        <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400 px-1">
                          <span>Em Ação</span>
                          <span className={`px-1.5 py-0.5 rounded text-[7px] font-extrabold ${mockupTheme === 'dark' ? 'bg-zinc-900' : 'bg-slate-200'}`}>1</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                          {/* Ticket 3 */}
                          <div className={`p-2.5 rounded-xl border space-y-2 transition-all hover:scale-[1.02] ${
                            mockupTheme === 'dark' ? 'bg-[#001CFF]/5 border-[#001CFF]/20 shadow-md' : 'bg-white border-slate-200 shadow-sm'
                          }`}>
                            <div className="flex justify-between items-center text-[6px]">
                              <span className="font-extrabold uppercase bg-[#001CFF]/15 text-[#001CFF] border border-[#001CFF]/25 px-1.5 py-0.5 rounded">Elétrica</span>
                              <span className="text-slate-400 font-bold uppercase">Hall • 2h</span>
                            </div>
                            <p className={`text-[9px] font-black leading-snug tracking-tight ${mockupTheme === 'dark' ? 'text-zinc-200' : 'text-slate-900'}`}>Lâmpada piscando elevador 1</p>
                            <p className="text-[7.5px] text-slate-400 font-semibold leading-none">Zelador Marcos associado</p>
                          </div>
                        </div>
                      </div>

                      {/* Col 3: Resolvidos */}
                      <div className="flex flex-col space-y-2 overflow-hidden">
                        <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400 px-1">
                          <span>Concluídos</span>
                          <span className={`px-1.5 py-0.5 rounded text-[7px] font-extrabold ${mockupTheme === 'dark' ? 'bg-zinc-900' : 'bg-slate-200'}`}>15</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                          {/* Ticket 4 */}
                          <div className={`p-2.5 rounded-xl border space-y-2 opacity-70 transition-all hover:scale-[1.02] ${
                            mockupTheme === 'dark' ? 'bg-zinc-900/40 border-zinc-850' : 'bg-slate-50/50 border-slate-200/40'
                          }`}>
                            <div className="flex justify-between items-center text-[6px]">
                              <span className="font-extrabold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded">Resolvido</span>
                              <span className="text-slate-400 font-bold uppercase">Academia • 1d</span>
                            </div>
                            <p className={`text-[9px] font-black leading-snug tracking-tight line-through ${mockupTheme === 'dark' ? 'text-zinc-450' : 'text-slate-500'}`}>Ar condicionado desligando</p>
                            <p className="text-[7.5px] text-slate-400 font-semibold leading-none">Finalizado pelo técnico Marcos</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* CARD 2: PORTAL DO MORADOR (MOBILE SMARTPHONE VIEW) */}
            <div className="bg-slate-100/50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between min-h-[660px] shadow-sm hover:shadow-md transition-all text-center">
              {/* Header Info */}
              <div className="space-y-4 text-left mb-6">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-600">Interface do Morador</span>
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">2. O Portal do Morador (Smartphone Mobile)</h3>
                  <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed">
                    Sem downloads, logins ou senhas. O morador aponta a câmera, relata o problema em 20 segundos e anexa uma foto.
                  </p>
                </div>
              </div>

              {/* iPhone Mockup Frame (Perfeitamente Centralizado e Dimensionado) */}
              <div className="flex-1 flex items-center justify-center w-full">
                <div className="relative w-[260px] h-[450px] bg-slate-950 border-[8px] border-slate-900 rounded-[48px] shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-900/5">
                  
                  {/* Dynamic Island Notch */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4.5 bg-black rounded-full z-30 flex items-center justify-end px-2 space-x-1">
                    <div className="w-1.5 h-1.5 bg-indigo-950/40 rounded-full border border-indigo-900/20"></div>
                    <div className="w-1 h-1 bg-[#001CFF]/45 rounded-full"></div>
                  </div>

                  {/* App Screen Inside Phone */}
                  <div className="h-full bg-slate-50 text-slate-900 flex flex-col pt-7 pb-2 relative">
                    
                    {/* Status Bar */}
                    <div className="px-5 py-0.5 flex justify-between items-center text-[7px] font-extrabold text-slate-500 z-20 shrink-0 select-none">
                      <span>9:41</span>
                      <div className="flex items-center space-x-1">
                        <span>📶</span>
                        <span className="text-[8px] font-normal">LTE</span>
                        <span>🔋</span>
                      </div>
                    </div>

                    {/* App Header */}
                    <div className="px-4 py-2 border-b border-slate-200/60 bg-white flex items-center justify-between z-10 shrink-0 text-left">
                      <div>
                        <p className="text-[5.5px] font-bold text-slate-400 uppercase tracking-widest leading-none">Relatar para</p>
                        <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-tight mt-0.5 leading-none">Residencial Harmony</h4>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-[#001CFF]/5 border border-[#001CFF]/10 flex items-center justify-center text-[9px] font-bold text-[#001CFF]">
                        H
                      </div>
                    </div>

                    {/* App Body - Form */}
                    <div className="flex-1 p-3 space-y-2 bg-slate-50 overflow-y-auto text-left z-10 min-h-0">
                      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm space-y-3">
                        
                        {/* Title Form */}
                        <div className="text-[9px] font-black uppercase text-slate-900 tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3.5 h-3.5 text-[#001CFF]" />
                            Relatar Problema
                          </span>
                          <span className="text-[6.5px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">Passo 2 de 3</span>
                        </div>

                        {/* Input Local */}
                        <div className="space-y-1">
                          <label className="text-[7px] font-extrabold uppercase tracking-wider text-slate-400">Onde está o problema?</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              readOnly 
                              value="Elevador de Serviço - Hall 3"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[8px] font-semibold text-slate-900 focus:outline-none pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px]">📍</span>
                          </div>
                        </div>

                        {/* Input Descrição */}
                        <div className="space-y-1">
                          <label className="text-[7px] font-extrabold uppercase tracking-wider text-slate-400">Descreva o que ocorreu</label>
                          <textarea 
                            readOnly 
                            value="O botão do 5º andar está afundado e não responde quando apertado."
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[8px] font-semibold text-slate-800 h-12 focus:outline-none resize-none leading-relaxed"
                          />
                        </div>

                        {/* Foto Carregada */}
                        <div className="space-y-1">
                          <label className="text-[7px] font-extrabold uppercase tracking-wider text-slate-400">Foto do Problema</label>
                          <div className="border border-dashed border-[#001CFF]/30 bg-[#001CFF]/5 p-2 rounded-lg flex items-center justify-between text-[7px] shadow-inner">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[9px]">📷</span>
                              <span className="font-bold text-slate-700 truncate max-w-[120px]">botoeira_quebrada.jpg</span>
                              <span className="text-[5.5px] text-slate-400 font-semibold">(1.2 MB)</span>
                            </div>
                            <span className="text-[6.5px] text-emerald-500 font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.5 rounded tracking-widest">Carregado</span>
                          </div>
                        </div>

                        {/* CTA Enviar */}
                        <button className="w-full bg-[#001CFF] hover:bg-[#0014CC] text-white py-2 rounded-xl text-[8.5px] font-bold uppercase tracking-wider shadow-lg shadow-[#001CFF]/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-1">
                          <span>Enviar Relato em 20s</span>
                          <span>⚡</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom Tabs */}
                    <div className="bg-white border-t border-slate-200/80 px-4 py-1.5 flex justify-around items-center z-10 shrink-0 text-[6.5px] shadow-sm">
                      <span className="font-black text-[#001CFF] flex flex-col items-center cursor-pointer">
                        <Wrench className="w-4 h-4" />
                        <span className="mt-0.5">Manutenção</span>
                      </span>
                      <span className="font-extrabold text-slate-400 flex flex-col items-center cursor-pointer">
                        <Package className="w-4 h-4" />
                        <span className="mt-0.5">Achados</span>
                      </span>
                      <span className="font-extrabold text-slate-400 flex flex-col items-center cursor-pointer">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="mt-0.5">Resolvidos</span>
                      </span>
                    </div>
                    
                    {/* iPhone Indicator Bar */}
                    <div className="w-20 h-1 bg-slate-350 rounded-full mx-auto mt-1 shrink-0 z-10"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. C. DOBRA DE SEGMENTAÇÃO (OS DOIS PÚBLICOS) */}
      <section className="py-24 md:py-36 border-b border-slate-200/60 bg-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-[10px] font-bold text-[#001CFF] uppercase tracking-widest bg-[#001CFF]/10 border border-[#001CFF]/15 px-3 py-1 rounded-full">Segmentação Inteligente</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Solução sob medida para condomínios individuais ou grandes carteiras.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Card Síndicos Profissionais (Fundo Claro) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-6">
                {/* Visual Placeholder (Síndico trabalhando - Foto Real Unsplash) */}
                <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden relative group border border-slate-200">
                  <img 
                    src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80" 
                    alt="Síndico gerenciando chamados" 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-transparent"></div>
                  
                  {/* Glassmorphic Overlay Card */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#001CFF] flex items-center justify-center text-white text-xs font-black shrink-0">
                        CS
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[10px] font-black text-slate-900 leading-none">Carlos Santos</p>
                        <p className="text-[8px] text-slate-500 font-semibold mt-1">Síndico Profissional • Residencial Harmony</p>
                      </div>
                    </div>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Kanban Ativo
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[9px] font-extrabold text-[#001CFF] uppercase tracking-widest">Para Síndicos</span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">Síndicos Profissionais & Orgânicos</h3>
                  <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed">
                    Centralize toda a demanda de manutenção no Mural Kanban. Garanta transparência automática sobre a resolução das ocorrências e proteja o seu número pessoal de WhatsApp contra enxurradas de mensagens.
                  </p>
                </div>
              </div>

              <div className="pt-8">
                <a 
                  href="https://app.zelify.com.br/signup"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 bg-[#001CFF] hover:bg-[#0014CC] text-white text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-[#001CFF]/15 transition-all active:scale-[0.98]"
                >
                  <span>Testar no meu condomínio</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Card Administradoras (Fundo Escuro) */}
            <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-6">
                {/* Visual Placeholder (Administradoras - Foto Real Unsplash) */}
                <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden relative group border border-slate-800">
                  <img 
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80" 
                    alt="Equipe de administradora em reunião" 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent"></div>
                  
                  {/* Glassmorphic Overlay Card */}
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded bg-[#001CFF]/20 flex items-center justify-center text-[#001CFF] shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[10px] font-black text-white leading-none">Lello Administradora</p>
                        <p className="text-[8px] text-slate-400 font-semibold mt-1">Gestão de Carteira • 12 Condomínios</p>
                      </div>
                    </div>
                    <span className="text-[8px] bg-[#001CFF]/25 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Corporate
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[9px] font-extrabold text-[#001CFF] uppercase tracking-widest">Para Administradoras</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">Administradoras de Condomínios</h3>
                  <p className="text-slate-400 text-xs sm:text-sm font-semibold leading-relaxed">
                    Reduza em até 40% a carga de atendimento telefônico da sua equipe. Agregue valor ao seu condomínio contratando uma plataforma moderna e garanta retenção máxima de sua carteira corporativa.
                  </p>
                </div>
              </div>

              <div className="pt-8">
                <button 
                  onClick={() => setB2bModalOpen(true)}
                  className="inline-flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                >
                  <span>Falar com Consultor B2B</span>
                  <ArrowRight className="w-4 h-4 text-slate-900" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. D. LINHA DO TEMPO: O ECOSSISTEMA NO MUNDO FÍSICO */}
      <section className="py-24 md:py-36 border-b border-slate-200/60 bg-white">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-[10px] font-bold text-[#001CFF] uppercase tracking-widest bg-[#001CFF]/10 border border-[#001CFF]/15 px-3 py-1 rounded-full">Como Funciona</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              O ecossistema que conecta o mundo físico à gestão digital.
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold max-w-xl mx-auto">
              Três passos simples que eliminam intermediários e resolvem problemas de zeladoria de forma rápida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Linha guia de conexão no desktop */}
            <div className="hidden md:block absolute top-14 left-1/4 right-1/4 h-[1px] bg-slate-200 z-0"></div>

            {/* Passo 1 */}
            <div className="relative z-10 flex flex-col items-center text-center space-y-6 group">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-xl font-black text-[#001CFF] shadow-sm group-hover:border-[#001CFF] transition-colors">
                01
              </div>
              <div className="w-full aspect-video rounded-xl bg-slate-50 border border-slate-150 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-20 bg-white p-2.5 rounded-lg border border-slate-250 shadow-md flex flex-col items-center">
                  <QrCode className="w-10 h-10 text-slate-950" />
                  <span className="text-[5px] font-mono tracking-widest text-[#001CFF] font-bold mt-1">ZELIFY STICKER</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black uppercase text-slate-900 tracking-wider">1. O QR Code é fixado</h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed px-4">
                  Adesivos do Zelify contendo link exclusivo e código de acesso são fixados em áreas de circulação como elevador e portaria.
                </p>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="relative z-10 flex flex-col items-center text-center space-y-6 group">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-xl font-black text-[#001CFF] shadow-sm group-hover:border-[#001CFF] transition-colors">
                02
              </div>
              <div className="w-full aspect-video rounded-xl bg-slate-50 border border-slate-150 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-12 aspect-[9/16] bg-slate-900 border border-slate-800 rounded-lg p-1 shadow-md flex flex-col justify-between">
                  <div className="w-full h-1 bg-white/20 rounded"></div>
                  <div className="w-full h-4 bg-[#001CFF] rounded flex items-center justify-center">
                    <span className="text-[4px] text-white font-extrabold uppercase tracking-widest scale-75">ENVIAR</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black uppercase text-slate-900 tracking-wider">2. O Morador Notifica</h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed px-4">
                  Sem criar senhas, o morador aponta a câmera para o QR Code, preenche o local, anexa a foto do problema e envia em 20 segundos.
                </p>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="relative z-10 flex flex-col items-center text-center space-y-6 group">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-xl font-black text-[#001CFF] shadow-sm group-hover:border-[#001CFF] transition-colors">
                03
              </div>
              <div className="w-full aspect-video rounded-xl bg-slate-50 border border-slate-150 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-24 bg-white border border-slate-200 p-2 rounded-lg shadow-sm space-y-1.5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                    <span className="text-[5px] font-bold text-slate-400 uppercase">Kanban</span>
                    <span className="w-1 h-1 rounded-full bg-[#001CFF]"></span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded border border-slate-150"></div>
                  <div className="w-full h-2.5 bg-slate-100 rounded border border-slate-150"></div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black uppercase text-slate-900 tracking-wider">3. O Gestor Resolve</h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed px-4">
                  O chamado cai em tempo real como um cartão no painel operacional do síndico, pronto para ser encaminhado à equipe de manutenção.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. E. TABELA DE PREÇOS (PRICING DE 3 COLUNAS) */}
      <section className="py-24 md:py-36 border-b border-slate-200/60 bg-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-[10px] font-bold text-[#001CFF] uppercase tracking-widest bg-[#001CFF]/10 border border-[#001CFF]/15 px-3 py-1 rounded-full">Planos e Preços</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Um modelo de faturamento transparente, sem pegadinhas.
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold max-w-xl mx-auto">
              Encontre o plano ideal para a sua realidade operacional. Comece gratuitamente para validar a usabilidade do sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            
            {/* PLANO STARTER (GRÁTIS) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all duration-300 relative">
              <div className="space-y-6">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Para Começar</span>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-wider">Plano Starter</h3>
                </div>
                
                <div className="flex items-baseline">
                  <span className="text-3xl font-black text-slate-900 font-mono">R$ 0</span>
                  <span className="text-slate-500 text-xs font-semibold ml-1">/mês</span>
                </div>

                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  Perfeito para condomínios pequenos ou para avaliar a adesão dos moradores na prática.
                </p>

                <hr className="border-slate-150" />

                <ul className="space-y-3 text-xs font-semibold text-slate-650">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-[#001CFF] mr-2 shrink-0" />
                    1 Condomínio Ativo
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-[#001CFF] mr-2 shrink-0" />
                    Limite de 15 Chamados/Mês
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-[#001CFF] mr-2 shrink-0" />
                    Acesso Completo via QR Code
                  </li>
                  <li className="flex items-center text-slate-400">
                    ✕ Mural Kanban de Manutenção
                  </li>
                  <li className="flex items-center text-slate-400">
                    ✕ Suporte a Multi-Condomínios
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <a 
                  href="https://app.zelify.com.br/signup"
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center border border-slate-900 hover:bg-slate-950 hover:text-white text-slate-900 text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all cursor-pointer"
                >
                  Começar Teste Gratuito
                </a>
              </div>
            </div>

            {/* PLANO PRO (MAIS RECOMENDADO) */}
            <div className="bg-white border-2 border-[#001CFF] rounded-3xl p-8 flex flex-col justify-between shadow-md hover:shadow-xl transition-all duration-300 relative">
              <div className="absolute top-4 right-4 bg-[#001CFF]/10 text-[#001CFF] border border-[#001CFF]/20 px-3 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider">
                Mais Recomendado
              </div>
              
              <div className="space-y-6">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#001CFF] uppercase tracking-widest">Controle Completo</span>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center">
                    Zelify Pro
                    <Sparkles className="w-4 h-4 text-[#001CFF] ml-1.5" />
                  </h3>
                </div>
                
                <div className="flex items-baseline">
                  <span className="text-3xl font-black text-slate-900 font-mono">R$ 149</span>
                  <span className="text-slate-500 text-xs font-semibold ml-1">/mês por prédio</span>
                </div>

                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  Tudo o que um síndico precisa para centralizar a operação do condomínio de ponta a ponta.
                </p>

                <hr className="border-slate-150" />

                <ul className="space-y-3 text-xs font-semibold text-slate-650">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Chamados Ilimitados
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Mural Kanban Completo
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Mural de Achados e Perdidos
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Relatórios Gerenciais Mensais
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    Suporte Prioritário do Time
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <a 
                  href="https://app.zelify.com.br/signup"
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center bg-[#001CFF] hover:bg-[#0014CC] text-white text-xs font-extrabold uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg shadow-[#001CFF]/15 cursor-pointer"
                >
                  Assinar Plano Pro
                </a>
              </div>
            </div>

            {/* PLANO CORPORATIVO (ADMINISTRADORAS) */}
            <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all duration-300 relative">
              <div className="space-y-6">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Múltiplos Prédios</span>
                  <h3 className="text-xl font-black uppercase tracking-wider text-white">Plano Lote</h3>
                </div>
                
                <div className="flex flex-col space-y-1">
                  <div className="flex items-baseline">
                    <span className="text-xs font-semibold text-slate-400">Escala de:</span>
                    <span className="text-2xl font-black font-mono text-white ml-1.5">R$ 59 a R$ 39</span>
                    <span className="text-slate-400 text-xs font-semibold ml-1">/mês</span>
                  </div>
                  <span className="text-[9px] text-[#001CFF] font-bold uppercase tracking-wider">Custo progressivo por volume</span>
                </div>

                <p className="text-slate-450 text-xs font-medium leading-relaxed">
                  Infraestrutura corporativa desenvolvida especificamente para administradoras de condomínios.
                </p>

                <hr className="border-slate-800" />

                <ul className="space-y-3 text-xs font-semibold text-slate-350">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-[#001CFF] mr-2 shrink-0" />
                    Painel Consolidado de Carteira
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-[#001CFF] mr-2 shrink-0" />
                    Relatórios Consolidados de Lote
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-[#001CFF] mr-2 shrink-0" />
                    Faturamento Único Mensal
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-[#001CFF] mr-2 shrink-0" />
                    Customização de Logotipo e Marca
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-[#001CFF] mr-2 shrink-0" />
                    Gestor de Conta Dedicado
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <button 
                  onClick={() => setB2bModalOpen(true)}
                  className="block w-full text-center bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all cursor-pointer"
                >
                  Contatar Vendas B2B
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. F. PERGUNTAS FREQUENTES (FAQ ACCORDION) */}
      <section className="py-24 md:py-36 bg-white border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-4">
            <span className="text-[10px] font-bold text-[#001CFF] uppercase tracking-widest bg-[#001CFF]/10 border border-[#001CFF]/15 px-3 py-1 rounded-full">Dúvidas Frequentes</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Perguntas Frequentes</h2>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold">Tudo o que você precisa saber sobre o Zelify para começar a usar.</p>
          </div>

          <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
            {faqItems.map((item, idx) => {
              const isOpen = !!faqOpen[idx];
              return (
                <div key={idx} className="py-5">
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between text-left group cursor-pointer focus:outline-none"
                  >
                    <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-900 group-hover:text-[#001CFF] transition-colors leading-relaxed">
                      {item.q}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-[#001CFF] transition-all shrink-0 ml-4 ${isOpen ? 'transform rotate-180 text-[#001CFF]' : ''}`} />
                  </button>
                  
                  {/* Expandable answer */}
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-56 opacity-100 mt-3.5' : 'max-h-0 opacity-0'}`}>
                    <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed pl-1">
                      {item.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 items-start">
          
          {/* Col 1 */}
          <div className="md:col-span-6 space-y-4">
            <span className="text-2xl font-black tracking-tight">Zelify<span className="text-[#001CFF]">.</span></span>
            <p className="text-slate-450 text-xs max-w-sm font-semibold leading-relaxed">
              Simplificando a comunicação entre moradores e a zeladoria condominial com o uso inteligente de QR Codes. Sem aplicativo, sem burocracia.
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pt-4">
              © {new Date().getFullYear()} Zelify. Todos os direitos reservados.
            </p>
          </div>

          {/* Col 2 */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Links do Produto</h4>
            <ul className="space-y-2.5 text-xs text-slate-450 font-semibold">
              <li>
                <a href="https://app.zelify.com.br/login" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Entrar no Painel</a>
              </li>
              <li>
                <a href="https://app.zelify.com.br/signup" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Criar Novo Condomínio</a>
              </li>
              <li>
                <a href="#planos" className="hover:text-white transition-colors">Planos e Preços</a>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Corporativo</h4>
            <ul className="space-y-2.5 text-xs text-slate-450 font-semibold">
              <li>
                <button onClick={() => setB2bModalOpen(true)} className="hover:text-white transition-colors text-left">Falar com Vendas B2B</button>
              </li>
              <li>
                <span className="text-slate-500 font-bold font-mono">contato@zelify.com.br</span>
              </li>
            </ul>
          </div>

        </div>
      </footer>

      {/* 4. MODAL DE SOLICITAÇÃO B2B */}
      {b2bModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-scale-in">
            {/* Top Indicator */}
            <div className="h-1.5 bg-[#001CFF]"></div>

            {/* Close Button */}
            <button 
              onClick={() => setB2bModalOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center font-bold text-xs cursor-pointer"
            >
              ✕
            </button>

            {/* Modal Body */}
            <div className="p-8">
              <div className="space-y-2 mb-6">
                <span className="text-[9px] font-extrabold text-[#001CFF] uppercase tracking-widest">Atendimento Comercial</span>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Falar com Consultor B2B</h3>
                <p className="text-xs text-slate-500 font-semibold">Preencha o formulário abaixo e retornaremos com nossa proposta comercial personalizada.</p>
              </div>

              {b2bSubmitted ? (
                <div className="py-10 text-center space-y-4 animate-in fade-in duration-300">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Solicitação Enviada!</h4>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">Entraremos em contato no e-mail informado nas próximas horas.</p>
                </div>
              ) : (
                <form onSubmit={handleB2bSubmit} className="space-y-4">
                  {/* Nome */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-550 flex items-center">
                      <User className="w-3.5 h-3.5 text-[#001CFF] mr-1.5" />
                      Nome Completo
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Roberto Silva"
                      value={b2bName}
                      onChange={(e) => setB2bName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#001CFF] font-semibold"
                    />
                  </div>

                  {/* E-mail */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-550 flex items-center">
                      <Mail className="w-3.5 h-3.5 text-[#001CFF] mr-1.5" />
                      E-mail Corporativo
                    </label>
                    <input 
                      type="email" 
                      required
                      placeholder="Ex: roberto@empresa.com.br"
                      value={b2bEmail}
                      onChange={(e) => setB2bEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#001CFF] font-semibold"
                    />
                  </div>

                  {/* Nome da Administradora */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-550 flex items-center">
                      <Building2 className="w-3.5 h-3.5 text-[#001CFF] mr-1.5" />
                      Nome da Administradora
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Administradora Viver Mais"
                      value={b2bCompany}
                      onChange={(e) => setB2bCompany(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#001CFF] font-semibold"
                    />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-550 flex items-center">
                      <MessageSquare className="w-3.5 h-3.5 text-[#001CFF] mr-1.5" />
                      WhatsApp / Celular
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: (11) 99999-9999"
                      value={b2bPhone}
                      onChange={(e) => setB2bPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#001CFF] font-semibold"
                    />
                  </div>

                  {/* Submit button */}
                  <button 
                    type="submit"
                    className="w-full bg-[#001CFF] hover:bg-[#0014CC] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#001CFF]/15 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Solicitar Contato Comercial</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
