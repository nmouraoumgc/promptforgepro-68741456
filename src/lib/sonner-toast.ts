import { toast as sonnerToast, type ExternalToast } from 'sonner';
import { toastDuration } from './toast-policy';

type Kind = 'message' | 'success' | 'info' | 'warning' | 'error';
type Title = Parameters<typeof sonnerToast>[0];
const timers = new Map<string | number, ReturnType<typeof setTimeout>>();
const clear = (id: string | number) => {
  clearTimeout(timers.get(id));
  timers.delete(id);
};

function notify(kind: Kind, title: Title, options?: ExternalToast) {
  const duration = toastDuration(kind);
  const id = sonnerToast[kind](title, {
    ...options,
    duration,
    closeButton: true,
    onDismiss: t => { clear(t.id); options?.onDismiss?.(t); },
    onAutoClose: t => { clear(t.id); options?.onAutoClose?.(t); },
  });
  clear(id);
  // Global deadline also applies while a library timer is paused by focus/hover.
  timers.set(id, setTimeout(() => { clear(id); sonnerToast.dismiss(id); }, duration));
  return id;
}

export const toast = Object.assign(
  (title: Title, options?: ExternalToast) => notify('message', title, options),
  {
    message: (title: Title, options?: ExternalToast) => notify('message', title, options),
    success: (title: Title, options?: ExternalToast) => notify('success', title, options),
    info: (title: Title, options?: ExternalToast) => notify('info', title, options),
    warning: (title: Title, options?: ExternalToast) => notify('warning', title, options),
    error: (title: Title, options?: ExternalToast) => notify('error', title, options),
    dismiss: (id?: string | number) => {
      if (id === undefined) for (const key of timers.keys()) clear(key);
      else clear(id);
      return sonnerToast.dismiss(id);
    },
  },
);
