'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { db, isSupabaseConfigured } from '@/lib/db';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirecionar se já estiver logado
  useEffect(() => {
    const savedGestor = localStorage.getItem('zelcore_gestor');
    if (savedGestor) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const session = await db.loginGestor(email, password);
      if (session) {
        // Salvar dados do gestor e do condomínio no localStorage para a sessão
        localStorage.setItem('zelcore_gestor', JSON.stringify(session.gestor));
        localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(session.condominio));
        router.push('/dashboard');
      } else {
        setError('E-mail ou senha incorretos.');
      }
    } catch (err) {
      setError('Falha ao autenticar. Verifique sua conexão.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-4 antialiased text-zinc-300 relative overflow-hidden">
      
      {/* Background glow similar to dashboard/landing page */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#001CFF]/10 blur-[130px] rounded-full pointer-events-none z-0"></div>

      <div className="w-full max-w-sm space-y-6 relative z-10">
        
        {/* LOGO E TÍTULO */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-zinc-900/40 border border-zinc-800 rounded-xl mb-4 text-[#001CFF] shadow-2xl backdrop-blur-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Acesse o Zelcore Gestor</h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Painel administrativo para síndicos e zeladores
          </p>
        </div>

        {/* BOX DE LOGIN */}
        <div className="bg-[#0f0f13]/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Subtle line glow inside */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#001CFF]/60 to-transparent"></div>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-400 flex items-center space-x-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                placeholder="nome@condominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#001CFF]/50 focus:border-[#001CFF]/50 hover:border-zinc-700 transition-all font-medium"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Senha
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#001CFF]/50 focus:border-[#001CFF]/50 hover:border-zinc-700 transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-[#001CFF] to-blue-600 hover:opacity-95 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(0,51,255,0.25)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Autenticando...
                </>
              ) : (
                'Entrar no Painel'
              )}
            </button>
          </form>
        </div>

        {/* DIRECIONAMENTO PARA CADASTRO */}
        <div className="text-center">
          <p className="text-xs text-zinc-500">
            Não tem uma conta?{' '}
            <button
              type="button"
              onClick={() => router.push('/cadastro')}
              className="text-[#001CFF] hover:underline font-bold transition-all bg-transparent border-0 cursor-pointer"
            >
              Cadastre seu Condomínio
            </button>
          </p>
        </div>

        {/* NOTA DO MODO MOCK */}
        {!isSupabaseConfigured && (
          <div className="bg-[#0f0f13]/40 border border-zinc-800/60 rounded-xl p-4 text-[11px] text-zinc-400 space-y-2">
            <div className="font-bold text-zinc-300 flex items-center uppercase tracking-wider text-[10px]">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
              Modo de Teste (Sem Banco Supabase)
            </div>
            <p className="leading-relaxed">
              O aplicativo está rodando localmente. Use uma das credenciais abaixo para testar o painel administrativo:
            </p>
            <div className="pt-1.5 space-y-1 font-mono text-[10px] text-zinc-300">
              <div>
                <span className="text-zinc-500">Síndico:</span> sindico@viverbem.com
              </div>
              <div>
                <span className="text-zinc-500">Zelador:</span> zelador@viverbem.com
              </div>
              <div>
                <span className="text-zinc-500">Senha:</span> 123456
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
