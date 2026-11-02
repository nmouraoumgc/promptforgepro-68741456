import { Link } from "react-router-dom";
import { useIsEnglish } from "@/i18n/lang";

const SELLER = "Prompt Forge Pro";
const SUPPORT_EMAIL = "support@promptforgepro.me";

function RefundsPt() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">Política de Reembolsos</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 30 de abril de 2026</p>

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
              Os reembolsos são processados pelo nosso parceiro de pagamentos, a <strong>Paddle</strong>,
              que é o Merchant of Record das nossas vendas. Para pedir um reembolso:
            </p>
            <ol className="list-decimal pl-6 space-y-1 mt-2">
              <li>
                Acede a{" "}
                <a
                  href="https://paddle.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  paddle.net
                </a>{" "}
                e introduz o email usado na compra para gerir a tua encomenda; ou
              </li>
              <li>
                Contacta-nos por email em{" "}
                <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
                com o teu número de encomenda e indicaremos os próximos passos.
              </li>
            </ol>
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
              Após aprovação, o reembolso é creditado no método de pagamento original. O tempo de
              processamento depende da Paddle e da tua instituição financeira (tipicamente 5–10 dias úteis).
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
        <p className="text-sm text-muted-foreground mb-8">Last updated: April 30, 2026</p>
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
              Refunds are processed by our payment partner, <strong>Paddle</strong>, which is the Merchant of Record for our sales. To request a refund:
            </p>
            <ol className="list-decimal pl-6 space-y-1 mt-2">
              <li>
                Go to{" "}
                <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-primary underline">paddle.net</a>{" "}
                and enter the email used for the purchase to manage your order; or
              </li>
              <li>
                Email us at{" "}<a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
                with your order number and we will tell you the next steps.
              </li>
            </ol>
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
              Once approved, the refund is credited to the original payment method. Processing time depends on Paddle and your financial institution (typically 5–10 business days).
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
