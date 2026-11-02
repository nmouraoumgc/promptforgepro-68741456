import { Link } from "react-router-dom";
import { useIsEnglish } from "@/i18n/lang";

const SELLER = "Prompt Forge Pro";
const SUPPORT_EMAIL = "support@promptforgepro.me";

function TermsPt() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">Termos & Condições</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 30 de abril de 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Quem somos</h2>
            <p>
              Estes Termos & Condições regem o uso do serviço {SELLER} ("nós", "nosso", o "Serviço"),
              acessível em promptforgepro.me. Ao usar o Serviço, está a celebrar um contrato com {SELLER}.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Aceitação dos termos</h2>
            <p>
              Ao aceder ou continuar a usar o Serviço, confirmas que leste, compreendeste e aceitaste estes Termos.
              Se não concordares, não deves utilizar o Serviço. Se estás a aceitar em nome de uma organização,
              declaras ter autoridade para a vincular.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Descrição do Serviço</h2>
            <p>
              {SELLER} fornece ferramentas e templates ("Prompt Packs") para criação, otimização e teste
              de prompts para modelos de IA generativa, incluindo geração assistida por IA, históricos de
              versões e biblioteca de prompts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Conta e credenciais</h2>
            <p>
              És responsável por manter a confidencialidade das credenciais da tua conta e por toda a
              atividade que ocorra na mesma. Deves fornecer informação precisa e mantê-la atualizada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Uso aceitável</h2>
            <p>Não podes utilizar o Serviço para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Atividades ilegais, fraudulentas ou abusivas (incluindo spam);</li>
              <li>Violar direitos de propriedade intelectual ou de privacidade de terceiros;</li>
              <li>Interferir com a segurança do Serviço (malware, sondagem, scraping não autorizado);</li>
              <li>Gerar conteúdos ilícitos, deepfakes não consentidos, discurso de ódio ou material que
                  promova danos, exploração de menores ou violência;</li>
              <li>Tentar contornar limitações técnicas, fazer reverse engineering, revender ou
                  redistribuir o Serviço.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Conteúdo gerado por IA</h2>
            <p>
              És responsável pelos prompts que submetes, pelo uso que fazes dos resultados ("outputs") e por
              ter os direitos sobre qualquer conteúdo de input. Os outputs podem ser imprecisos,
              incompletos ou desatualizados e não devem ser considerados aconselhamento profissional
              regulado (legal, médico, financeiro) sem revisão humana qualificada. Reservamo-nos o
              direito de filtrar, recusar ou remover prompts e outputs que violem estes Termos, bem
              como de suspender contas em caso de infrações repetidas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Propriedade intelectual</h2>
            <p>
              {SELLER} mantém a propriedade do Serviço, do software, da documentação e da marca.
              Concedemos-te uma licença limitada, não exclusiva e não transferível para usar o Serviço
              dentro do plano contratado. Manténs os direitos sobre os teus inputs e outputs, sujeito a
              uma licença limitada para que possamos alojar e processar o teu conteúdo apenas para te
              prestar o Serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Pagamentos e subscrições</h2>
            <p>
              O processamento das encomendas é feito pelo nosso revendedor online Paddle.com. A
              Paddle.com é o Merchant of Record (Comerciante Registado) de todas as nossas encomendas.
              A Paddle trata de todas as questões de apoio ao cliente relacionadas com pagamentos e
              gere as devoluções.
            </p>
            <p>
              Os termos de pagamento, faturação, impostos, renovação automática, cancelamento e reembolso
              regem-se pelos{" "}
              <a
                href="https://www.paddle.com/legal/checkout-buyer-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Termos de Comprador da Paddle
              </a>
              . Consulta ainda a nossa{" "}
              <Link to="/refunds" className="text-primary underline">Política de Reembolsos</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Disponibilidade do Serviço</h2>
            <p>
              Esforçamo-nos por manter o Serviço disponível, mas não garantimos funcionamento
              ininterrupto ou isento de erros. Podemos realizar manutenção, atualizações ou alterações
              de funcionalidades a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">10. Suspensão e cessação</h2>
            <p>
              Podemos suspender ou terminar o teu acesso por: incumprimento material destes Termos, falta
              de pagamento, risco de segurança ou fraude, ou violações repetidas/graves de políticas.
              Após a cessação, poderá ser concedido um período razoável para exportar os teus dados,
              após o qual estes serão eliminados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">11. Garantias e limitação de responsabilidade</h2>
            <p>
              Na máxima extensão permitida por lei, o Serviço é fornecido "tal como está" e renunciamos
              a todas as garantias implícitas (comerciabilidade, adequação a um fim específico). A nossa
              responsabilidade agregada está limitada ao valor que pagaste nos 12 meses anteriores ao
              evento que deu origem à reclamação. Não somos responsáveis por danos indiretos, incidentais
              ou consequenciais (perda de lucros, dados ou reputação). Nada nestes Termos exclui
              responsabilidade por dolo, morte ou lesões corporais quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">12. Indemnização</h2>
            <p>
              Comprometes-te a indemnizar-nos por reclamações de terceiros decorrentes do
              teu conteúdo, do uso ilegal do Serviço ou do incumprimento destes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">13. Lei aplicável e foro</h2>
            <p>
              Estes Termos regem-se pela lei portuguesa. Qualquer litígio será submetido aos tribunais
              competentes de Portugal, sem prejuízo dos direitos imperativos do consumidor no teu país
              de residência.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">14. Alterações</h2>
            <p>
              Podemos atualizar estes Termos. Alterações materiais serão notificadas com antecedência
              razoável. O uso contínuo do Serviço após a entrada em vigor constitui aceitação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">15. Contacto</h2>
            <p>
              Para questões sobre estes Termos: <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function TermsEn() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: April 30, 2026</p>
        <div className="prose prose-invert max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Who we are</h2>
            <p>
              These Terms & Conditions govern the use of the {SELLER} service ("we", "our", the "Service"), available at promptforgepro.me. By using the Service, you are entering into an agreement with {SELLER}.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">2. Acceptance of the terms</h2>
            <p>
              By accessing or continuing to use the Service, you confirm that you have read, understood and accepted these Terms. If you do not agree, you must not use the Service. If you are accepting on behalf of an organization, you represent that you have the authority to bind it.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">3. Description of the Service</h2>
            <p>
              {SELLER} provides tools and templates ("Prompt Packs") for creating, optimizing and testing prompts for generative AI models, including AI-assisted generation, version history and a prompt library.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">4. Account and credentials</h2>
            <p>
              You are responsible for keeping your account credentials confidential and for all activity that occurs under your account. You must provide accurate information and keep it up to date.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">5. Acceptable use</h2>
            <p>You may not use the Service to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Carry out illegal, fraudulent or abusive activities (including spam);</li>
              <li>Infringe third parties' intellectual property or privacy rights;</li>
              <li>Interfere with the security of the Service (malware, probing, unauthorized scraping);</li>
              <li>Generate unlawful content, non-consensual deepfakes, hate speech or material that
                  promotes harm, child exploitation or violence;</li>
              <li>Attempt to bypass technical limitations, reverse engineer, resell or
                  redistribute the Service.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">6. AI-generated content</h2>
            <p>
              You are responsible for the prompts you submit, for how you use the results ("outputs") and for holding the rights to any input content. Outputs may be inaccurate, incomplete or out of date and must not be treated as regulated professional advice (legal, medical, financial) without qualified human review. We reserve the right to filter, refuse or remove prompts and outputs that breach these Terms, and to suspend accounts for repeated violations.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">7. Intellectual property</h2>
            <p>
              {SELLER} retains ownership of the Service, software, documentation and brand. We grant you a limited, non-exclusive, non-transferable licence to use the Service within your subscribed plan. You keep the rights to your inputs and outputs, subject to a limited licence allowing us to host and process your content solely to provide the Service to you.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">8. Payments and subscriptions</h2>
            <p>
              Our order process is conducted by our online reseller Paddle.com. Paddle.com is the
              Merchant of Record for all our orders. Paddle provides all customer service inquiries
              related to payments and handles returns.
            </p>
            <p>
              Payment, billing, taxes, automatic renewal, cancellation and refund terms are governed by the{" "}
              <a
                href="https://www.paddle.com/legal/checkout-buyer-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Paddle Buyer Terms
              </a>
              . Please also see our{" "}
              <Link to="/refunds" className="text-primary underline">Refund Policy</Link>.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">9. Service availability</h2>
            <p>
              We strive to keep the Service available, but we do not guarantee uninterrupted or error-free operation. We may carry out maintenance, updates or feature changes at any time.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">10. Suspension and termination</h2>
            <p>
              We may suspend or terminate your access for: material breach of these Terms, non-payment, security or fraud risk, or repeated/serious policy violations. After termination, you may be given a reasonable period to export your data, after which it will be deleted.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">11. Warranties and limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, the Service is provided "as is" and we disclaim all implied warranties (merchantability, fitness for a particular purpose). Our aggregate liability is limited to the amount you paid in the 12 months before the event giving rise to the claim. We are not liable for indirect, incidental or consequential damages (loss of profits, data or reputation). Nothing in these Terms excludes liability for wilful misconduct, death or personal injury where required by law.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">12. Indemnification</h2>
            <p>
              You agree to indemnify us against third-party claims arising from your content, unlawful use of the Service or breach of these Terms.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">13. Governing law and jurisdiction</h2>
            <p>
              These Terms are governed by Portuguese law. Any dispute will be submitted to the competent courts of Portugal, without prejudice to the mandatory consumer rights of your country of residence.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">14. Changes</h2>
            <p>
              We may update these Terms. Material changes will be notified with reasonable advance notice. Continued use of the Service after they take effect constitutes acceptance.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">15. Contact</h2>
            <p>
              For questions about these Terms: <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function Terms() {
  const isEnglish = useIsEnglish();
  return isEnglish ? <TermsEn /> : <TermsPt />;
}
