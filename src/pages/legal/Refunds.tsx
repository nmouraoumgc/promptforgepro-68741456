import { Link } from "react-router-dom";
import { useIsEnglish } from "@/i18n/lang";

const SELLER = "Prompt Forge Pro";
const SUPPORT_EMAIL = "geral@promptforgepro.me";

function RefundsPt() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">Política de Reembolsos</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 19 de novembro de 2026</p>

        <div className="space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-2">Garantia de 30 dias</h2>
            <p>
              {SELLER} oferece uma garantia de devolução do dinheiro de <strong>30 dias</strong>. Se não
              estiveres satisfeito com a tua compra, podes pedir reembolso integral no prazo de 30 dias a
              contar da data da encomenda.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Como pedir reembolso</h2>
            <p>
              Para solicitar um reembolso, envia um email para{" "}
              <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
              com o email utilizado na compra, a data da encomenda e, se disponível, o número da encomenda.
              Confirmaremos a receção do pedido e indicaremos os passos seguintes.
            </p>
            <p className="mt-2">
              Para compras anteriormente processadas pela Paddle, o reembolso poderá ter de ser
              concluído por essa entidade, enquanto comerciante registado da transação original.
              Podes também consultar{" "}
              <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-primary underline">paddle.net</a>{" "}
              para obter apoio relativo a essas compras. Ajudaremos a encaminhar o pedido, sem garantir
              acesso direto ao processamento de pagamentos efetuados por terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Subscrições</h2>
            <p>
              Podes cancelar a tua subscrição a qualquer momento através do portal de cliente. O
              cancelamento entra em vigor no fim do período de faturação atual e manténs o acesso até
              essa data. Não emitimos reembolsos parciais por períodos já faturados, com a ressalva da
              garantia de 30 dias acima referida.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Processamento</h2>
            <p>
              Após aprovação, o reembolso será efetuado, sempre que possível, através do método de
              pagamento original, pela entidade responsável pela transação. O prazo para o crédito
              depende do processador de pagamentos e da instituição financeira. Informaremos o cliente
              sobre o estado do pedido e eventuais passos adicionais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Contacto</h2>
            <p>
              Dúvidas sobre reembolsos:{" "}
              <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function RefundsEn() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: November 19, 2026</p>
        <div className="space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-2">30-day guarantee</h2>
            <p>
              {SELLER} offers a <strong>30-day</strong> money-back guarantee. If you are not satisfied with your purchase, you can request a full refund within 30 days of the order date.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">How to request a refund</h2>
            <p>
              To request a refund, email{" "}
              <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
              with the email address used for the purchase, the order date and, if available, the order number.
              We will acknowledge your request and explain the next steps.
            </p>
            <p className="mt-2">
              For purchases previously processed by Paddle, refunds may need to be completed by Paddle
              as the merchant of record for the original transaction. You can also visit{" "}
              <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-primary underline">paddle.net</a>{" "}
              for support with those purchases. We will help direct your request but cannot guarantee
              direct access to refunds for payments handled by third parties.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">Subscriptions</h2>
            <p>
              You can cancel your subscription at any time through the customer portal. Cancellation takes effect at the end of the current billing period and you keep access until then. We do not issue partial refunds for periods already billed, except under the 30-day guarantee above.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">Processing</h2>
            <p>
              Once approved, refunds will be issued to the original payment method where possible
              by the entity responsible for the transaction. The time taken for funds to appear
              depends on the payment processor and financial institution. We will provide updates
              on your request and any additional steps required.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">Contact</h2>
            <p>
              Questions about refunds:{" "}<a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function Refunds() {
  const isEnglish = useIsEnglish();
  return isEnglish ? <RefundsEn /> : <RefundsPt />;
}
