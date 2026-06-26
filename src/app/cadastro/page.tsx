'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft, Building, User, Mail, Lock, Key } from 'lucide-react';
import { db } from '@/lib/db';

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Passo 1: Dados do Gestor
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Passo 2: Dados do Condomínio
  const [condominioNome, setCondominioNome] = useState('');
  const [condominioSlug, setCondominioSlug] = useState('');
  const [codigoAcesso, setCodigoAcesso] = useState('');

  const handleCondoNameChange = (val: string) => {
    setCondominioNome(val);
    // Gerar slug automaticamente: minusculas, remover acentos e caracteres especiais, trocar espaços por hífens
    const suggested = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s-]/g, '')    // remove caracteres especiais, mantem letras, numeros e espacos
      .trim()
      .replace(/\s+/g, '-');           // substitui espacos por hifens
    setCondominioSlug(suggested);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nome.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setStep(2);
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!condominioNome.trim() || !condominioSlug.trim() || !codigoAcesso) {
      setError('Por favor, preencha todos os campos do condomínio.');
      return;
    }

    // Validar código de acesso (exatamente 4 números)
    if (!/^\d{4}$/.test(codigoAcesso)) {
      setError('O código de acesso dos moradores deve conter exatamente 4 números.');
      return;
    }

    // Validar formato do slug
    if (!/^[a-z0-9-]+$/.test(condominioSlug)) {
      setError('O slug do condomínio deve conter apenas letras minúsculas, números e hífens.');
      return;
    }

    setLoading(true);
    try {
      // 1. Verificar se o slug é único
      const isUnique = await db.isSlugUnique(condominioSlug);
      if (!isUnique) {
        setError('Este endereço (slug) já está em uso por outro condomínio.');
        setLoading(false);
        return;
      }

      // 2. Efetuar o cadastro completo
      const session = await db.cadastrarGestor({
        nome: nome.trim(),
        email: email.trim(),
        password,
        condominioNome: condominioNome.trim(),
        condominioSlug: condominioSlug.trim(),
        codigoAcesso
      });

      // 3. Salvar dados de login no localStorage e redirecionar
      localStorage.setItem('zelify_gestor', JSON.stringify(session.gestor));
      localStorage.setItem('zelify_condominio_gestao', JSON.stringify(session.condominio));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Falha ao efetuar o cadastro. Verifique os dados ou tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-4 antialiased text-zinc-300 relative overflow-hidden">
      
      {/* Glow de fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0033FF]/10 blur-[130px] rounded-full pointer-events-none z-0"></div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        
        {/* LOGO E CABEÇALHO */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-zinc-900/40 border border-zinc-800 rounded-xl mb-4 text-[#0033FF] shadow-2xl backdrop-blur-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Comece com o Zelify</h1>
          <p className="text-sm text-zinc-300 mt-1 font-medium">
            Cadastre seu condomínio e crie sua conta de síndico
          </p>
        </div>

        {/* BARRA DE PROGRESSO DE PASSOS */}
        <div className="flex items-center justify-center space-x-3">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border transition-all ${
            step === 1 
              ? 'bg-[#0033FF] text-white border-[#0033FF] shadow-[0_0_8px_rgba(0,51,255,0.4)]' 
              : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'
          }`}>
            1
          </div>
          <div className="w-8 h-px bg-zinc-800"></div>
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border transition-all ${
            step === 2 
              ? 'bg-[#0033FF] text-white border-[#0033FF] shadow-[0_0_8px_rgba(0,51,255,0.4)]' 
              : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'
          }`}>
            2
          </div>
        </div>

        {/* CARD PRINCIPAL */}
        <div className="bg-[#0f0f13]/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Linha de reflexo azul no topo */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#0033FF]/60 to-transparent"></div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-400 flex items-center space-x-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* PASSO 1: DADOS GESTOR */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center">
                <User className="w-4 h-4 mr-2 text-[#0033FF]" />
                Dados do Administrador
              </h3>

              <div>
                <label htmlFor="nome" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Nome Completo
                </label>
                <input
                  id="nome"
                  type="text"
                  placeholder="Nome do síndico"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#0033FF]/50 focus:border-[#0033FF]/50 hover:border-zinc-700 transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#0033FF]/50 focus:border-[#0033FF]/50 hover:border-zinc-700 transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#0033FF]/50 focus:border-[#0033FF]/50 hover:border-zinc-700 transition-all font-medium"
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

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Confirmar Senha
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#0033FF]/50 focus:border-[#0033FF]/50 hover:border-zinc-700 transition-all font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-[#0033FF] to-blue-600 hover:opacity-95 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(0,51,255,0.25)] active:scale-[0.98] cursor-pointer"
              >
                Próximo Passo
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </form>
          )}

          {/* PASSO 2: DADOS CONDOMÍNIO */}
          {step === 2 && (
            <form onSubmit={handleCadastro} className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center">
                <Building className="w-4 h-4 mr-2 text-[#0033FF]" />
                Dados do Condomínio
              </h3>

              <div>
                <label htmlFor="condoNome" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Nome do Condomínio
                </label>
                <input
                  id="condoNome"
                  type="text"
                  placeholder="Ex: Residencial Flores"
                  value={condominioNome}
                  onChange={(e) => handleCondoNameChange(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#0033FF]/50 focus:border-[#0033FF]/50 hover:border-zinc-700 transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label htmlFor="condoSlug" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Endereço de Acesso (Slug da URL)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs text-zinc-600 font-mono select-none">
                    /
                  </span>
                  <input
                    id="condoSlug"
                    type="text"
                    placeholder="nome-do-condominio"
                    value={condominioSlug}
                    onChange={(e) => setCondominioSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full pl-6 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#0033FF]/50 focus:border-[#0033FF]/50 hover:border-zinc-700 transition-all font-mono"
                    required
                  />
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 font-medium leading-relaxed">
                  Seus moradores acessarão por: <span className="font-mono text-zinc-300">/{condominioSlug || '...' }</span>
                </p>
              </div>

              <div>
                <label htmlFor="codigoAcesso" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Código de Validação dos Moradores
                </label>
                <div className="relative">
                  <input
                    id="codigoAcesso"
                    type="text"
                    placeholder="4 dígitos numéricos (ex: 4321)"
                    maxLength={4}
                    value={codigoAcesso}
                    onChange={(e) => setCodigoAcesso(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-3 pr-10 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#0033FF]/50 focus:border-[#0033FF]/50 hover:border-zinc-700 transition-all font-medium tracking-wider"
                    required
                  />
                  <Key className="absolute right-3 top-2.5 text-zinc-600 w-4 h-4" />
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 font-medium leading-relaxed">
                  Código que os moradores usarão para liberar o envio de chamados.
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="w-1/3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 text-sm font-semibold py-2 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 bg-gradient-to-r from-[#0033FF] to-blue-600 hover:opacity-95 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(0,51,255,0.25)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Criando...
                    </>
                  ) : (
                    'Finalizar Cadastro'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* DIRECIONAMENTO PARA LOGIN */}
        <div className="text-center">
          <p className="text-xs text-zinc-500">
            Já tem uma conta cadastrada?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-[#0033FF] hover:underline font-bold transition-all bg-transparent border-0 cursor-pointer"
            >
              Entre no Painel
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
