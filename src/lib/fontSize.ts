// Text size preference (A / A+ / A++), stored in localStorage and applied as <html data-fs>.
// The inline script in index.html applies it before first paint; CSS in index.css maps it to the root font-size,
// so every rem-based Tailwind size scales with it.
export type FontSize = 'normal' | 'large' | 'xlarge';
export const FONT_SIZES: FontSize[] = ['normal', 'large', 'xlarge'];
const KEY = 'pf_font_size';
const EVENT = 'pf-font-size';

export function getFontSize(): FontSize {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'large' || v === 'xlarge') return v;
  } catch {
    // ignore storage errors
  }
  return 'normal';
}

export function applyFontSize(size: FontSize) {
  const r = document.documentElement;
  if (size === 'normal') r.removeAttribute('data-fs');
  else r.setAttribute('data-fs', size);
}

export function setFontSize(size: FontSize) {
  try {
    if (size === 'normal') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, size);
  } catch {
    // ignore storage errors
  }
  applyFontSize(size);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: size }));
}

export function subscribeFontSize(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      applyFontSize(getFontSize());
      cb();
    }
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}
