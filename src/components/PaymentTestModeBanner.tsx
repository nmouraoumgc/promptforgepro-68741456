import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;

  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
      Pagamentos no preview estão em modo de teste.{" "}
      <a
        href="https://developer.paddle.com/concepts/platform/sandbox"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Saber mais
      </a>
    </div>
  );
}
