import { Link } from "react-router-dom";

const SELLER = "Prompt Forge Pro";
const SUPPORT_EMAIL = "support@promptforgepro.me";

export default function Terms() {
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
              Ao aceder ou continuar a usar o Serviço, confirma que leu, compreendeu e aceitou estes Termos.
              Se não concordar, não deve utilizar o Serviço. Se está a aceitar em nome de uma organização,
              declara ter autoridade para a vincular.
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
              É responsável por manter a confidencialidade das credenciais da sua conta e por toda a
              atividade que ocorra na mesma. Deve fornecer informação precisa e mantê-la atualizada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Uso aceitável</h2>
            <p>Não pode utilizar o Serviço para:</p>
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
              É responsável pelos prompts que submete, pelo uso que faz dos resultados ("outputs") e por
              ter os direitos sobre qualquer conteúdo de input. Os outputs podem ser imprecisos,
              incompletos ou desatualizados — não devem ser considerados aconselhamento profissional
              regulado (legal, médico, financeiro) sem revisão humana qualificada. Reservamo-nos o
              direito de filtrar, recusar ou remover prompts e outputs que violem estes Termos, bem
              como de suspender contas em caso de infrações repetidas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Propriedade intelectual</h2>
            <p>
              {SELLER} mantém a propriedade do Serviço, do software, da documentação e da marca.
              Concedemos-lhe uma licença limitada, não exclusiva e não transferível para usar o Serviço
              dentro do plano contratado. Mantém os direitos sobre os seus inputs e outputs, sujeito a
              uma licença limitada para que possamos alojar e processar o seu conteúdo apenas para lhe
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
              . Consulte ainda a nossa{" "}
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
              Podemos suspender ou terminar o seu acesso por: incumprimento material destes Termos, falta
              de pagamento, risco de segurança ou fraude, ou violações repetidas/graves de políticas.
              Após a cessação, poderá ser concedido um período razoável para exportar os seus dados,
              após o qual estes serão eliminados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">11. Garantias e limitação de responsabilidade</h2>
            <p>
              Na máxima extensão permitida por lei, o Serviço é fornecido "tal como está" e renunciamos
              a todas as garantias implícitas (comerciabilidade, adequação a um fim específico). A nossa
              responsabilidade agregada está limitada ao valor pago por si nos 12 meses anteriores ao
              evento que deu origem à reclamação. Não somos responsáveis por danos indiretos, incidentais
              ou consequenciais (perda de lucros, dados ou reputação). Nada nestes Termos exclui
              responsabilidade por dolo, morte ou lesões corporais quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">12. Indemnização</h2>
            <p>
              O utilizador compromete-se a indemnizar-nos por reclamações de terceiros decorrentes do
              seu conteúdo, do uso ilegal do Serviço ou do incumprimento destes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">13. Lei aplicável e foro</h2>
            <p>
              Estes Termos regem-se pela lei portuguesa. Qualquer litígio será submetido aos tribunais
              competentes de Portugal, sem prejuízo dos direitos imperativos do consumidor no seu país
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
