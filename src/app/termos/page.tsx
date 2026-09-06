'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  CreditCard,
  Shield,
  XCircle,
  AlertTriangle,
  Scale,
  ChevronDown,
  Loader2
} from 'lucide-react'

const sections = [
  {
    id: 'aceitacao',
    icon: CheckCircle2,
    title: '1. Aceitação dos termos',
    content: (
      <p>
        Ao utilizar a plataforma Zelcon, você concorda com estes Termos de Uso. Se você não
        concorda com alguma condição, não utilize o serviço.
      </p>
    )
  },
  {
    id: 'definicao',
    icon: FileText,
    title: '2. Definição do serviço',
    content: (
      <div className="space-y-3">
        <p>O Zelcon é uma plataforma SaaS (Software as a Service) que oferece:</p>
        <ul className="space-y-1">
          {[
            'Portal do morador para registro de chamados de manutenção',
            'Sistema de achados e perdidos',
            'Painel Kanban para gestão de ocorrências',
            'Geração de placa informativa com QR Code',
            'Relatórios operacionais mensais',
            'Painel multi-condomínio para administradoras (plano Corporate)',
          ].map((item, i) => (
            <li key={i} className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  },
  {
    id: 'planos',
    icon: CreditCard,
    title: '3. Planos e cobrança',
    content: (
      <div className="space-y-3">
        <p>Oferecemos três planos:</p>
        <ul className="space-y-1">
          {[
            { name: 'Zelcon Starter', desc: 'gratuito, limitado a 15 chamados/mês' },
            { name: 'Zelcon Pro', desc: 'R$ 149/mês, chamados ilimitados' },
            { name: 'Zelcon Corporate', desc: 'a partir de R$ 59/condomínio/mês, multi-condomínio' },
          ].map((item, i) => (
            <li key={i} className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>{item.name}</strong> — {item.desc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">
          As cobranças são processadas mensal ou anualmente através da plataforma Asaas. O não
          pagamento pode resultar na suspensão temporária do acesso ao painel gestor.
        </p>
      </div>
    )
  },
  {
    id: 'responsabilidades',
    icon: Shield,
    title: '4. Responsabilidades do usuário',
    content: (
      <ul className="space-y-1">
        {[
          'Manter seus dados de acesso em sigilo',
          'Não utilizar a plataforma para fins ilícitos',
          'Não enviar conteúdo ofensivo, difamatório ou que viole direitos de terceiros',
          'Responsabilizar-se pela veracidade das informações cadastradas',
        ].map((item, i) => (
          <li key={i} className="flex items-start space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  },
  {
    id: 'cancelamento',
    icon: XCircle,
    title: '5. Cancelamento',
    content: (
      <p>
        O cancelamento da assinatura pode ser feito a qualquer momento pelo painel de configurações.
        Ao cancelar, seu plano será revertido para o Zelcon Starter e os dados serão mantidos
        conforme nossa Política de Privacidade.
      </p>
    )
  },
  {
    id: 'limitacao',
    icon: AlertTriangle,
    title: '6. Limitação de responsabilidade',
    content: (
      <p>
        O Zelcon não se responsabiliza por danos indiretos decorrentes do uso do serviço,
        incluindo mas não se limitando a: interrupções temporárias, atrasos na resolução de
        chamados, ou ações de moradores no uso da plataforma.
      </p>
    )
  },
  {
    id: 'disposicoes',
    icon: Scale,
    title: '7. Disposições gerais',
    content: (
      <p>
        Estes termos são regidos pela legislação brasileira. Qualquer disputa será resolvida
        no foro da comarca de São Paulo/SP. Caso qualquer disposição seja considerada inválida,
        as demais permanecerão em vigor.
      </p>
    )
  }
]

function TermosContent() {
  const searchParams = useSearchParams()
  const step = searchParams.get('step') || ''
  const [expanded, setExpanded] = useState<string>('aceitacao')

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
              <FileText className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Termos de Uso
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
            className="inline-flex items-center space-x-2 bg-brand hover:bg-brand/90 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao cadastro</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function TermosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070709] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-brand" />
      </div>
    }>
      <TermosContent />
    </Suspense>
  )
}
