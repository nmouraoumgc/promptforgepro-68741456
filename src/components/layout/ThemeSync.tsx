import { useEffect } from 'react';
import { usePromptStore } from '@/stores/promptStore';

/** Applies the theme on every route (app, landing, pricing, auth, legal, 404).
 *  index.html sets the class before first paint, so this only keeps it in sync with later changes. */
export function ThemeSync() {
  const darkMode = usePromptStore((s) => s.darkMode);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', !!darkMode);
    root.style.colorScheme = darkMode ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', darkMode ? '#0f121a' : '#f5f6f8');
  }, [darkMode]);
  return null;
}
