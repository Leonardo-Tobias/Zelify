'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
  LayoutDashboard, 
  Kanban, 
  ClipboardList,
  Package, 
  Settings, 
  LogOut, 
  Loader2, 
  User, 
  ExternalLink,
  ShieldAlert,
  Menu,
  X,
  Sun,
  Moon,
  Building2,
  ArrowLeft,
  Lock,
  Sparkles
} from 'lucide-react';
import { db, Condominio, UsuarioGestor, isSupabaseConfigured } from '@/lib/db';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  const isPortfolioView = view === 'portfolio';

  const [loading, setLoading] = useState(true);
  const [gestor, setGestor] = useState<UsuarioGestor | null>(null);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [isCorporate, setIsCorporate] = useState(false);
  const [condoDropdownOpen, setCondoDropdownOpen] = useState(false);

  const handleSwitchCondo = (target: Condominio) => {
    setCondoDropdownOpen(false);
    localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(target));
    setCondominio(target);
    window.dispatchEvent(new Event('storage'));
    router.push('/dashboard');
  };

  // Inicializar sessão e tema
  useEffect(() => {
    // Carregar tema salvo
    const savedTheme = (localStorage.getItem('zelcore_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Verificar sessão do gestor (async encapsulado)
    async function initSession() {
      const savedGestor = localStorage.getItem('zelcore_gestor');
      const savedCondo = localStorage.getItem('zelcore_condominio_gestao');

      if (!savedGestor || !savedCondo) {
        router.push('/login');
        return;
      }

      try {
        const gestorData = JSON.parse(savedGestor);
        const condoData = JSON.parse(savedCondo);

        // #6 — Validar schema: garantir que os campos obrigatórios existem
        // Impede que alguém manipule o localStorage via DevTools para elevar privilégios
        if (
          !gestorData?.id ||
          !gestorData?.user_id ||
          !gestorData?.condominio_id ||
          !gestorData?.papel ||
          !['sindico', 'zelador', 'admin'].includes(gestorData.papel)
        ) {
          throw new Error('Dados de sessão do gestor inválidos ou adulterados.');
        }
        if (!condoData?.id || !condoData?.slug || !condoData?.nome) {
          throw new Error('Dados de sessão do condomínio inválidos.');
        }

        // #7 — Verificar sessão real no Supabase (apenas quando conectado ao backend)
        // Garante que o JWT não expirou e a conta ainda existe
        if (isSupabaseConfigured) {
          const currentUser = await db.getCurrentUser();
          if (!currentUser || currentUser.id !== gestorData.user_id) {
            throw new Error('Sessão Supabase expirada ou inválida.');
          }
        }

        setGestor(gestorData);
        setCondominio(condoData);
      } catch (e) {
        localStorage.removeItem('zelcore_gestor');
        localStorage.removeItem('zelcore_condominio_gestao');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [router]);

  // Alternar Modo Claro / Modo Escuro
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('zelcore_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Carregar todos os condomínios do gestor para suporte corporativo/multi-condomínio
  useEffect(() => {
    if (gestor) {
      db.getCondominiosByGestorUser(gestor.user_id)
        .then((list) => {
          // Remove apenas o container corporate (plan_type corporate sem parent), mantém tudo resto
          const containerId = list.find(c => c.plan_type === 'corporate' && !c.parent_condominio_id && !c.slug)?.id
          const instances = list.filter(c => c.id !== containerId)
          setCondominios(instances);

          // Auto-seleciona o primeiro condomínio se o atual não está na lista
          const currentIsValid = condominio && instances.some(c => c.id === condominio.id)
          if (instances.length > 0 && !currentIsValid) {
            const first = instances[0]
            setCondominio(first)
            localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(first))
          }

          const hasCorporate = list.some(c => c.plan_type === 'corporate');
          setIsCorporate(hasCorporate || list.length > 1);
        })
        .catch((err) => {
          console.error("Erro ao carregar condomínios da carteira:", err);
        });
    }
  }, [gestor, condominio]);

  // Listener para capturar atualizações de nome/slug nas configurações
  useEffect(() => {
    const handleStorageChange = () => {
      const savedCondo = localStorage.getItem('zelcore_condominio_gestao');
      if (savedCondo) {
        try {
          setCondominio(JSON.parse(savedCondo));
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Intervalo para atualizar em navegações internas de SPA
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    if (!condoDropdownOpen) return;
    const handleClick = () => setCondoDropdownOpen(false);
    document.addEventListener('click', handleClick, { once: true });
    return () => document.removeEventListener('click', handleClick);
  }, [condoDropdownOpen]);

  // Atualizar título do navegador dinamicamente
  useEffect(() => {
    if (pathname === '/dashboard/kanban') {
      document.title = "Kanban de Ocorrências | Zelcore";
    } else {
      document.title = "Zelcore | Gestão Operacional de Condomínios";
    }
  }, [pathname]);

  const handleLogout = () => {
    if (confirm('Deseja sair do painel administrativo?')) {
      localStorage.removeItem('zelcore_gestor');
      localStorage.removeItem('zelcore_condominio_gestao');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-zinc-950 text-zinc-400">
        <Loader2 className="h-8 w-8 text-brand animate-spin" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Verificando Credenciais...</p>
      </div>
    );
  }

  if (!gestor || !condominio) {
    return null;
  }

  const navigation = [
    { 
      name: 'Painel do Prédio', 
      href: '/dashboard', 
      icon: LayoutDashboard, 
      active: !isPortfolioView && pathname === '/dashboard', 
      disabled: isPortfolioView 
    },
    { 
      name: 'Mural de Ocorrências', 
      href: '/dashboard/kanban', 
      icon: ClipboardList, 
      active: !isPortfolioView && pathname === '/dashboard/kanban', 
      disabled: isPortfolioView 
    },
    { 
      name: 'Achados e Perdidos', 
      href: '/dashboard/achados-perdidos', 
      icon: Package, 
      active: !isPortfolioView && pathname === '/dashboard/achados-perdidos', 
      disabled: isPortfolioView 
    },
    { 
      name: 'Configurações', 
      href: '/dashboard/configuracoes', 
      icon: Settings, 
      active: !isPortfolioView && pathname === '/dashboard/configuracoes', 
      disabled: isPortfolioView 
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-700 dark:text-zinc-300 font-sans antialiased flex flex-col md:flex-row transition-colors duration-200">
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-200 dark:border-white/[0.06] px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">Zelcore<span className="text-brand">.</span></span>
          {isPortfolioView ? (
            <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-bold uppercase border border-brand/20">Carteira</span>
          ) : (
            <span className="text-[10px] bg-zinc-100 dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase border border-zinc-200 dark:border-white/[0.06]">{condominio.nome}</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleTheme}
            className="relative w-8 h-8 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] transition-all active:scale-[0.95] overflow-hidden"
            title="Alternar Tema"
          >
            <Sun className={`w-4 h-4 absolute transition-all duration-300 transform ${theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`} />
            <Moon className={`w-4 h-4 absolute transition-all duration-300 transform ${theme === 'light' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`} />
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE SLIDE-OUT MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[53px] bottom-0 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-lg z-30 flex flex-col justify-between p-4 border-t border-zinc-200 dark:border-white/[0.06] animate-in slide-in-from-top duration-200">
          <div className="space-y-4">
            {!isPortfolioView && (
              <div className="px-2.5 py-2 bg-zinc-50 dark:bg-white/[0.04] rounded-lg border border-zinc-200 dark:border-white/[0.06] flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-500">Página Pública</span>
                <a 
                  href={`/${condominio.slug}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-brand font-bold flex items-center space-x-0.5 hover:underline"
                >
                  <span>/{condominio.slug}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </div>
            )}

            {/* MOBILE CONDOMINIUM SELECTOR */}
            {condominios.length > 1 && (
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-3 pb-1 block">Condomínios</span>
                {condominios.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSwitchCondo(c);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors pl-8 ${
                      !isPortfolioView && c.id === condominio.id
                        ? 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-white font-bold border border-zinc-200 dark:border-white/[0.08]'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.03] font-medium'
                    }`}
                  >
                    <div className="w-5 h-5 rounded bg-brand/10 border border-brand/20 flex items-center justify-center text-brand text-[8px] font-extrabold shrink-0">
                      {c.nome.charAt(0)}
                    </div>
                    <span className="truncate">{c.nome}</span>
                  </button>
                ))}
                <div className="h-px bg-zinc-200 dark:bg-white/[0.06] mx-3"></div>
                <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      router.push('/dashboard/configuracoes?tab=faturamento&addCondo=true');
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-brand font-semibold hover:bg-zinc-50 dark:hover:bg-white/[0.03] rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Adicionar Condomínio</span>
                  </button>
              </div>
            )}

            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = item.active;
                return (
                  <button
                    key={item.name}
                    disabled={item.disabled}
                    onClick={() => {
                      router.push(item.href);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive 
                        ? 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-white font-bold border border-zinc-200 dark:border-white/[0.08]' 
                        : item.disabled
                          ? 'opacity-40 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                          : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.03] font-medium'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand' : 'text-zinc-500'}`} />
                    <span>{item.name}</span>
                    {item.disabled && (
                      <Lock className="w-3.5 h-3.5 text-zinc-450 ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* MOBILE BOTTOM SECTION */}
          <div className="space-y-4 pt-4 mt-auto">
            {/* UPGRADE CARD FOR FREE PLAN (MOBILE) */}
            {!isPortfolioView && condominio?.plan_type === 'free' && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-brand/15 via-brand/5 to-transparent border border-brand/20 relative overflow-hidden shadow-sm animate-in fade-in duration-300">
                <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-brand/10 blur-[20px] rounded-full pointer-events-none"></div>
                <div className="flex items-center space-x-2 text-[10px] font-bold text-brand uppercase tracking-wider mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand animate-pulse" />
                  <span>Plano Grátis</span>
                </div>
                <p className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">Limite de 15 Chamados/mês</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal font-medium">
                  Faça o upgrade e libere chamados ilimitados para seus moradores.
                </p>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push('/dashboard/configuracoes?tab=faturamento');
                  }}
                  className="w-full mt-3 py-1.5 bg-brand hover:bg-brand/90 text-white text-[10px] font-bold rounded-lg transition-all active:scale-[0.97] cursor-pointer text-center block shadow-[0_2px_8px_rgba(0,51,255,0.2)]"
                >
                  Fazer Upgrade
                </button>
              </div>
            )}

            <div className="border-t border-zinc-200 dark:border-white/[0.06] pt-4 space-y-3">
            <div className="flex items-center space-x-3 px-2">
              <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold">
                {gestor.nome.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{gestor.nome}</p>
                <p className="text-[10px] text-zinc-550 uppercase font-bold tracking-wider">{gestor.papel === 'sindico' ? 'Síndico' : 'Zelador'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full bg-red-950/20 hover:bg-red-950/40 text-red-400 text-xs font-semibold py-2 rounded-lg flex items-center justify-center space-x-2 border border-red-900/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-zinc-50 dark:bg-[#09090b] border-r border-zinc-200 dark:border-white/[0.06] p-4 shrink-0 transition-colors duration-200">
        <div className="space-y-6">
          {/* LOGO E SELETOR DE CONDOMÍNIO */}
          <div className="px-2">
            <div className="flex items-center space-x-1 mb-5">
              <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">Zelcore<span className="text-brand">.</span></span>
            </div>
            
            {/* DROPDOWN DE CONDOMÍNIOS */}
            <div className="px-0 relative">
              <button
                type="button"
                onClick={() => setCondoDropdownOpen(!condoDropdownOpen)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all shadow-sm border bg-zinc-100 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.06] hover:border-zinc-300 dark:hover:border-white/[0.12]"
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-extrabold shrink-0 border bg-brand/10 border-brand/20 text-brand">
                    {condominio.nome.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block truncate leading-none">
                      {condominio.nome}
                    </span>
                    {condominios.length > 0 && (
                      <span className="text-[9px] text-zinc-500 font-semibold block mt-0.5 truncate">
                        {condominios.length} {condominios.length === 1 ? 'condomínio' : 'condomínios'}
                      </span>
                    )}
                  </div>
                </div>
                <svg className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${condoDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {condoDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-30 py-1 animate-in fade-in slide-in-from-top-1 duration-150">

                  {/* Lista de condomínios */}
                  <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    {condominios.map((c) => {
                      const isActive = !isPortfolioView && c.id === condominio.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSwitchCondo(c)}
                          className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs transition-colors ${
                            isActive
                              ? 'bg-zinc-800/60 text-white font-bold'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 font-medium'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-extrabold shrink-0 border ${
                            isActive
                              ? 'bg-brand/20 border-brand/40 text-brand'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                          }`}>
                            {c.nome.charAt(0)}
                          </div>
                          <span className="truncate">{c.nome}</span>
                          {c.plan_type !== 'free' && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ml-auto shrink-0 ${
                              c.plan_type === 'corporate'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-brand/10 text-brand border border-brand/20'
                            }`}>
                              {c.plan_type === 'corporate' ? 'Corp' : 'Pro'}
                            </span>
                          )}
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-px bg-zinc-800/60 mx-3 my-1"></div>

                  {/* Adicionar condomínio */}
                  <button
                    onClick={() => {
                      setCondoDropdownOpen(false);
                      router.push('/dashboard/configuracoes?tab=faturamento&addCondo=true');
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2.5 text-xs text-brand hover:bg-zinc-800/60 font-semibold transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Adicionar Condomínio</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DENSE PUBLIC URL PREVIEW */}
          {!isPortfolioView && (
            <div className="px-2">
              <a 
                href={`/${condominio.slug}`} 
                target="_blank" 
                rel="noreferrer" 
                className="w-full flex flex-col p-2.5 bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] rounded-xl text-left hover:text-zinc-900 dark:hover:text-white transition-all group hover:border-zinc-300 dark:hover:border-white/[0.12] shadow-sm"
              >
                <div className="flex items-center space-x-2 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 group-hover:text-brand transition-colors w-full">
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-brand shrink-0 transition-colors" />
                  <span className="truncate">Link do Morador</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-550 group-hover:text-brand truncate max-w-full block mt-1 transition-colors pl-5.5">
                  zelify.vercel.app/{condominio.slug}
                </span>
              </a>
            </div>
          )}

          {/* NAV */}
          <nav className="space-y-1 px-1">
            {navigation.map((item) => {
              const isActive = item.active;
              return (
                <button
                  key={item.name}
                  disabled={item.disabled}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs transition-all ${
                    isActive 
                      ? 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-white font-bold border border-zinc-200 dark:border-white/[0.08] shadow-sm' 
                      : item.disabled
                        ? 'opacity-45 text-zinc-450 dark:text-zinc-650 cursor-not-allowed'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.03] font-medium'
                  }`}
                >
                  <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-brand' : 'text-zinc-500'}`} />
                  <span>{item.name}</span>
                  {item.disabled && (
                    <Lock className="w-3 h-3 text-zinc-400 dark:text-zinc-600 ml-auto shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM SECTION */}
        <div className="space-y-4 pt-4 mt-auto">
          {/* UPGRADE CARD FOR FREE PLAN */}
          {!isPortfolioView && condominio?.plan_type === 'free' && (
            <div className="mx-1 p-4 rounded-xl bg-gradient-to-br from-brand/15 via-brand/5 to-transparent border border-brand/20 relative overflow-hidden shadow-sm animate-in fade-in duration-300">
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-brand/10 blur-[20px] rounded-full pointer-events-none"></div>
              <div className="flex items-center space-x-2 text-[10px] font-bold text-brand uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand animate-pulse" />
                <span>Plano Grátis</span>
              </div>
              <p className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">Limite de 15 Chamados/mês</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal font-medium">
                Faça o upgrade e libere chamados ilimitados para seus moradores.
              </p>
              <button
                onClick={() => router.push('/dashboard/configuracoes?tab=faturamento')}
                className="w-full mt-3 py-1.5 bg-brand hover:bg-brand/90 text-white text-[10px] font-bold rounded-lg transition-all active:scale-[0.97] cursor-pointer text-center block shadow-[0_2px_8px_rgba(0,51,255,0.2)]"
              >
                Fazer Upgrade
              </button>
            </div>
          )}

          {/* PROFILE/FOOTER */}
          <div className="border-t border-zinc-200 dark:border-white/[0.06] pt-4 flex items-center justify-between px-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 text-xs font-semibold">
                {gestor.nome.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate leading-tight">{gestor.nome}</p>
                <p className="text-[9px] text-zinc-550 uppercase font-bold tracking-wider leading-none mt-1">
                  {gestor.papel === 'sindico' ? 'Síndico' : 'Zelador'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all shrink-0 border border-transparent hover:border-red-900/30"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTAINER DO CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-100 dark:bg-zinc-950 overflow-y-auto max-h-screen relative transition-colors duration-200">
        {/* Subtle glow background */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[250px] bg-brand/4 blur-[120px] rounded-full pointer-events-none z-0"></div>

        {/* DESKTOP TOP HEADER */}
        <header className="hidden md:flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.06] px-6 py-3.5 z-30 shrink-0 bg-white/85 dark:bg-[#09090b]/85 backdrop-blur-md sticky top-0 transition-colors duration-200">
          <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            {pathname === '/dashboard/kanban' ? 'KANBAN DE OCORRÊNCIAS' : (navigation.find(nav => nav.active)?.name || 'Área Administrativa')}
          </h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleToggleTheme}
              className="relative w-8 h-8 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg border border-zinc-200 dark:border-white/[0.06] bg-zinc-100 dark:bg-white/[0.04] transition-all active:scale-[0.95] overflow-hidden"
              title="Alternar Tema"
            >
              <Sun className={`w-4 h-4 absolute transition-all duration-300 transform ${theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`} />
              <Moon className={`w-4 h-4 absolute transition-all duration-300 transform ${theme === 'light' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`} />
            </button>
            <div className="flex items-center space-x-1.5 text-xs text-zinc-500 font-medium">
              <span>Status:</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse"></span>
              <span className="text-zinc-400 font-bold">Online</span>
            </div>
          </div>
        </header>
        
        {/* CONTAINER DINÂMICO DE FILHOS */}
        <div className="flex-1 p-4 md:p-6 relative">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-100 dark:bg-[#09090b] text-zinc-400">
        <Loader2 className="h-8 w-8 text-brand animate-spin" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando...</p>
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </React.Suspense>
  );
}
