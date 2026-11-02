// The PromptForge Pro wordmark: "Prompt" in the foreground colour, "Forge" in orange and "Pro" as a small
// orange badge. One component so the header, sidebar, landing and auth pages always match.
import { cn } from '@/lib/utils';

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap font-bold', className)}>
      Prompt<span className="text-primary">Forge</span>
      <span className="ml-1 rounded bg-primary px-1 py-px text-[0.6em] font-semibold uppercase leading-tight tracking-wide text-primary-foreground">Pro</span>
    </span>
  );
}
