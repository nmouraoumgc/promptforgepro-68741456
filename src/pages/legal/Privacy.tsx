import { Link } from "react-router-dom";

const SELLER = "Prompt Forge Pro";
const SUPPORT_EMAIL = "support@promptforgepro.me";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 30 de abril de 2026</p>

        <div className="space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Quem somos</h2>
            <p>
              {SELLER} ("nós") é responsável pelo tratamento dos seus dados pessoais ("controller") quando
              utiliza o nosso serviço em promptforgepro.me. Para questões de privacidade contacte:{" "}
              <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Dados que recolhemos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados de conta:</strong> nome, endereço de email, credenciais autenticadas (incluindo via Google).</li>
              <li><strong>Conteúdo do utilizador:</strong> prompts, outputs, histórico de versões e configurações guardadas.</li>
              <li><strong>Dados de utilização:</strong> ações no produto, métricas de qualidade dos prompts, telemetria de funcionalidade.</li>
              <li><strong>Dados técnicos:</strong> endereço IP, identificadores de dispositivo, navegador, logs de acesso.</li>
              <li><strong>Comunicações:</strong> mensagens enviadas ao apoio ao cliente.</li>
              <li><strong>Dados de pagamento:</strong> tratados diretamente pela Paddle (não armazenamos dados de cartão).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Finalidades e base legal</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Criar e gerir a sua conta — <em>execução de contrato</em>.</li>
              <li>Prestar o Serviço, incluindo geração assistida por IA — <em>execução de contrato</em>.</li>
              <li>Segurança, prevenção de fraude e abuso — <em>interesse legítimo</em>.</li>
              <li>Melhoria do produto e diagnóstico — <em>interesse legítimo</em>.</li>
              <li>Apoio ao cliente — <em>execução de contrato</em>.</li>
              <li>Comunicações de marketing — <em>consentimento</em> (pode retirar a qualquer momento).</li>
              <li>Cumprimento de obrigações legais e fiscais — <em>obrigação legal</em>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Partilha de dados</h2>
            <p>Partilhamos dados, na medida do necessário, com:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Paddle</strong> — Merchant of Record, para processar pagamentos, subscrições, faturação, impostos e cumprimento legal.</li>
              <li><strong>Subprocessadores de infraestrutura</strong> — alojamento (Supabase), envio de emails transacionais, análise e monitorização.</li>
              <li><strong>Fornecedores de IA</strong> — modelos de IA generativa (incluindo OpenAI/Google) para processar os seus prompts e devolver outputs. Estes fornecedores tratam os dados como subprocessadores nossos.</li>
              <li><strong>Consultores profissionais</strong> — jurídicos e contabilísticos quando necessário.</li>
              <li><strong>Autoridades</strong> — quando exigido por lei.</li>
            </ul>
            <p className="mt-2">Não vendemos os seus dados pessoais.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Transferências internacionais</h2>
            <p>
              Alguns subprocessadores podem tratar dados fora do EEE/UE. Nestes casos garantimos
              salvaguardas adequadas (decisões de adequação ou Cláusulas Contratuais Tipo da Comissão Europeia).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Retenção</h2>
            <p>
              Mantemos os dados enquanto a sua conta estiver ativa e pelo período necessário para cumprir
              obrigações legais (fiscais, contabilísticas). Após eliminação da conta, os dados são apagados
              ou anonimizados num prazo razoável, salvo retenção exigida por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Os seus direitos (RGPD)</h2>
            <p>Tem o direito de:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Aceder, retificar e apagar os seus dados;</li>
              <li>Limitar ou opor-se ao tratamento;</li>
              <li>Portabilidade dos dados;</li>
              <li>Retirar consentimentos a qualquer momento;</li>
              <li>Apresentar reclamação à autoridade de controlo competente (em Portugal: CNPD).</li>
            </ul>
            <p className="mt-2">
              Responderemos aos pedidos no prazo de 1 mês. Para exercer os seus direitos, contacte{" "}
              <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Segurança</h2>
            <p>
              Aplicamos medidas técnicas e organizativas adequadas, incluindo encriptação em trânsito,
              controlos de acesso e Row-Level Security na base de dados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Cookies</h2>
            <p>
              Usamos cookies e tecnologias similares essenciais para autenticação e funcionamento do
              Serviço. Pode gerir as preferências de cookies através do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">10. Alterações</h2>
            <p>
              Podemos atualizar esta política. Alterações materiais serão notificadas. Veja também os
              nossos{" "}
              <Link to="/terms" className="text-primary underline">Termos & Condições</Link> e a{" "}
              <Link to="/refunds" className="text-primary underline">Política de Reembolsos</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
