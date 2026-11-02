import { Link } from "react-router-dom";
import { useIsEnglish } from "@/i18n/lang";

const SELLER = "Prompt Forge Pro";
const SUPPORT_EMAIL = "geral@promptforgepro.me";

function PrivacyPt() {
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
              {SELLER} ("nós") é responsável pelo tratamento dos teus dados pessoais ("controller") quando
              utilizas o nosso serviço em promptforgepro.me. Para questões de privacidade contacta:{" "}
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
              <li>Criar e gerir a tua conta: <em>execução de contrato</em>.</li>
              <li>Prestar o Serviço, incluindo geração assistida por IA: <em>execução de contrato</em>.</li>
              <li>Segurança, prevenção de fraude e abuso: <em>interesse legítimo</em>.</li>
              <li>Melhoria do produto e diagnóstico: <em>interesse legítimo</em>.</li>
              <li>Apoio ao cliente: <em>execução de contrato</em>.</li>
              <li>Comunicações de marketing: <em>consentimento</em> (podes retirá-lo a qualquer momento).</li>
              <li>Cumprimento de obrigações legais e fiscais: <em>obrigação legal</em>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Partilha de dados</h2>
            <p>Partilhamos dados, na medida do necessário, com:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Paddle</strong>: Merchant of Record, para processar pagamentos, subscrições, faturação, impostos e cumprimento legal.</li>
              <li><strong>Subprocessadores de infraestrutura</strong>: alojamento (Supabase), envio de emails transacionais, análise e monitorização.</li>
              <li><strong>Fornecedores de IA</strong>: modelos de IA generativa (incluindo OpenAI/Google) para processar os teus prompts e devolver outputs. Estes fornecedores tratam os dados como subprocessadores nossos.</li>
              <li><strong>Consultores profissionais</strong>: jurídicos e contabilísticos quando necessário.</li>
              <li><strong>Autoridades</strong>: quando exigido por lei.</li>
            </ul>
            <p className="mt-2">Não vendemos os teus dados pessoais.</p>
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
              Mantemos os dados enquanto a tua conta estiver ativa e pelo período necessário para cumprir
              obrigações legais (fiscais, contabilísticas). Após eliminação da conta, os dados são apagados
              ou anonimizados num prazo razoável, salvo retenção exigida por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Os teus direitos (RGPD)</h2>
            <p>Tem o direito de:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Aceder, retificar e apagar os teus dados;</li>
              <li>Limitar ou opor-se ao tratamento;</li>
              <li>Portabilidade dos dados;</li>
              <li>Retirar consentimentos a qualquer momento;</li>
              <li>Apresentar reclamação à autoridade de controlo competente (em Portugal: CNPD).</li>
            </ul>
            <p className="mt-2">
              Responderemos aos pedidos no prazo de 1 mês. Para exercer os teus direitos, contacta{" "}
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
              Serviço. Podes gerir as preferências de cookies no teu navegador.
            </p>
            <p className="mt-2">
              Usamos o PostHog (alojado na UE) para análise de utilização e gravações de sessão com os campos de formulário ocultados; respeitamos a definição Do Not Track do navegador.
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

function PrivacyEn() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: April 30, 2026</p>
        <div className="space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Who we are</h2>
            <p>
              {SELLER} ("we") is the controller of your personal data when you use our service at promptforgepro.me. For privacy questions, contact:{" "}
              <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">2. Data we collect</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account data:</strong> name, email address, authenticated credentials (including via Google).</li>
              <li><strong>User content:</strong> prompts, outputs, version history and saved settings.</li>
              <li><strong>Usage data:</strong> in-product actions, prompt quality metrics, feature telemetry.</li>
              <li><strong>Technical data:</strong> IP address, device identifiers, browser, access logs.</li>
              <li><strong>Communications:</strong> messages sent to customer support.</li>
              <li><strong>Payment data:</strong> handled directly by Paddle (we do not store card data).</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">3. Purposes and legal basis</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Creating and managing your account: <em>performance of a contract</em>.</li>
              <li>Providing the Service, including AI-assisted generation: <em>performance of a contract</em>.</li>
              <li>Security, fraud and abuse prevention: <em>legitimate interest</em>.</li>
              <li>Product improvement and diagnostics: <em>legitimate interest</em>.</li>
              <li>Customer support: <em>performance of a contract</em>.</li>
              <li>Marketing communications: <em>consent</em> (you can withdraw it at any time).</li>
              <li>Compliance with legal and tax obligations: <em>legal obligation</em>.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">4. Data sharing</h2>
            <p>We share data, to the extent necessary, with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Paddle</strong>: Merchant of Record, to process payments, subscriptions, invoicing, taxes and legal compliance.</li>
              <li><strong>Infrastructure sub-processors</strong>: hosting (Supabase), transactional email delivery, analytics and monitoring.</li>
              <li><strong>AI providers</strong>: generative AI models (including OpenAI/Google) to process your prompts and return outputs. These providers process data as our sub-processors.</li>
              <li><strong>Professional advisers</strong>: legal and accounting, when necessary.</li>
              <li><strong>Authorities</strong>: when required by law.</li>
            </ul>
            <p className="mt-2">We do not sell your personal data.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">5. International transfers</h2>
            <p>
              Some sub-processors may process data outside the EEA/EU. In those cases we ensure appropriate safeguards (adequacy decisions or the European Commission's Standard Contractual Clauses).
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">6. Retention</h2>
            <p>
              We keep data while your account is active and for as long as needed to meet legal obligations (tax, accounting). After account deletion, data is erased or anonymized within a reasonable period, unless retention is required by law.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">7. Your rights (GDPR)</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access, rectify and erase your data;</li>
              <li>Restrict or object to processing;</li>
              <li>Data portability;</li>
              <li>Withdraw consent at any time;</li>
              <li>Lodge a complaint with the competent supervisory authority (in Portugal: CNPD).</li>
            </ul>
            <p className="mt-2">
              We will respond to requests within 1 month. To exercise your rights, contact{" "}
              <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">8. Security</h2>
            <p>
              We apply appropriate technical and organizational measures, including encryption in transit, access controls and Row-Level Security in the database.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">9. Cookies</h2>
            <p>
              We use cookies and similar technologies that are essential for authentication and for the Service to work. You can manage cookie preferences through your browser.
            </p>
            <p className="mt-2">
              We use PostHog (hosted in the EU) for usage analytics and session recordings with form inputs masked; we respect your browser's Do Not Track setting.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">10. Changes</h2>
            <p>
              We may update this policy. Material changes will be notified. See also our{" "}
              <Link to="/terms" className="text-primary underline">Terms & Conditions</Link> and{" "}
              <Link to="/refunds" className="text-primary underline">Refund Policy</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function Privacy() {
  const isEnglish = useIsEnglish();
  return isEnglish ? <PrivacyEn /> : <PrivacyPt />;
}
