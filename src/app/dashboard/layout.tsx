'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList,
  Package, 
  Settings, 
  LogOut, 
  Loader2, 
  ExternalLink,
  Menu,
  X,
  Sun,
  Moon,
  Lock,
  Sparkles
} from 'lucide-react';
import { db, Condominio, UsuarioGestor, isSupabaseConfigured } from '@/lib/db';
import { CondominioProvider, useCondominio } from '@/contexts/CondominioContext';
import PosterPreview from '@/components/PosterPreview';
import { APP_HOST } from '@/lib/appUrl';
import BrandLogo from '@/components/BrandLogo';
import PushNotificationButton from '@/components/PushNotificationButton';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  const isPortfolioView = view === 'portfolio';

  const { condominio, condominios, isCorporate, loading: ctxLoading, switchCondo: contextSwitch } = useCondominio();

  const [loading, setLoading] = useState(true);
  const [gestor, setGestor] = useState<UsuarioGestor | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [condoDropdownOpen, setCondoDropdownOpen] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState(0);

  const handleSwitchCondo = (target: Condominio) => {
    setCondoDropdownOpen(false);
    contextSwitch(target);
  };

  // Inicializar sessão e tema
  useEffect(() => {
    // Carregar tema salvo
    const savedTheme = (localStorage.getItem('zelcon_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Verificar sessão do gestor (async encapsulado)
    async function initSession() {
      const savedGestor = localStorage.getItem('zelcon_gestor');
      const savedCondo = localStorage.getItem('zelcon_condominio_gestao');

      if (!savedGestor || !savedCondo) {
        router.push('/login');
        return;
      }

      try {
        const gestorData = JSON.parse(savedGestor);

        if (
          !gestorData?.id ||
          !gestorData?.user_id ||
          !gestorData?.condominio_id ||
          !gestorData?.papel ||
          !['sindico', 'zelador', 'admin'].includes(gestorData.papel)
        ) {
          throw new Error('Dados de sessão do gestor inválidos ou adulterados.');
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
      } catch {
        localStorage.removeItem('zelcon_gestor');
        localStorage.removeItem('zelcon_condominio_gestao');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [router]);

  // Atualizar loading quando context estiver pronto
  useEffect(() => {
    if (!ctxLoading && gestor) setLoading(false);
  }, [ctxLoading, gestor]);

  useEffect(() => {
    if (condominio?.plan_type !== 'free') return;
    db.getMonthlyChamadosCount(condominio.id).then(setMonthlyCount).catch(console.error);
  }, [condominio?.id, condominio?.plan_type, pathname]);

  // Alternar Modo Claro / Modo Escuro
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('zelcon_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

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
      document.title = "Gestão de Ocorrências | Zelcon";
    } else {
      document.title = "Zelcon | Gestão Operacional de Condomínios";
    }
  }, [pathname]);

  const handleLogout = async () => {
    if (confirm('Deseja sair do painel administrativo?')) {
      try {
        await db.logoutGestor();
      } catch (error) {
        console.error('Erro ao encerrar sessão no Supabase:', error);
      }
      localStorage.removeItem('zelcon_gestor');
      localStorage.removeItem('zelcon_condominio_gestao');
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

  const isSubscriptionLocked = !isPortfolioView && condominio?.subscription_status !== 'active' && condominio?.plan_type !== 'free';

  const navigation = [
    { 
      name: 'Visão Geral',
      href: '/dashboard', 
      icon: LayoutDashboard, 
      active: !isPortfolioView && pathname === '/dashboard', 
      disabled: isPortfolioView || isSubscriptionLocked 
    },
    { 
      name: 'Gestão de Ocorrências',
      href: '/dashboard/kanban', 
      icon: ClipboardList, 
      active: !isPortfolioView && pathname === '/dashboard/kanban', 
      disabled: isPortfolioView || isSubscriptionLocked 
    },
    { 
      name: 'Achados e Perdidos', 
      href: '/dashboard/achados-perdidos', 
      icon: Package, 
      active: !isPortfolioView && pathname === '/dashboard/achados-perdidos', 
      disabled: isPortfolioView || isSubscriptionLocked 
    },
    { 
      name: 'Configurações', 
      href: '/dashboard/configuracoes', 
      icon: Settings, 
      active: !isPortfolioView && pathname === '/dashboard/configuracoes', 
      disabled: isPortfolioView || isSubscriptionLocked,
      hidden: gestor.papel === 'zelador',
    },
  ].filter(item => !item.hidden);

  return (
    <div className="dashboard-shell min-h-screen bg-white dark:bg-[#111316] text-zinc-700 dark:text-zinc-300 font-sans antialiased flex flex-col md:flex-row transition-colors duration-200">
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-white/95 dark:bg-[#15171a]/95 backdrop-blur-md border-b border-zinc-200 dark:border-white/[0.06] px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          <BrandLogo priority className="h-6 w-auto" />
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
        <div className="md:hidden fixed inset-x-0 top-[53px] bottom-0 bg-white/95 dark:bg-[#15171a]/95 backdrop-blur-lg z-30 flex flex-col justify-between p-4 border-t border-zinc-200 dark:border-white/[0.06] animate-in slide-in-from-top duration-200">
          <div className="space-y-4">
            {!isPortfolioView && (
              <div className="px-2.5 py-2 bg-zinc-50 dark:bg-white/[0.04] rounded-lg border border-zinc-200 dark:border-white/[0.06] flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-500">Placa do Condomínio</span>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); setShowPosterModal(true); }}
                  className="text-brand font-bold flex items-center space-x-0.5 hover:underline cursor-pointer"
                >
                  <span>Ver Placa</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            )}

            {/* MOBILE CONDOMINIUM SELECTOR (apenas corporate) */}
            {isCorporate && condominios.length > 1 && (
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-3 pb-1 block">Condomínios</span>
                <button onClick={() => { setMobileMenuOpen(false); router.push('/dashboard?view=portfolio'); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm pl-8 ${isPortfolioView ? 'bg-brand/10 text-brand font-bold border border-brand/20' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/[0.03]'}`}>
                  <LayoutDashboard className="w-4 h-4" /><span>Todos os condomínios</span>
                </button>
                {condominios.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSwitchCondo(c);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors pl-8 ${
                      c.id === condominio.id
                        ? 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-white font-bold border border-zinc-200 dark:border-white/[0.08]'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.03] font-medium cursor-pointer'
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
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.03] font-medium cursor-pointer'
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
              <div className="p-4 rounded-lg bg-zinc-100 dark:bg-white/[0.025] border border-zinc-200 dark:border-zinc-800 relative overflow-hidden animate-in fade-in duration-300">
                <div className="flex items-center space-x-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                  <span>Zelcon Starter</span>
                </div>
                <p className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">{monthlyCount} de 15 ocorrências utilizadas</p>
                <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 mt-2 overflow-hidden"><div className="h-full bg-brand rounded-full transition-all" style={{ width: `${Math.min(monthlyCount / 15 * 100, 100)}%` }} /></div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal font-medium">
                  Continue recebendo ocorrências sem limite com o Zelcon Pro.
                </p>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push('/dashboard/configuracoes?tab=faturamento');
                  }}
                className="w-full mt-3 py-2 bg-brand hover:bg-brand/90 text-white text-[11px] font-semibold rounded-md transition-colors cursor-pointer text-center block"
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
      <aside className="hidden md:flex flex-col justify-between w-64 bg-zinc-50 dark:bg-[#15171a] border-r border-zinc-200 dark:border-white/[0.06] shrink-0 transition-colors duration-200 py-4">
        <div className="space-y-0">
          {/* LOGO */}
          <div className="px-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center space-x-1">
              <BrandLogo priority className="h-7 w-auto" />
            </div>
          </div>
          
          {/* DROPDOWN DE CONDOMÍNIOS */}
          <div className="py-4 px-4 border-b border-zinc-200 dark:border-zinc-800 relative">
            <button
              type="button"
              onClick={() => setCondoDropdownOpen(!condoDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors border bg-white dark:bg-white/[0.035] border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-extrabold shrink-0 border bg-brand/10 border-brand/20 text-brand">
                  {condominio.nome.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white block truncate leading-none">
                    {condominio.nome}
                  </span>
                </div>
              </div>
              {isCorporate && condominios.length > 1 ? (
                <svg className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${condoDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-2"></span>
              )}
            </button>

            {isCorporate && condoDropdownOpen && (
              <div className="absolute left-4 right-4 top-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-30 py-1 animate-in fade-in slide-in-from-top-1 duration-150">

                {/* Lista de condomínios */}
                <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                  <button onClick={() => { setCondoDropdownOpen(false); router.push('/dashboard?view=portfolio'); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs transition-colors ${isPortfolioView ? 'bg-brand/15 text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}>
                    <LayoutDashboard className="w-4 h-4 text-brand" /><span>Todos os condomínios</span>
                  </button>
                  {condominios.map((c) => {
                    const isActive = c.id === condominio.id;
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

          {/* BOTÃO DE PLACA / LINK DO MORADOR */}
          {!isPortfolioView && condominio?.slug && (
            <div className="py-4 px-4 border-b border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowPosterModal(true)}
                className="w-full flex flex-col p-2.5 bg-zinc-100 dark:bg-white/[0.025] border border-zinc-200 dark:border-zinc-800/65 rounded-lg text-left transition-colors group hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2 text-[11px] font-bold text-zinc-650 dark:text-zinc-300 group-hover:text-brand transition-colors w-full">
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-brand shrink-0 transition-colors" />
                  <span className="truncate">Link do Morador</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-550 group-hover:text-brand truncate max-w-full block mt-1 transition-colors pl-5.5">
                  {APP_HOST}/{condominio.slug}
                </span>
              </button>
            </div>
          )}

          {/* NAV */}
          <nav className="space-y-1 py-4 px-4">
            {navigation.map((item) => {
              const isActive = item.active;
              return (
                <button
                  key={item.name}
                  disabled={item.disabled}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center space-x-3 border px-3 py-2.5 rounded-lg text-xs transition-all ${
                    isActive 
                      ? 'border-zinc-200 bg-zinc-100 text-zinc-900 font-semibold shadow-sm dark:border-white/[0.08] dark:bg-white/[0.055] dark:text-white dark:shadow-none'
                      : item.disabled
                        ? 'border-transparent opacity-45 text-zinc-450 dark:text-zinc-650 cursor-not-allowed'
                        : 'border-transparent text-zinc-500 hover:border-zinc-200 hover:text-zinc-700 dark:hover:border-white/[0.06] dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.03] font-medium cursor-pointer'
                  }`}>
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
        <div className="space-y-4 pt-4 mt-auto px-4">
          {/* UPGRADE CARD FOR FREE PLAN */}
          {!isPortfolioView && condominio?.plan_type === 'free' && (
            <div className="mx-1 p-4 rounded-lg bg-zinc-100 dark:bg-white/[0.025] border border-zinc-200 dark:border-zinc-800 relative overflow-hidden animate-in fade-in duration-300">
              <div className="flex items-center space-x-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                <span>Zelcon Starter</span>
              </div>
              <p className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">{monthlyCount} de 15 ocorrências utilizadas</p>
              <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 mt-2 overflow-hidden"><div className="h-full bg-brand rounded-full transition-all" style={{ width: `${Math.min(monthlyCount / 15 * 100, 100)}%` }} /></div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal font-medium">
                Continue recebendo ocorrências sem limite com o Zelcon Pro.
              </p>
              <button
                onClick={() => router.push('/dashboard/configuracoes?tab=faturamento')}
                  className="w-full mt-3 py-2 bg-brand hover:bg-brand/90 text-white text-[11px] font-semibold rounded-md transition-colors cursor-pointer text-center block"
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

      {/* MODAL DA PLACA DO CONDOMÍNIO */}
      {showPosterModal && condominio && condominio.slug && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-2xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0c0c0e] z-10 flex items-center justify-between p-5 pb-3 border-b border-zinc-800/60">
              <h3 className="text-sm font-bold text-white tracking-tight">Placa do Condomínio</h3>
              <button
                type="button"
                onClick={() => setShowPosterModal(false)}
                className="text-zinc-500 hover:text-white text-xs font-medium px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
            <div className="p-5">
              <PosterPreview
                nome={condominio.nome}
                slug={condominio.slug}
                codigoAcesso={condominio.codigo_acesso?.startsWith('$2') ? '••••' : (condominio.codigo_acesso || '----')}
                posterTitle="Portal do Morador"
                posterInstructions="Escaneie o QR Code abaixo com seu celular para abrir o Portal do Morador, relatar problemas de manutenção ou cadastrar achados e perdidos."
                posterTheme="blue"
                planType={condominio.plan_type}
                showCodigo={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* CONTAINER DO CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-100 dark:bg-zinc-950 overflow-y-auto max-h-screen relative transition-colors duration-200">

        {/* DESKTOP TOP HEADER */}
        <header className="hidden md:flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.06] px-6 py-3.5 z-30 shrink-0 bg-white/85 dark:bg-[#09090b]/85 backdrop-blur-md sticky top-0 transition-colors duration-200">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide">
            {pathname === '/dashboard/kanban' ? 'GESTÃO DE OCORRÊNCIAS' : (navigation.find(nav => nav.active)?.name || 'Área Administrativa')}
          </h2>
          <div className="flex items-center space-x-4">
            <PushNotificationButton audience="gestor" />
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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
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
      <CondominioProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </CondominioProvider>
    </React.Suspense>
  );
}
