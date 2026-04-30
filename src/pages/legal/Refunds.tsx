import { Link } from "react-router-dom";

const SELLER = "Prompt Forge Pro";
const SUPPORT_EMAIL = "support@promptforgepro.me";

export default function Refunds() {
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
              estiver satisfeito com a sua compra, pode pedir reembolso integral no prazo de 30 dias a
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
                Aceda a{" "}
                <a
                  href="https://paddle.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  paddle.net
                </a>{" "}
                e introduza o email usado na compra para gerir a sua encomenda; ou
              </li>
              <li>
                Contacte-nos por email em{" "}
                <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
                com o seu número de encomenda e indicaremos os próximos passos.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Subscrições</h2>
            <p>
              Pode cancelar a sua subscrição a qualquer momento através do portal de cliente. O
              cancelamento entra em vigor no fim do período de faturação atual e mantém o acesso até
              essa data. Não emitimos reembolsos parciais por períodos já faturados, com a ressalva da
              garantia de 30 dias acima referida.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Processamento</h2>
            <p>
              Após aprovação, o reembolso é creditado no método de pagamento original. O tempo de
              processamento depende da Paddle e da sua instituição financeira (tipicamente 5–10 dias úteis).
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
