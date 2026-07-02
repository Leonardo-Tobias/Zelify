import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#070709] flex flex-col items-center p-4 sm:p-8 antialiased text-zinc-300 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/5 blur-[130px] rounded-full pointer-events-none z-0" />

      <div className="w-full max-w-3xl relative z-10 space-y-8">
        <Link
          href="/cadastro"
          className="inline-flex items-center space-x-2 text-xs text-zinc-500 hover:text-zinc-300 font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao cadastro</span>
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Termos de Uso
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Última atualização: 02 de julho de 2026
          </p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-zinc-400 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Aceitação dos termos</h2>
            <p>
              Ao utilizar a plataforma Zelcon, você concorda com estes Termos de Uso. Se você não
              concorda com alguma condição, não utilize o serviço.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Definição do serviço</h2>
            <p>
              O Zelcon é uma plataforma SaaS (Software as a Service) que oferece:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Portal do morador para registro de chamados de manutenção</li>
              <li>Sistema de achados e perdidos</li>
              <li>Painel Kanban para gestão de ocorrências</li>
              <li>Geração de placa informativa com QR Code</li>
              <li>Relatórios operacionais mensais</li>
              <li>Painel multi-condomínio para administradoras (plano Corporate)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Planos e cobrança</h2>
            <p>Oferecemos três planos:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Zelcon Starter</strong> — gratuito, limitado a 15 chamados/mês</li>
              <li><strong>Zelcon Pro</strong> — R$ 149/mês, chamados ilimitados</li>
              <li><strong>Zelcon Corporate</strong> — a partir de R$ 59/condomínio/mês, multi-condomínio</li>
            </ul>
            <p className="mt-2">
              As cobranças são processadas mensal ou anualmente através da plataforma Asaas. O não
              pagamento pode resultar na suspensão temporária do acesso ao painel gestor.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Responsabilidades do usuário</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Manter seus dados de acesso em sigilo</li>
              <li>Não utilizar a plataforma para fins ilícitos</li>
              <li>Não enviar conteúdo ofensivo, difamatório ou que viole direitos de terceiros</li>
              <li>Responsabilizar-se pela veracidade das informações cadastradas</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">5. Cancelamento</h2>
            <p>
              O cancelamento da assinatura pode ser feito a qualquer momento pelo painel de configurações.
              Ao cancelar, seu plano será revertido para o Zelcon Starter e os dados serão mantidos
              conforme nossa Política de Privacidade.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">6. Limitação de responsabilidade</h2>
            <p>
              O Zelcon não se responsabiliza por danos indiretos decorrentes do uso do serviço,
              incluindo mas não se limitando a: interrupções temporárias, atrasos na resolução de
              chamados, ou ações de moradores no uso da plataforma.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">7. Disposições gerais</h2>
            <p>
              Estes termos são regidos pela legislação brasileira. Qualquer disputa será resolvida
              no foro da comarca de São Paulo/SP. Caso qualquer disposição seja considerada inválida,
              as demais permanecerão em vigor.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
