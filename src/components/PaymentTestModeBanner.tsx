import { getPaddleEnvironment } from "@/lib/paddle";
import { useIsEnglish } from '@/i18n/lang';

export function PaymentTestModeBanner() {
  const isEnglish = useIsEnglish();
  if (getPaddleEnvironment() !== "sandbox") return null;

  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
      {isEnglish ? 'Payments in this preview are in test mode.' : 'Os pagamentos nesta pré-visualização estão em modo de teste.'}{" "}
      <a
        href="https://developer.paddle.com/concepts/platform/sandbox"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        {isEnglish ? 'Learn more' : 'Saber mais'}
      </a>
    </div>
  );
}
