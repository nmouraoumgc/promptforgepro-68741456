export const TOAST_DURATION = 4_000;
export const ERROR_TOAST_DURATION = 6_000;

export function toastDuration(kind?: string) {
  return kind === 'destructive' || kind === 'error' ? ERROR_TOAST_DURATION : TOAST_DURATION;
}
