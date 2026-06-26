'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Wrench, 
  Package, 
  Sparkles, 
  ArrowRight, 
  ExternalLink,
  Search,
  Building
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');

  const handleGoToCondo = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanSlug = slug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/\s+/g, '-');

    if (!cleanSlug) {
      setError('Por favor, digite o slug do condomínio.');
      return;
    }

    router.push(`/${cleanSlug}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans antialiased flex flex-col justify-between">
      
      {/* HEADER NAVBAR */}
      <header className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-black tracking-tight text-white">Zelify<span className="text-[#0033FF]">.</span></span>
          </div>
          <button 
            onClick={() => router.push('/login')}
            className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Área do Gestor</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="max-w-5xl mx-auto px-6 py-12 md:py-24 flex-1 flex flex-col items-center justify-center text-center space-y-8">
        
        {/* BADGE DESTAQUE */}
        <div className="inline-flex items-center space-x-2 bg-[#0033FF]/10 border border-[#0033FF]/20 text-[#0033FF] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>SaaS MVP Mobile-First para Condomínios</span>
        </div>

        {/* HEADLINE PRINCIPAL */}
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Gestão operacional descomplicada para seu condomínio
          </h1>
          <p className="text-sm md:text-base text-zinc-400 font-medium max-w-xl mx-auto leading-relaxed">
            Sem senhas, sem logins complexos e sem downloads de aplicativo para os moradores. Tudo resolvido por uma URL pública exclusiva.
          </p>
        </div>

        {/* INPUT DE PESQUISA DO CONDOMÍNIO (DIRECIONAMENTO) */}
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-850 rounded-2xl p-5 shadow-xl text-left space-y-4">
          <form onSubmit={handleGoToCondo} className="space-y-3">
            <div>
              <label htmlFor="condo-slug" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Digite o slug do seu condomínio
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-zinc-600">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="condo-slug"
                  type="text"
                  placeholder="Ex: viverbem"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full pl-9 pr-24 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#0033FF]/50 font-semibold"
                  required
                />
                <button
                  type="submit"
                  className="absolute right-2 bg-[#0033FF] hover:bg-[#0033FF]/90 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                >
                  Acessar
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs font-semibold">{error}</p>
            )}

            {/* SEED HINT */}
            <div className="pt-2 border-t border-zinc-850/60 flex items-start space-x-2 text-[11px] text-zinc-400">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0 mt-1.5"></span>
              <p className="leading-relaxed">
                <span className="font-bold text-zinc-300">Dica de Teste:</span> Digite <span className="font-mono bg-zinc-950 px-1 py-0.5 rounded border border-zinc-850 text-white">viverbem</span> e use o código de acesso <span className="font-semibold text-white">1234</span> para testar o fluxo de morador.
              </p>
            </div>
          </form>
        </div>

        {/* BENEFÍCIOS DO SAAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12 border-t border-zinc-900 text-left">
          
          <div className="p-4 border border-zinc-900 hover:border-zinc-850 rounded-xl space-y-2 bg-zinc-900/10 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[#0033FF]/10 text-[#0033FF] flex items-center justify-center mb-3">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Acesso sem fricção</h3>
            <p className="text-xs text-zinc-550 leading-relaxed font-medium">
              Moradores abrem ocorrências e acompanham achados e perdidos direto pelo navegador no celular, sem downloads.
            </p>
          </div>

          <div className="p-4 border border-zinc-900 hover:border-zinc-850 rounded-xl space-y-2 bg-zinc-900/10 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <Wrench className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Kanban de Manutenção</h3>
            <p className="text-xs text-zinc-550 leading-relaxed font-medium">
              Painel de arrastar e soltar para síndicos e zeladores gerenciarem o ciclo operacional: pendente, execução e concluído.
            </p>
          </div>

          <div className="p-4 border border-zinc-900 hover:border-zinc-850 rounded-xl space-y-2 bg-zinc-900/10 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Package className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Achados e Perdidos</h3>
            <p className="text-xs text-zinc-550 leading-relaxed font-medium">
              Inventário gerenciável na portaria com sincronização instantânea em um mural público de achados para os moradores.
            </p>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 py-6 px-6 text-center text-xs text-zinc-600">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Zelify Condomínios. Todos os direitos reservados.</p>
          <p className="font-semibold text-zinc-500 flex items-center">
            Desenvolvido com Next.js & Supabase
          </p>
        </div>
      </footer>

    </div>
  );
}
