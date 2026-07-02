import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PrivacidadePage() {
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
            Política de Privacidade
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Última atualização: 02 de julho de 2026
          </p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-zinc-400 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Quem somos</h2>
            <p>
              O Zelcon é uma plataforma de gestão operacional de condomínios que conecta moradores,
              síndicos e administradoras para o registro e acompanhamento de chamados de manutenção
              e objetos achados e perdidos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Dados que coletamos</h2>
            <p className="font-semibold text-zinc-300">Durante o cadastro do gestor (síndico/administradora):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nome completo</li>
              <li>Endereço de e-mail</li>
              <li>Senha de acesso (armazenada de forma segura pelo Supabase Auth)</li>
              <li>CPF e telefone (apenas durante o checkout de planos pagos)</li>
              <li>Dados de cartão de crédito (processados diretamente pelo Asaas — não armazenamos)</li>
            </ul>
            <p className="font-semibold text-zinc-300 mt-3">Durante o uso pelos moradores:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Bloco e número do apartamento</li>
              <li>Descrição do problema/objeto informada voluntariamente</li>
              <li>Fotos anexadas ao chamado (armazenadas no Supabase Storage)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Base legal para o tratamento</h2>
            <p>
              Tratamos seus dados pessoais com base no <strong>consentimento</strong> (Art. 7º, I da LGPD),
              que você nos concede ao aceitar esta política durante o cadastro.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Compartilhamento com terceiros</h2>
            <p>Compartilhamos seus dados apenas com os seguintes parceiros, estritamente necessários ao funcionamento do serviço:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Asaas</strong> (processamento de pagamentos) — recebe nome, e-mail, CPF, telefone e
                dados de cartão para cobrança e gestão de assinaturas
              </li>
              <li>
                <strong>QR Server (api.qrserver.com)</strong> — recebe a URL pública do condomínio para
                geração de QR Codes
              </li>
              <li>
                <strong>Supabase</strong> (hospedagem do banco de dados e autenticação) —
                todos os dados da plataforma
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">5. Seus direitos (Art. 18 LGPD)</h2>
            <p>Você pode, a qualquer momento:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Solicitar a exclusão</strong> da sua conta e dados pessoais</li>
              <li><strong>Solicitar a portabilidade</strong> dos seus dados</li>
              <li><strong>Corrigir</strong> dados pessoais incompletos ou desatualizados</li>
              <li><strong>Revogar o consentimento</strong> a qualquer momento</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, entre em contato: <strong>contato@zelcon.com.br</strong>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">6. Retenção de dados</h2>
            <p>
              Mantemos seus dados pessoais enquanto sua conta estiver ativa. Ao cancelar a assinatura,
              seus dados permanecem retidos pelo período de 12 meses para cumprimento de obrigações
              legais e fiscais, sendo após esse período automaticamente anonimizados ou excluídos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">7. Segurança</h2>
            <p>
              Utilizamos criptografia em trânsito (TLS/SSL), controle de acesso via RLS (Row Level Security)
              no banco de dados, e autenticação gerenciada pelo Supabase Auth. Dados de pagamento são
              processados diretamente pelo Asaas (certificado PCI DSS), sem armazenamento local.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">8. Cookies</h2>
            <p>
              Utilizamos apenas cookies estritamente necessários para o funcionamento da plataforma
              (autenticação de sessão). Não utilizamos cookies de rastreamento, publicidade ou análise
              comportamental.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">9. Alterações nesta política</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Recomendamos a revisão regular desta
              página. Em caso de alterações significativas, comunicaremos os usuários cadastrados por e-mail.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">10. Contato</h2>
            <p>
              Encarregado (DPO): <strong>contato@zelcon.com.br</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
