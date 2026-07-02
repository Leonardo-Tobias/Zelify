'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Shield,
  Database,
  FileText,
  Share2,
  Eye,
  Clock,
  Lock,
  Cookie,
  Edit3,
  Mail,
  CheckCircle2,
  ChevronDown,
  Loader2
} from 'lucide-react'

const sections = [
  {
    id: 'quem-somos',
    icon: Shield,
    title: '1. Quem somos',
    content: (
      <p>
        O Zelcon é uma plataforma de gestão operacional de condomínios que conecta moradores,
        síndicos e administradoras para o registro e acompanhamento de chamados de manutenção
        e objetos achados e perdidos.
      </p>
    )
  },
  {
    id: 'dados-coletados',
    icon: Database,
    title: '2. Dados que coletamos',
    content: (
      <div className="space-y-3">
        <div>
          <p className="font-semibold text-zinc-300 mb-1.5">Durante o cadastro do gestor (síndico/administradora):</p>
          <ul className="space-y-1">
            {['Nome completo', 'Endereço de e-mail', 'Senha de acesso (armazenada de forma segura pelo Supabase Auth)', 'CPF e telefone (apenas durante o checkout de planos pagos)', 'Dados de cartão de crédito (processados diretamente pelo Asaas — não armazenamos)'].map((item, i) => (
              <li key={i} className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-zinc-300 mb-1.5">Durante o uso pelos moradores:</p>
          <ul className="space-y-1">
            {['Bloco e número do apartamento', 'Descrição do problema/objeto informada voluntariamente', 'Fotos anexadas ao chamado (armazenadas no Supabase Storage)'].map((item, i) => (
              <li key={i} className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'base-legal',
    icon: FileText,
    title: '3. Base legal para o tratamento',
    content: (
      <p>
        Tratamos seus dados pessoais com base no <strong>consentimento</strong> (Art. 7º, I da LGPD),
        que você nos concede ao aceitar esta política durante o cadastro.
      </p>
    )
  },
  {
    id: 'compartilhamento',
    icon: Share2,
    title: '4. Compartilhamento com terceiros',
    content: (
      <div className="space-y-3">
        <p>Compartilhamos seus dados apenas com os seguintes parceiros, estritamente necessários ao funcionamento do serviço:</p>
        <ul className="space-y-2">
          {[
            { name: 'Asaas', desc: 'processamento de pagamentos — recebe nome, e-mail, CPF, telefone e dados de cartão para cobrança e gestão de assinaturas' },
            { name: 'QR Server (api.qrserver.com)', desc: 'recebe a URL pública do condomínio para geração de QR Codes' },
            { name: 'Supabase', desc: 'hospedagem do banco de dados e autenticação — todos os dados da plataforma' }
          ].map((p, i) => (
            <li key={i} className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>{p.name}</strong> — {p.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  },
  {
    id: 'direitos',
    icon: Eye,
    title: '5. Seus direitos (Art. 18 LGPD)',
    content: (
      <div className="space-y-3">
        <p>Você pode, a qualquer momento:</p>
        <ul className="space-y-1">
          {[
            'Solicitar a exclusão da sua conta e dados pessoais',
            'Solicitar a portabilidade dos seus dados',
            'Corrigir dados pessoais incompletos ou desatualizados',
            'Revogar o consentimento a qualquer momento'
          ].map((item, i) => (
            <li key={i} className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>{item}</strong></span>
            </li>
          ))}
        </ul>
        <p className="mt-2">
          Para exercer seus direitos, entre em contato: <strong className="text-brand">contato@zelcon.com.br</strong>
        </p>
      </div>
    )
  },
  {
    id: 'retencao',
    icon: Clock,
    title: '6. Retenção de dados',
    content: (
      <p>
        Mantemos seus dados pessoais enquanto sua conta estiver ativa. Ao cancelar a assinatura,
        seus dados permanecem retidos pelo período de 12 meses para cumprimento de obrigações
        legais e fiscais, sendo após esse período automaticamente anonimizados ou excluídos.
      </p>
    )
  },
  {
    id: 'seguranca',
    icon: Lock,
    title: '7. Segurança',
    content: (
      <p>
        Utilizamos criptografia em trânsito (TLS/SSL), controle de acesso via RLS (Row Level Security)
        no banco de dados, e autenticação gerenciada pelo Supabase Auth. Dados de pagamento são
        processados diretamente pelo Asaas (certificado PCI DSS), sem armazenamento local.
      </p>
    )
  },
  {
    id: 'cookies',
    icon: Cookie,
    title: '8. Cookies',
    content: (
      <p>
        Utilizamos apenas cookies estritamente necessários para o funcionamento da plataforma
        (autenticação de sessão). Não utilizamos cookies de rastreamento, publicidade ou análise
        comportamental.
      </p>
    )
  },
  {
    id: 'alteracoes',
    icon: Edit3,
    title: '9. Alterações nesta política',
    content: (
      <p>
        Esta política pode ser atualizada periodicamente. Recomendamos a revisão regular desta
        página. Em caso de alterações significativas, comunicaremos os usuários cadastrados por e-mail.
      </p>
    )
  },
  {
    id: 'contato',
    icon: Mail,
    title: '10. Contato',
    content: (
      <p>
        Encarregado (DPO): <strong className="text-brand">contato@zelcon.com.br</strong>
      </p>
    )
  }
]

function PrivacidadeContent() {
  const searchParams = useSearchParams()
  const step = searchParams.get('step') || ''
  const [expanded, setExpanded] = useState<string>('quem-somos')

  const toggle = (id: string) => {
    setExpanded(prev => prev === id ? '' : id)
  }

  return (
    <div className="min-h-screen bg-[#070709] flex flex-col items-center p-4 sm:p-8 antialiased text-zinc-300 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <div className="w-full max-w-3xl relative z-10 space-y-8">
        <Link
          href={`/cadastro${step ? `?step=${step}` : ''}`}
          className="inline-flex items-center space-x-2 text-xs text-zinc-500 hover:text-zinc-300 font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao cadastro</span>
        </Link>

        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Política de Privacidade
              </h1>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Última atualização: 02 de julho de 2026
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((section) => {
            const isOpen = expanded === section.id
            const Icon = section.icon
            return (
              <div
                key={section.id}
                className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden transition-all duration-200 hover:border-white/[0.1]"
              >
                <button
                  type="button"
                  onClick={() => toggle(section.id)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-brand" />
                    </div>
                    <span className="text-sm font-bold text-white">{section.title}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-sm text-zinc-400 leading-relaxed space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    {section.content}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="text-center pb-8">
          <Link
            href={`/cadastro${step ? `?step=${step}` : ''}`}
            className="inline-flex items-center space-x-2 bg-brand hover:bg-brand/90 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all active:scale-[0.98] shadow-[0_4px_15px_rgba(0,51,255,0.2)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao cadastro</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PrivacidadePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070709] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-brand" />
      </div>
    }>
      <PrivacidadeContent />
    </Suspense>
  )
}
